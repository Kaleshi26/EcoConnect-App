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
  MapPin,
  Package,
  Truck
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
    <View className="flex-1 bg-gray-50">
      {!selected ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
          <Text className="text-2xl font-bold text-gray-900 text-center mt-6 mb-4">
            Assigned Cleanups
          </Text>
          {loading ? (
            <View className="py-10 items-center">
              <ActivityIndicator />
              <Text className="text-gray-500 mt-2">Loading events...</Text>
            </View>
          ) : (
            <>
              {/* 🧹 Assigned Cleanups (Today & Past) */}
              {assignedCleanups.length > 0 ? (
                <View className="mb-8">
                  {assignedCleanups.map((ev) => {
                    const d = tsToDate(ev.eventAt);
                    const dateStr = d ? `${formatDate(d)} • ${formatTime(d)}` : "No date";
                    return (
                      <TouchableOpacity
                        key={ev.id}
                        className="mb-3 bg-white border border-gray-200 rounded-xl p-4"
                        onPress={() => {
                          setSelected(ev);
                          setCurrentStep(0);
                          setPhotos([]);
                        }}
                      >
                        {/* Removed status badge */}
                        <Text className="text-lg font-semibold text-gray-900 mb-1">
                          {ev.title}
                        </Text>
                        <Text className="text-gray-500">{dateStr}</Text>
                        {!!ev.location?.label && (
                          <Text className="text-gray-700 mt-1">{ev.location.label}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text className="text-gray-500 text-center mb-6">
                  No completed/today tasks
                </Text>
              )}

              {/* 🗓 Upcoming Destinations */}
              <Text className="text-xl font-bold text-gray-900 mb-3">
                Upcoming Destinations
              </Text>
              {upcomingDestinations.length > 0 ? (
                upcomingDestinations.map((ev) => {
                  const d = tsToDate(ev.eventAt);
                  const dateStr = d ? `${formatDate(d)} • ${formatTime(d)}` : "No date";
                  return (
                    <View
                      key={ev.id}
                      className="mb-3 bg-white border border-gray-200 rounded-xl p-4"
                    >
                      <Text className="text-lg font-semibold text-gray-900">
                        {ev.title}
                      </Text>
                      <Text className="text-gray-500 mt-1">{dateStr}</Text>
                      {!!ev.location?.label && (
                        <Text className="text-gray-700 mt-1">{ev.location.label}</Text>
                      )}
                    </View>
                  );
                })
              ) : (
                <Text className="text-gray-500 text-center">
                  No upcoming destinations
                </Text>
              )}
            </>
          )}
        </ScrollView>
      ) : (
        // 🔹 Assignment Detail View (Steps)
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View className="flex-row items-center mb-6">
            <TouchableOpacity onPress={() => setSelected(null)} className="mr-2">
              <ChevronLeft color="#16a34a" size={20} />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-800">
              Assignment Details
            </Text>
          </View>

          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="text-xl font-bold text-gray-800 mb-2">
              {selected.title}
            </Text>
            <View className="flex-row items-center text-gray-600 mb-1">
              <MapPin size={16} color="#4b5563" />
              <Text className="ml-2">{selected.location?.label}</Text>
            </View>
            <View className="flex-row items-center text-gray-600 mb-1">
              <Calendar size={16} color="#4b5563" />
              <Text className="ml-2">
                {formatDate(tsToDate(selected.eventAt))} •{" "}
                {formatTime(tsToDate(selected.eventAt))}
              </Text>
            </View>
            {!!selected.wasteTypes && (
              <View className="flex-row items-center text-gray-600">
                <Package size={16} color="#4b5563" />
                <Text className="ml-2">
                  {selected.wasteTypes.join(", ")} •{" "}
                  {selected.estimatedQuantity || "N/A"}
                </Text>
              </View>
            )}
          </View>

          {/* Navigate to Location Button */}
          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="text-lg font-semibold mb-3">Navigation</Text>
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
              className="bg-blue-600 px-4 py-3 rounded-lg"
            >
              <Text className="text-white text-center font-medium">
                Navigate to Location
              </Text>
            </TouchableOpacity>
          </View>

          {/* Steps */}
          <View className="bg-white rounded-xl p-4 mb-6">
            <Text className="text-lg font-semibold mb-3">Collection Progress</Text>
            {steps.map((step, index) => (
              <View key={index} className="flex-row items-center mb-4">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
                    index <= currentStep ? "bg-green-600" : "bg-gray-200"
                  }`}
                >
                  <step.icon
                    color={index <= currentStep ? "white" : "#4b5563"}
                    size={20}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`${
                      index <= currentStep ? "text-green-600" : "text-gray-600"
                    } font-medium`}
                  >
                    {step.title}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {index < currentStep
                      ? "COMPLETED"
                      : index === currentStep
                      ? "IN PROGRESS"
                      : "PENDING"}
                  </Text>
                </View>
                {index === currentStep && (
                  <TouchableOpacity
                    disabled={uploading}
                    onPress={async () => {
                      if (index === 0) setCurrentStep(1);
                      else if (index === 1) await handleTakePhoto(selected);
                      else if (index === 2) await handleComplete(selected);
                    }}
                    className="bg-green-600 px-4 py-2 rounded-lg"
                  >
                    <Text className="text-white">
                      {index === 0
                        ? "Mark Collected"
                        : index === 1
                        ? "Take Photo"
                        : "Complete"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Photos */}
          {photos.length > 0 && (
            <View className="bg-white p-4 rounded-xl mb-6">
              <Text className="text-lg font-semibold mb-3">Disposal Photos</Text>
              {photos.map((p, i) => (
                <Image key={i} source={{ uri: p }} className="w-full h-40 rounded-lg mb-2" />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
