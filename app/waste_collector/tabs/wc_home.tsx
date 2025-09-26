import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
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
    ChevronLeft,
    Clock,
    MapPin,
    Navigation,
    Recycle,
    Shield,
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

// ✅ We keep StatusBadge component in case you need it later, but not using it
function StatusBadge({ status }: { status: EventDoc["status"] }) {
  if (!status) return null;
  let bgColor = "", textColor = "";
  switch (status) {
    case "Pending": bgColor = "bg-yellow-100"; textColor = "text-yellow-800"; break;
    case "In-progress": bgColor = "bg-blue-100"; textColor = "text-blue-800"; break;
    case "Completed": bgColor = "bg-green-100"; textColor = "text-green-800"; break;
  }
  return (
    <View className={`px-2 py-0.5 rounded-full ${bgColor}`}>
      <Text className={`text-[10px] font-semibold ${textColor}`}>{status}</Text>
    </View>
  );
}

export default function WcHome({ userId }: { userId: string }) {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EventDoc | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

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

  const assignedCleanups = events.filter((ev) => {
    const date = tsToDate(ev.eventAt);
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d <= today; // past or today
  });

  const upcomingDestinations = events.filter((ev) => {
    const date = tsToDate(ev.eventAt);
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d > today; // future
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

  // 🔹 Handle completion
  async function handleComplete(ev: EventDoc) {
    await updateDoc(doc(db, "events", ev.id), {
      status: "Completed",
      completedAt: serverTimestamp(),
    });
    Alert.alert("Success", "Assignment marked completed ✅");
    setSelected(null);
    setCurrentStep(0);
    setPhotos([]);
  }

  const steps = [
    { title: "Collect Waste", icon: Truck },
    { title: "Take Disposal Photos", icon: Camera },
    { title: "Confirm Completion", icon: CheckCircle },
  ];

  return (
    <View className="flex-1 bg-gradient-to-br from-green-50 to-emerald-100">
      {!selected ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
          <View className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-lg">
            <View className="flex-row items-center justify-center mb-4">
              <View className="bg-green-100 p-3 rounded-full mr-3">
                <Truck color="#16a34a" size={24} />
              </View>
              <Text className="text-2xl font-bold text-green-800">
                Waste Collection Hub
              </Text>
            </View>
            <Text className="text-green-600 text-center text-sm">
              Manage your assigned cleanups and upcoming destinations
            </Text>
          </View>
          {loading ? (
            <View className="py-10 items-center">
              <View className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
                <ActivityIndicator color="#16a34a" size="large" />
                <Text className="text-green-600 mt-4 font-medium">Loading your assignments...</Text>
              </View>
            </View>
          ) : (
            <>
              {/* 🧹 Assigned Cleanups (Today & Past) */}
              {assignedCleanups.length > 0 ? (
                <View className="mb-8">
                  <View className="flex-row items-center mb-4">
                    <View className="bg-orange-100 p-2 rounded-full mr-3">
                      <Trash2 color="#ea580c" size={20} />
                    </View>
                    <Text className="text-xl font-bold text-orange-800">
                      Active Assignments
                    </Text>
                  </View>
                  {assignedCleanups.map((ev) => {
                    const d = tsToDate(ev.eventAt);
                    const dateStr = d ? `${formatDate(d)} • ${formatTime(d)}` : "No date";
                    const isToday = d && new Date(d).toDateString() === new Date().toDateString();
                    return (
                      <TouchableOpacity
                        key={ev.id}
                        className="mb-4 bg-white/90 backdrop-blur-sm border border-green-200 rounded-2xl p-5 shadow-md"
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
                              {isToday && (
                                <View className="bg-green-100 px-2 py-1 rounded-full ml-2">
                                  <Text className="text-green-700 text-xs font-semibold">TODAY</Text>
                                </View>
                              )}
                            </View>
                            {!!ev.location?.label && (
                              <View className="flex-row items-center">
                                <MapPin size={14} color="#6b7280" />
                                <Text className="text-gray-700 ml-2 text-sm">{ev.location.label}</Text>
                              </View>
                            )}
                          </View>
                          <View className="bg-green-100 p-2 rounded-full">
                            <Truck color="#16a34a" size={20} />
                          </View>
                        </View>
                        {ev.wasteTypes && (
                          <View className="flex-row items-center">
                            <Recycle size={14} color="#6b7280" />
                            <Text className="text-gray-600 ml-2 text-sm">
                              {ev.wasteTypes.join(", ")}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg mb-6">
                  <View className="items-center">
                    <View className="bg-gray-100 p-4 rounded-full mb-4">
                      <CheckCircle color="#6b7280" size={32} />
                    </View>
                    <Text className="text-gray-600 text-center font-medium">
                      No active assignments
                    </Text>
                    <Text className="text-gray-500 text-center text-sm mt-1">
                      All caught up! Check back later for new tasks.
                    </Text>
                  </View>
                </View>
              )}

              {/* 🗓 Upcoming Destinations */}
              <View className="flex-row items-center mb-4">
                <View className="bg-blue-100 p-2 rounded-full mr-3">
                  <Calendar color="#2563eb" size={20} />
                </View>
                <Text className="text-xl font-bold text-blue-800">
                  Upcoming Destinations
                </Text>
              </View>
              {upcomingDestinations.length > 0 ? (
                upcomingDestinations.map((ev) => {
                  const d = tsToDate(ev.eventAt);
                  const dateStr = d ? `${formatDate(d)} • ${formatTime(d)}` : "No date";
                  return (
                    <View
                      key={ev.id}
                      className="mb-4 bg-white/90 backdrop-blur-sm border border-blue-200 rounded-2xl p-5 shadow-md"
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
                        <View className="bg-blue-100 p-2 rounded-full">
                          <Calendar color="#2563eb" size={20} />
                        </View>
                      </View>
                      {ev.wasteTypes && (
                        <View className="flex-row items-center">
                          <Recycle size={14} color="#6b7280" />
                          <Text className="text-gray-600 ml-2 text-sm">
                            {ev.wasteTypes.join(", ")}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
                  <View className="items-center">
                    <View className="bg-blue-100 p-4 rounded-full mb-4">
                      <Calendar color="#6b7280" size={32} />
                    </View>
                    <Text className="text-gray-600 text-center font-medium">
                      No upcoming destinations
                    </Text>
                    <Text className="text-gray-500 text-center text-sm mt-1">
                      New assignments will appear here when available.
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      ) : (
        // 🔹 Assignment Detail View (Steps)
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-6 shadow-lg">
            <View className="flex-row items-center mb-4">
              <TouchableOpacity 
                onPress={() => setSelected(null)} 
                className="bg-green-100 p-2 rounded-full mr-3"
              >
                <ChevronLeft color="#16a34a" size={20} />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-green-800">
                  Assignment Details
                </Text>
                <Text className="text-green-600 text-sm">
                  Track your collection progress
                </Text>
              </View>
            </View>
          </View>

          <View className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 mb-4 shadow-lg">
            <View className="flex-row items-start justify-between mb-4">
              <Text className="text-xl font-bold text-gray-800 flex-1">
                {selected.title}
              </Text>
              <View className="bg-green-100 p-2 rounded-full">
                <Shield color="#16a34a" size={20} />
              </View>
            </View>
            <View className="space-y-3">
              <View className="flex-row items-center">
                <View className="bg-blue-100 p-2 rounded-full mr-3">
                  <MapPin size={16} color="#2563eb" />
                </View>
                <Text className="text-gray-700 font-medium">{selected.location?.label}</Text>
              </View>
              <View className="flex-row items-center">
                <View className="bg-orange-100 p-2 rounded-full mr-3">
                  <Calendar size={16} color="#ea580c" />
                </View>
                <Text className="text-gray-700 font-medium">
                  {formatDate(tsToDate(selected.eventAt))} •{" "}
                  {formatTime(tsToDate(selected.eventAt))}
                </Text>
              </View>
              {!!selected.wasteTypes && (
                <View className="flex-row items-center">
                  <View className="bg-purple-100 p-2 rounded-full mr-3">
                    <Recycle size={16} color="#7c3aed" />
                  </View>
                  <Text className="text-gray-700 font-medium">
                    {selected.wasteTypes.join(", ")} •{" "}
                    {selected.estimatedQuantity || "N/A"}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Navigate to Location Button */}
          <View className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 mb-4 shadow-lg">
            <View className="flex-row items-center mb-4">
              <View className="bg-blue-100 p-2 rounded-full mr-3">
                <Navigation color="#2563eb" size={20} />
              </View>
              <Text className="text-lg font-bold text-blue-800">Navigation</Text>
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
              className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-xl shadow-md"
            >
              <View className="flex-row items-center justify-center">
                <Navigation color="white" size={20} />
                <Text className="text-white text-center font-bold ml-2">
                  Navigate to Location
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Steps */}
          <View className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 mb-6 shadow-lg">
            <View className="flex-row items-center mb-6">
              <View className="bg-green-100 p-2 rounded-full mr-3">
                <Zap color="#16a34a" size={20} />
              </View>
              <Text className="text-lg font-bold text-green-800">Collection Progress</Text>
            </View>
            {steps.map((step, index) => (
              <View key={index} className="mb-6">
                <View className="flex-row items-center">
                  <View
                    className={`w-12 h-12 rounded-full items-center justify-center mr-4 shadow-md ${
                      index <= currentStep 
                        ? "bg-gradient-to-br from-green-500 to-green-600" 
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
                      className={`text-lg font-bold ${
                        index <= currentStep ? "text-green-700" : "text-gray-600"
                      }`}
                    >
                      {step.title}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <View className={`px-2 py-1 rounded-full ${
                        index < currentStep
                          ? "bg-green-100"
                          : index === currentStep
                          ? "bg-blue-100"
                          : "bg-gray-100"
                      }`}>
                        <Text className={`text-xs font-semibold ${
                          index < currentStep
                            ? "text-green-700"
                            : index === currentStep
                            ? "text-blue-700"
                            : "text-gray-500"
                        }`}>
                          {index < currentStep
                            ? "✓ COMPLETED"
                            : index === currentStep
                            ? "⚡ IN PROGRESS"
                            : "⏳ PENDING"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {index === currentStep && (
                    <TouchableOpacity
                      disabled={uploading}
                      onPress={async () => {
                        if (index === 0) setCurrentStep(1);
                        else if (index === 1) await handleTakePhoto(selected);
                        else if (index === 2) await handleComplete(selected);
                      }}
                      className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-3 rounded-xl shadow-md"
                    >
                      <Text className="text-white font-bold">
                        {index === 0
                          ? "Mark Collected"
                          : index === 1
                          ? "Take Photo"
                          : "Complete"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {index < steps.length - 1 && (
                  <View className="ml-6 mt-2 mb-2">
                    <View className={`w-0.5 h-4 ${
                      index < currentStep ? "bg-green-300" : "bg-gray-200"
                    }`} />
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Photos */}
          {photos.length > 0 && (
            <View className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 mb-6 shadow-lg">
              <View className="flex-row items-center mb-4">
                <View className="bg-purple-100 p-2 rounded-full mr-3">
                  <Camera color="#7c3aed" size={20} />
                </View>
                <Text className="text-lg font-bold text-purple-800">Disposal Photos</Text>
              </View>
              <View className="space-y-3">
                {photos.map((p, i) => (
                  <View key={i} className="relative">
                    <Image 
                      source={{ uri: p }} 
                      className="w-full h-48 rounded-xl shadow-md" 
                    />
                    <View className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                      <Text className="text-xs font-semibold text-gray-700">
                        Photo {i + 1}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
