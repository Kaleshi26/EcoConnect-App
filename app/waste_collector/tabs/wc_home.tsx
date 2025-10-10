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
  BarChart3,
  Calendar,
  Camera,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  MapPin,
  Navigation,
  Package,
  PlayCircle,
  Truck,
  Zap
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
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

// Calendar helper functions
function getDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  const days = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }
  
  return days;
}

function isSameDay(date1: Date, date2: Date) {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

function getEventsForDate(date: Date, events: EventDoc[]) {
  return events.filter(event => {
    const eventDate = tsToDate(event.eventAt);
    return eventDate && isSameDay(eventDate, date);
  });
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
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EventDoc | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

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
    { title: "Collect Waste", icon: Truck, description: "Navigate to location and collect waste materials" },
    { title: "Take Disposal Photos", icon: Camera, description: "Capture proof of proper disposal" },
    { title: "Confirm Completion", icon: CheckCircle, description: "Mark assignment as completed" },
  ];

  return (
    <View className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50">
      {!selected ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-lg shadow-blue-100">
            <View className="flex-row items-center mb-4">
              <View className="bg-blue-100 p-3 rounded-xl mr-4">
                <Truck size={24} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-900">
                  Waste Collection
                </Text>
                <Text className="text-gray-600 text-sm">
                  Manage your assigned cleanups
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-2xl font-bold text-blue-600">
                  {events.filter(e => e.status !== "Completed").length}
                </Text>
                <Text className="text-xs text-gray-500">Active Tasks</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-emerald-600">
                  {events.filter(e => e.status === "Completed").length}
                </Text>
                <Text className="text-xs text-gray-500">Completed</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-gray-600">
                  {events.length}
                </Text>
                <Text className="text-xs text-gray-500">Total</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions Section - Grid Layout */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <View className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl mr-4">
                <Zap size={24} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-900">
                  Quick Actions
                </Text>
                <Text className="text-gray-600 text-sm">
                  Access your assignments and analytics
                </Text>
              </View>
            </View>
            
            {/* Grid Layout for Quick Actions */}
            <View className="flex-row flex-wrap justify-between">
              {/* View Available Assignments */}
              <TouchableOpacity
                onPress={() => router.push({
                  pathname: "/waste_collector/tabs/wc_assignment",
                  params: { tab: "available" }
                })}
                className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-lg border border-blue-100"
              >
                <View className="items-center">
                  <View className="bg-blue-100 p-4 rounded-2xl mb-3">
                    <ClipboardList size={28} color="#2563eb" />
                  </View>
                  <Text className="text-gray-900 font-bold text-center mb-1">Available</Text>
                  <Text className="text-gray-600 text-xs text-center">Current Tasks</Text>
                </View>
              </TouchableOpacity>

              {/* View Upcoming Assignments */}
              <TouchableOpacity
                onPress={() => router.push({
                  pathname: "/waste_collector/tabs/wc_assignment",
                  params: { tab: "upcoming" }
                })}
                className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-lg border border-amber-100"
              >
                <View className="items-center">
                  <View className="bg-amber-100 p-4 rounded-2xl mb-3">
                    <Calendar size={28} color="#d97706" />
                  </View>
                  <Text className="text-gray-900 font-bold text-center mb-1">Upcoming</Text>
                  <Text className="text-gray-600 text-xs text-center">Scheduled Tasks</Text>
                </View>
              </TouchableOpacity>

              {/* View Analytics - Full Width */}
              <TouchableOpacity
                onPress={() => router.navigate("/waste_collector/tabs/wc_analytics")}
                className="w-full bg-white rounded-2xl p-4 shadow-lg border border-emerald-100"
              >
                <View className="flex-row items-center">
                  <View className="bg-emerald-100 p-4 rounded-2xl mr-4">
                    <BarChart3 size={28} color="#059669" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-lg">Analytics Dashboard</Text>
                    <Text className="text-gray-600 text-sm">Track your performance metrics</Text>
                  </View>
                  <View className="bg-emerald-50 p-2 rounded-lg">
                    <Navigation size={16} color="#059669" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Assignment Calendar View */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <View className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 rounded-xl mr-4">
                <Calendar size={24} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-900">
                  Assignment Calendar
                </Text>
                <Text className="text-gray-600 text-sm">
                  View your assignments by date
                </Text>
              </View>
            </View>

            <View className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100">
              {/* Calendar Header */}
              <View className="flex-row items-center justify-between mb-6">
                <TouchableOpacity
                  onPress={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentDate(newDate);
                  }}
                  className="bg-gray-100 p-2 rounded-lg"
                >
                  <ChevronLeft size={20} color="#6b7280" />
                </TouchableOpacity>
                
                <Text className="text-xl font-bold text-gray-900">
                  {currentDate.toLocaleDateString(undefined, { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </Text>
                
                <TouchableOpacity
                  onPress={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentDate(newDate);
                  }}
                  className="bg-gray-100 p-2 rounded-lg"
                >
                  <ChevronRight size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Calendar Grid */}
              <View className="mb-4">
                {/* Day headers */}
                <View className="flex-row mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <View key={day} className="flex-1 items-center py-2">
                      <Text className="text-xs font-semibold text-gray-500">{day}</Text>
                    </View>
                  ))}
                </View>

                {/* Calendar days */}
                <View className="flex-row flex-wrap">
                  {getDaysInMonth(currentDate).map((day, index) => {
                    if (!day) {
                      return <View key={index} className="w-[14.28%] h-12" />;
                    }

                    const dayEvents = getEventsForDate(day, events);
                    const isToday = isSameDay(day, new Date());
                    const hasEvents = dayEvents.length > 0;

                    return (
                      <TouchableOpacity
                        key={day.getTime()}
                        onPress={() => {
                          console.log('Date clicked:', day);
                        }}
                        className={`w-[14.28%] h-12 items-center justify-center border-b border-r border-gray-100 ${
                          isToday ? 'bg-blue-50' : ''
                        }`}
                      >
                        <Text className={`text-sm font-medium ${
                          isToday ? 'text-blue-600' : 'text-gray-700'
                        }`}>
                          {day.getDate()}
                        </Text>
                        {hasEvents && (
                          <View className="flex-row mt-1">
                            {dayEvents.slice(0, 3).map((_, eventIndex) => (
                              <View
                                key={eventIndex}
                                className={`w-1.5 h-1.5 rounded-full mx-0.5 ${
                                  dayEvents[eventIndex]?.status === 'Completed' ? 'bg-emerald-500' :
                                  dayEvents[eventIndex]?.status === 'In-progress' ? 'bg-blue-500' :
                                  'bg-amber-500'
                                }`}
                              />
                            ))}
                            {dayEvents.length > 3 && (
                              <Text className="text-xs text-gray-500 ml-1">+</Text>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

            </View>
          </View>
          
          {loading ? (
            <View className="py-10 items-center">
              <View className="bg-white p-6 rounded-2xl shadow-sm">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="text-gray-600 mt-3 font-medium">Loading assignments...</Text>
              </View>
            </View>
          ) : null}
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
                const lat = selected?.location?.lat;
                const lng = selected?.location?.lng;
                const label = selected?.location?.label || "Event Location";
                
                if (typeof lat === "number" && typeof lng === "number") {
                  const scheme = Platform.select({ 
                    ios: 'maps:', 
                    android: 'geo:' 
                  });
                  const url = Platform.select({
                    ios: `${scheme}?q=${label}&ll=${lat},${lng}`,
                    android: `${scheme}${lat},${lng}?q=${label}`
                  });
                  
                  Linking.openURL(url!).catch(() => {
                    // Fallback to Google Maps web
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
                  });
                } else {
                  Alert.alert("Error", "Location coordinates not available");
                }
              }}
              className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-xl flex-row items-center justify-center shadow-lg"
            >
              <Navigation size={20} color="white" />
              <Text className="text-white text-center font-semibold ml-2">
                Open in Maps
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
                        else if (index === 2) await handleComplete(selected);
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
        </ScrollView>
      )}
    </View>
  );
}