import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  Calendar,
  Camera,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  MapPin,
  Navigation,
  Package,
  PlayCircle,
  Target,
  Trash2,
  Truck,
  Zap
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { db, storage } from "../../../services/firebaseConfig";

type EventDoc = {
  id: string;
  title: string;
  description?: string;
  eventAt?: Timestamp;
  location?: { label?: string; lat?: number; lng?: number };
  wasteTypes?: string[];
  estimatedQuantity?: string;
  priority?: string;
  status?: "Pending" | "In-progress" | "Completed";
  assignedTo?: string;
  proofUrl?: string;
  completedAt?: Timestamp;
  collectedWeights?: Record<string, string>;
};

function tsToDate(ts?: Timestamp) {
  try {
    if (!ts) return null;
    // @ts-ignore
    if (typeof ts.toDate === "function") return ts.toDate();
  } catch {}
  return null;
}

function formatDate(d?: Date | null) {
  if (!d) return undefined;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(d?: Date | null) {
  if (!d) return undefined;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// Enhanced StatusBadge with better colors and icons
function StatusBadge({ status }: { status: EventDoc["status"] }) {
  if (!status) return null;
  let bgColor = "", textColor = "", icon = null;
  switch (status) {
    case "Pending": 
      bgColor = "bg-amber-100"; 
      textColor = "text-amber-800"; 
      icon = <Clock size={12} color="#92400e" />;
      break;
    case "In-progress": 
      bgColor = "bg-blue-100"; 
      textColor = "text-blue-800"; 
      icon = <PlayCircle size={12} color="#1e40af" />;
      break;
    case "Completed": 
      bgColor = "bg-emerald-100"; 
      textColor = "text-emerald-800"; 
      icon = <CheckCircle2 size={12} color="#065f46" />;
      break;
  }
  return (
    <View className={`px-3 py-1.5 rounded-full ${bgColor} flex-row items-center`}>
      {icon}
      <Text className={`text-xs font-semibold ${textColor} ml-1`}>{status}</Text>
    </View>
  );
}

export default function WcHome({ userId }: { userId: string }) {
  const params = useLocalSearchParams();
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EventDoc | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'upcoming' | 'completed'>(
    (params.tab as string) === 'upcoming' ? 'upcoming' : 
    (params.tab as string) === 'completed' ? 'completed' : 'available'
  );
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [collectedWeights, setCollectedWeights] = useState<Record<string, string>>({});

  // 🔹 Handle tab parameter changes
  useEffect(() => {
    if (params.tab === 'upcoming') {
      setActiveTab('upcoming');
    } else if (params.tab === 'available') {
      setActiveTab('available');
    } else if (params.tab === 'completed') {
      setActiveTab('completed');
    }
  }, [params.tab]);

  // 🔹 Fetch assigned events
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const all: EventDoc[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((ev) => ev.assignedTo === userId);
        setEvents(all);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [userId]);

  // 🔹 Group by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const availableCleanups = events.filter((ev) => {
    const date = tsToDate(ev.eventAt);
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d <= today && ev.status !== "Completed"; // past or today but not completed
  });

  const upcomingCleanups = events.filter((ev) => {
    const date = tsToDate(ev.eventAt);
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d > today; // future
  });

  const completedCleanups = events.filter((ev) => {
    return ev.status === "Completed";
  });

  // 🔹 Handle photo upload + location
  async function handleTakePhoto(ev: EventDoc) {
    try {
      setUploading(true);
      const img = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (img.canceled) return;

      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission required", "Location permission is needed.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const blob = await fetch(img.assets[0].uri).then((r) => r.blob());
      const storageRef = ref(storage, `proofs/${ev.id}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      setPhotos([...photos, url]);
      await updateDoc(doc(db, "events", ev.id), {
        proofUrl: url,
        geo: { lat: loc.coords.latitude, lng: loc.coords.longitude },
      });

      setCurrentStep(3);
      Alert.alert("Photo Uploaded", "Disposal proof added successfully ✅");
    } catch (e: any) {
      Alert.alert("Error", String(e));
    } finally {
      setUploading(false);
    }
  }

  // 🔹 Handle completion form submission
  async function handleComplete(ev: EventDoc) {
    try {
      setUploading(true);
      await updateDoc(doc(db, "events", ev.id), {
        status: "Completed",
        completedAt: serverTimestamp(),
        collectedWeights: collectedWeights,
      });
      Alert.alert("Success", "Assignment marked completed ✅");
      setSelected(null);
      setCurrentStep(0);
      setPhotos([]);
      setShowCompletionForm(false);
      setCollectedWeights({});
      setActiveTab('completed');
    } catch (error) {
      Alert.alert("Error", "Failed to complete assignment");
    } finally {
      setUploading(false);
    }
  }

  // 🔹 Handle completion button click
  function handleCompleteClick() {
    setShowCompletionForm(true);
  }

  const steps = [
    { title: "Collect Waste", icon: Truck, description: "Navigate to location and collect waste materials" },
    { title: "Take Disposal Photos", icon: Camera, description: "Capture proof of proper disposal" },
    { title: "Confirm Completion", icon: CheckCircle, description: "Mark assignment as completed" },
  ];

  return (
    <View className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50">
      {!selected ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
          {/* Tabs */}
          <View className="bg-white rounded-2xl p-2 mb-6 shadow-sm flex-row">
            <TouchableOpacity
              onPress={() => setActiveTab('available')}
              className={`flex-1 py-3 px-3 rounded-xl items-center ${
                activeTab === 'available' 
                  ? 'bg-blue-500 shadow-sm' 
                  : 'bg-transparent'
              }`}
            >
              <Text className={`font-semibold text-xs ${
                activeTab === 'available' 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                Available
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('upcoming')}
              className={`flex-1 py-3 px-3 rounded-xl items-center ${
                activeTab === 'upcoming' 
                  ? 'bg-blue-500 shadow-sm' 
                  : 'bg-transparent'
              }`}
            >
              <Text className={`font-semibold text-xs ${
                activeTab === 'upcoming' 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                Upcoming
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('completed')}
              className={`flex-1 py-3 px-3 rounded-xl items-center ${
                activeTab === 'completed' 
                  ? 'bg-green-500 shadow-sm' 
                  : 'bg-transparent'
              }`}
            >
              <Text className={`font-semibold text-xs ${
                activeTab === 'completed' 
                  ? 'text-white' 
                  : 'text-gray-600'
              }`}>
                Completed
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="py-10 items-center">
              <View className="bg-white p-6 rounded-2xl shadow-sm">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="text-gray-600 mt-3 font-medium">Loading assignments...</Text>
              </View>
            </View>
          ) : (
            <>
              {/* Available Assignments Tab */}
              {activeTab === 'available' && (
                <>
                  {availableCleanups.length > 0 ? (
                    <View className="mb-8">
                      <View className="flex-row items-center mb-4">
                        <View className="bg-emerald-100 p-2 rounded-lg mr-3">
                          <Trash2 size={20} color="#059669" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900">Available Assignments</Text>
                      </View>
                      {availableCleanups.map((ev) => {
                        const d = tsToDate(ev.eventAt);
                        const dateStr = d ? `${formatDate(d)} • ${formatTime(d)}` : "No date";
                        return (
                          <TouchableOpacity
                            key={ev.id}
                            className="mb-4 bg-white rounded-2xl p-5 shadow-sm border-l-4 border-blue-400"
                            onPress={() => {
                              setSelected(ev);
                              setCurrentStep(0);
                              setPhotos([]);
                            }}
                          >
                            <View className="flex-row items-start justify-between mb-3">
                              <View className="flex-1">
                                <Text className="text-lg font-bold text-gray-900 mb-1">
                                  {ev.title}
                                </Text>
                                <View className="flex-row items-center mb-2">
                                  <Clock size={14} color="#6b7280" />
                                  <Text className="text-gray-600 ml-2 text-sm">{dateStr}</Text>
                                </View>
                                {!!ev.location?.label && (
                                  <View className="flex-row items-center">
                                    <MapPin size={14} color="#6b7280" />
                                    <Text className="text-gray-700 ml-2 text-sm">{ev.location.label}</Text>
                                  </View>
                                )}
                              </View>
                              <View className="bg-blue-50 p-2 rounded-lg">
                                <Truck size={20} color="#2563eb" />
                              </View>
                            </View>
                            {ev.wasteTypes && ev.wasteTypes.length > 0 && (
                              <View className="flex-row flex-wrap">
                                {ev.wasteTypes.slice(0, 3).map((type, idx) => (
                                  <View key={idx} className="bg-gray-100 px-3 py-1 rounded-full mr-2 mb-1">
                                    <Text className="text-gray-700 text-xs">{type}</Text>
                                  </View>
                                ))}
                                {ev.wasteTypes.length > 3 && (
                                  <View className="bg-gray-100 px-3 py-1 rounded-full">
                                    <Text className="text-gray-700 text-xs">+{ev.wasteTypes.length - 3} more</Text>
                                  </View>
                                )}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <View className="bg-white rounded-2xl p-8 items-center mb-6">
                      <View className="bg-gray-100 p-4 rounded-full mb-4">
                        <CheckCircle size={32} color="#6b7280" />
                      </View>
                      <Text className="text-gray-600 text-center font-medium mb-2">
                        No available assignments
                      </Text>
                      <Text className="text-gray-500 text-center text-sm">
                        All caught up! Check back for new assignments.
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Upcoming Assignments Tab */}
              {activeTab === 'upcoming' && (
                <>
                  {upcomingCleanups.length > 0 ? (
                    <View className="mb-8">
                      <View className="flex-row items-center mb-4">
                        <View className="bg-amber-100 p-2 rounded-lg mr-3">
                          <Calendar size={20} color="#d97706" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900">Upcoming Assignments</Text>
                      </View>
                      {upcomingCleanups.map((ev) => {
                        const d = tsToDate(ev.eventAt);
                        const dateStr = d ? `${formatDate(d)} • ${formatTime(d)}` : "No date";
                        return (
                          <View
                            key={ev.id}
                            className="mb-4 bg-white rounded-2xl p-5 shadow-sm border-l-4 border-amber-400"
                          >
                            <View className="flex-row items-start justify-between">
                              <View className="flex-1">
                                <Text className="text-lg font-bold text-gray-900 mb-2">
                                  {ev.title}
                                </Text>
                                <View className="flex-row items-center mb-2">
                                  <Clock size={14} color="#6b7280" />
                                  <Text className="text-gray-600 ml-2 text-sm">{dateStr}</Text>
                                </View>
                                {!!ev.location?.label && (
                                  <View className="flex-row items-center mb-2">
                                    <MapPin size={14} color="#6b7280" />
                                    <Text className="text-gray-700 ml-2 text-sm">{ev.location.label}</Text>
                                  </View>
                                )}
                                {ev.wasteTypes && ev.wasteTypes.length > 0 && (
                                  <View className="flex-row flex-wrap">
                                    {ev.wasteTypes.slice(0, 3).map((type, idx) => (
                                      <View key={idx} className="bg-gray-100 px-3 py-1 rounded-full mr-2 mb-1">
                                        <Text className="text-gray-700 text-xs">{type}</Text>
                                      </View>
                                    ))}
                                    {ev.wasteTypes.length > 3 && (
                                      <View className="bg-gray-100 px-3 py-1 rounded-full">
                                        <Text className="text-gray-700 text-xs">+{ev.wasteTypes.length - 3} more</Text>
                                      </View>
                                    )}
                                  </View>
                                )}
                              </View>
                              <View className="bg-amber-50 p-2 rounded-lg">
                                <Target size={20} color="#d97706" />
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View className="bg-white rounded-2xl p-8 items-center">
                      <View className="bg-gray-100 p-4 rounded-full mb-4">
                        <Calendar size={32} color="#6b7280" />
                      </View>
                      <Text className="text-gray-600 text-center font-medium mb-2">
                        No upcoming assignments
                      </Text>
                      <Text className="text-gray-500 text-center text-sm">
                        New assignments will appear here when available.
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Completed Assignments Tab */}
              {activeTab === 'completed' && (
                <>
                  {completedCleanups.length > 0 ? (
                    <View className="mb-8">
                      <View className="flex-row items-center mb-4">
                        <View className="bg-green-100 p-2 rounded-lg mr-3">
                          <CheckCircle size={20} color="#059669" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900">Completed Assignments</Text>
                      </View>
                      {completedCleanups.map((ev) => {
                        const d = tsToDate(ev.eventAt);
                        const completedDate = ev.completedAt ? tsToDate(ev.completedAt) : null;
                        const dateStr = d ? `${formatDate(d)} • ${formatTime(d)}` : "No date";
                        const completedStr = completedDate ? `Completed: ${formatDate(completedDate)}` : "Completed";
                        return (
                          <View
                            key={ev.id}
                            className="mb-4 bg-white rounded-2xl p-5 shadow-sm border-l-4 border-green-400"
                          >
                            <View className="flex-row items-start justify-between mb-3">
                              <View className="flex-1">
                                <Text className="text-lg font-bold text-gray-900 mb-2">
                                  {ev.title}
                                </Text>
                                <View className="flex-row items-center mb-2">
                                  <Clock size={14} color="#6b7280" />
                                  <Text className="text-gray-600 ml-2 text-sm">{dateStr}</Text>
                                </View>
                                <View className="flex-row items-center mb-2">
                                  <CheckCircle size={14} color="#059669" />
                                  <Text className="text-green-600 ml-2 text-sm font-medium">{completedStr}</Text>
                                </View>
                                {!!ev.location?.label && (
                                  <View className="flex-row items-center mb-2">
                                    <MapPin size={14} color="#6b7280" />
                                    <Text className="text-gray-700 ml-2 text-sm">{ev.location.label}</Text>
                                  </View>
                                )}
                                {ev.wasteTypes && ev.wasteTypes.length > 0 && (
                                  <View className="flex-row flex-wrap mb-2">
                                    {ev.wasteTypes.slice(0, 3).map((type, idx) => (
                                      <View key={idx} className="bg-gray-100 px-3 py-1 rounded-full mr-2 mb-1">
                                        <Text className="text-gray-700 text-xs">{type}</Text>
                                      </View>
                                    ))}
                                    {ev.wasteTypes.length > 3 && (
                                      <View className="bg-gray-100 px-3 py-1 rounded-full">
                                        <Text className="text-gray-700 text-xs">+{ev.wasteTypes.length - 3} more</Text>
                                      </View>
                                    )}
                                  </View>
                                )}
                                {ev.collectedWeights && Object.keys(ev.collectedWeights).length > 0 && (
                                  <View className="bg-green-50 p-3 rounded-lg">
                                    <Text className="text-green-800 font-semibold text-sm mb-1">Collected Weights:</Text>
                                    {Object.entries(ev.collectedWeights)
                                      .filter(([type, weight]) => weight && weight.trim() !== '')
                                      .map(([type, weight]) => (
                                        <Text key={type} className="text-green-700 text-xs">
                                          {type}: {weight} kg
                                        </Text>
                                      ))}
                                  </View>
                                )}
                              </View>
                              <View className="bg-green-50 p-2 rounded-lg">
                                <CheckCircle size={20} color="#059669" />
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View className="bg-white rounded-2xl p-8 items-center">
                      <View className="bg-gray-100 p-4 rounded-full mb-4">
                        <CheckCircle size={32} color="#6b7280" />
                      </View>
                      <Text className="text-gray-600 text-center font-medium mb-2">
                        No completed assignments
                      </Text>
                      <Text className="text-gray-500 text-center text-sm">
                        Completed assignments will appear here.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      ) : (
        // 🔹 Assignment Detail View (Steps)
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View className="flex-row items-center mb-6">
            <TouchableOpacity 
              onPress={() => setSelected(null)} 
              className="bg-white p-2 rounded-xl shadow-sm mr-4"
            >
              <ChevronLeft color="#2563eb" size={24} />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900">
                Assignment Details
              </Text>
              <Text className="text-gray-600 text-sm">
                Follow the steps to complete your task
              </Text>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm border-l-4 border-blue-400">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900 mb-2">
                  {selected.title}
                </Text>
                <View className="flex-row items-center mb-2">
                  <View className="bg-blue-100 p-1.5 rounded-lg mr-3">
                    <MapPin size={16} color="#2563eb" />
                  </View>
                  <Text className="text-gray-700 font-medium">{selected.location?.label}</Text>
                </View>
                <View className="flex-row items-center mb-2">
                  <View className="bg-amber-100 p-1.5 rounded-lg mr-3">
                    <Calendar size={16} color="#d97706" />
                  </View>
                  <Text className="text-gray-700">
                    {formatDate(tsToDate(selected.eventAt))} •{" "}
                    {formatTime(tsToDate(selected.eventAt))}
                  </Text>
                </View>
                {!!selected.wasteTypes && (
                  <View className="flex-row items-center">
                    <View className="bg-emerald-100 p-1.5 rounded-lg mr-3">
                      <Package size={16} color="#059669" />
                    </View>
                    <Text className="text-gray-700">
                      {selected.wasteTypes.join(", ")} •{" "}
                      {selected.estimatedQuantity || "N/A"}
                    </Text>
                  </View>
                )}
              </View>
              <View className="bg-blue-50 p-3 rounded-xl">
                <Truck size={24} color="#2563eb" />
              </View>
            </View>
          </View>

          {/* Navigate to Location Button */}
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <View className="bg-green-100 p-2 rounded-lg mr-3">
                <Navigation size={20} color="#059669" />
              </View>
              <Text className="text-lg font-bold text-gray-900">Navigation</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                const destLabel = selected?.location?.label || "";
                const lat = selected?.location?.lat;
                const lng = selected?.location?.lng;
                const params: Record<string, string> = {};
                if (destLabel) params.destLabel = destLabel;
                if (typeof lat === "number") params.destLat = String(lat);
                if (typeof lng === "number") params.destLng = String(lng);
                if (selected?.id) params.eventId = selected.id;
                router.navigate({
                  pathname: "/waste_collector/tabs/wc_route_navigation",
                  params,
                });
              }}
              className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-xl flex-row items-center justify-center shadow-lg"
            >
              <Navigation size={20} color="white" />
              <Text className="text-white text-center font-semibold ml-2">
                Navigate to Location
              </Text>
            </TouchableOpacity>
          </View>

          {/* Steps */}
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
            <View className="flex-row items-center mb-6">
              <View className="bg-purple-100 p-2 rounded-lg mr-3">
                <Zap size={20} color="#7c3aed" />
              </View>
              <Text className="text-lg font-bold text-gray-900">Collection Progress</Text>
            </View>
            {steps.map((step, index) => (
              <View key={index} className="mb-6">
                <View className="flex-row items-start">
                  <View
                    className={`w-12 h-12 rounded-full items-center justify-center mr-4 shadow-sm ${
                      index < currentStep 
                        ? "bg-emerald-500" 
                        : index === currentStep 
                        ? "bg-blue-500" 
                        : "bg-gray-200"
                    }`}
                  >
                    <step.icon
                      color={index <= currentStep ? "white" : "#6b7280"}
                      size={22}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-lg font-bold mb-1 ${
                        index < currentStep 
                          ? "text-emerald-600" 
                          : index === currentStep 
                          ? "text-blue-600" 
                          : "text-gray-600"
                      }`}
                    >
                      {step.title}
                    </Text>
                    <Text className="text-gray-600 text-sm mb-2">
                      {step.description}
                    </Text>
                    <View className={`px-3 py-1 rounded-full self-start ${
                      index < currentStep 
                        ? "bg-emerald-100" 
                        : index === currentStep 
                        ? "bg-blue-100" 
                        : "bg-gray-100"
                    }`}>
                      <Text className={`text-xs font-semibold ${
                        index < currentStep 
                          ? "text-emerald-700" 
                          : index === currentStep 
                          ? "text-blue-700" 
                          : "text-gray-500"
                      }`}>
                        {index < currentStep
                          ? "✓ COMPLETED"
                          : index === currentStep
                          ? "● IN PROGRESS"
                          : "○ PENDING"}
                      </Text>
                    </View>
                  </View>
                </View>
                {index === currentStep && (
                  <View className="mt-4 ml-16">
                    <TouchableOpacity
                      disabled={uploading}
                      onPress={async () => {
                        if (index === 0) setCurrentStep(1);
                        else if (index === 1) await handleTakePhoto(selected);
                        else if (index === 2) handleCompleteClick();
                      }}
                      className={`px-6 py-3 rounded-xl flex-row items-center justify-center shadow-lg ${
                        index === 0 
                          ? "bg-emerald-600" 
                          : index === 1 
                          ? "bg-blue-600" 
                          : "bg-green-600"
                      }`}
                    >
                      {uploading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <>
                          {index === 0 && <Truck size={18} color="white" />}
                          {index === 1 && <Camera size={18} color="white" />}
                          {index === 2 && <CheckCircle size={18} color="white" />}
                          <Text className="text-white font-semibold ml-2">
                            {index === 0
                              ? "Mark Collected"
                              : index === 1
                              ? "Take Photo"
                              : "Complete"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                    
                    {/* Skip button for Take Disposal Photos step */}
                    {index === 1 && (
                      <TouchableOpacity
                        onPress={() => {
                          setCurrentStep(2);
                          Alert.alert("Skipped", "Photo step skipped. You can still take photos later if needed.");
                        }}
                        className="mt-3 px-6 py-3 rounded-xl flex-row items-center justify-center border-2 border-gray-300 bg-white"
                      >
                        <Text className="text-gray-600 font-semibold">
                          Skip Photo
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {index < steps.length - 1 && (
                  <View className="ml-6 mt-2 mb-2">
                    <View className="w-0.5 h-6 bg-gray-200"></View>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Photos */}
          {photos.length > 0 && (
            <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
              <View className="flex-row items-center mb-4">
                <View className="bg-green-100 p-2 rounded-lg mr-3">
                  <Camera size={20} color="#059669" />
                </View>
                <Text className="text-lg font-bold text-gray-900">Disposal Photos</Text>
              </View>
              <View className="space-y-3">
                {photos.map((p, i) => (
                  <View key={i} className="relative">
                    <Image 
                      source={{ uri: p }} 
                      className="w-full h-48 rounded-xl shadow-sm" 
                      resizeMode="cover"
                    />
                    <View className="absolute top-2 right-2 bg-black bg-opacity-50 px-2 py-1 rounded">
                      <Text className="text-white text-xs font-semibold">
                        Photo {i + 1}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Completion Form */}
          {showCompletionForm && (
            <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm border-l-4 border-green-400">
              <View className="flex-row items-center mb-6">
                <View className="bg-green-100 p-2 rounded-lg mr-3">
                  <CheckCircle size={20} color="#059669" />
                </View>
                <Text className="text-lg font-bold text-gray-900">Complete Assignment</Text>
              </View>
              
              <Text className="text-gray-600 mb-4">
                Please enter the actual weight collected for each waste type (in kg):
              </Text>

              <View className="space-y-4">
                {selected?.wasteTypes && selected.wasteTypes.length > 0 ? (
                  selected.wasteTypes.map((wasteType, index) => (
                    <View key={index}>
                      <Text className="text-gray-700 font-semibold mb-2">{wasteType} (kg)</Text>
                      <TextInput
                        value={collectedWeights[wasteType] || ''}
                        onChangeText={(text) => setCollectedWeights(prev => ({ ...prev, [wasteType]: text }))}
                        placeholder="Enter weight in kg"
                        keyboardType="numeric"
                        className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50"
                      />
                    </View>
                  ))
                ) : (
                  <View>
                    <Text className="text-gray-700 font-semibold mb-2">Other Waste (kg)</Text>
                    <TextInput
                      value={collectedWeights['Other'] || ''}
                      onChangeText={(text) => setCollectedWeights(prev => ({ ...prev, 'Other': text }))}
                      placeholder="Enter weight in kg"
                      keyboardType="numeric"
                      className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50"
                    />
                  </View>
                )}
              </View>

              {/* Form Actions */}
              <View className="flex-row space-x-3 mt-6">
                <TouchableOpacity
                  onPress={() => setShowCompletionForm(false)}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 bg-white"
                >
                  <Text className="text-gray-600 font-semibold text-center">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleComplete(selected)}
                  disabled={uploading}
                  className="flex-1 px-6 py-3 rounded-xl bg-green-600 shadow-lg"
                >
                  {uploading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-white font-semibold text-center">Complete Assignment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}