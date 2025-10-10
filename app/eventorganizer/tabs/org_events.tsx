// app/eventorganizer/tabs/org_events.tsx
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as Location from 'expo-location';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import { useAuth } from "../../../contexts/AuthContext";
import { db, storage } from "../../../services/firebaseConfig";

// Helpers
const isWeb = Platform.OS === "web";
type IconName = React.ComponentProps<typeof Ionicons>["name"];

type EventDoc = {
  id: string;
  title: string;
  description: string;
  eventAt?: Timestamp;
  location?: { label?: string; latitude?: number; longitude?: number };
  wasteTypes?: string[];
  volunteersNeeded?: number;
  sponsorshipRequired?: boolean;
  organizerId?: string;
  createdAt?: Timestamp;
  imageUrl?: string;
  status: "open" | "in_progress" | "completed";
  actualParticipants?: number;
  collectedWastes?: { type: string; weight: number }[];
  evidencePhotos?: string[];
};

// Small UI helpers
function Row({ children }: { children: React.ReactNode }) {
  return <View className="flex-row items-center">{children}</View>;
}

function Section({ title, children, color = "blue" }: { title: string; children: React.ReactNode; color?: string }) {
  const colorMap = {
    blue: "border-blue-200",
    green: "border-green-200", 
    purple: "border-purple-200",
    orange: "border-orange-200",
    pink: "border-pink-200"
  };
  
  return (
    <View className="mb-6">
      <Text className="text-gray-900 text-base font-semibold mb-3">{title}</Text>
      <View className={`bg-white rounded-2xl border-2 ${colorMap[color]} shadow-sm p-1`}>
        {children}
      </View>
    </View>
  );
}

function FieldButton({
  icon,
  label,
  value,
  onPress,
  color = "blue"
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress: () => void;
  color?: string;
}) {
  const colorMap = {
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
    pink: "text-pink-600"
  };
  
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between px-4 py-4">
      <Row>
        <Ionicons name={icon} size={20} color={colorMap[color].split('text-')[1].split('-')[0]} />
        <Text className="ml-3 text-gray-800 font-medium">{label}</Text>
      </Row>
      <Row>
        <Text className={`mr-2 ${value ? "text-gray-900 font-semibold" : "text-gray-400"} font-medium`}>
          {value ?? "Select"}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
      </Row>
    </Pressable>
  );
}

function Chip({
  label,
  selected,
  onPress,
  color = "blue"
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  const colorMap = {
    blue: selected ? "bg-blue-500 border-blue-500" : "border-blue-300",
    green: selected ? "bg-green-500 border-green-500" : "border-green-300",
    purple: selected ? "bg-purple-500 border-purple-500" : "border-purple-300",
    orange: selected ? "bg-orange-500 border-orange-500" : "border-orange-300",
    pink: selected ? "bg-pink-500 border-pink-500" : "border-pink-300"
  };
  
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-3 rounded-2xl mr-2 mb-2 border-2 ${colorMap[color]} ${
        selected ? '' : 'bg-white'
      }`}
      style={{ 
        shadowColor: "#000", 
        shadowOpacity: selected ? 0.2 : 0.1, 
        shadowRadius: 6, 
        elevation: 4,
        shadowOffset: { width: 0, height: 2 }
      }}
    >
      <Text className={`font-semibold ${selected ? "text-white" : "text-gray-700"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function Stepper({
  value,
  setValue,
  min = 1,
  max = 1000,
  color = "blue"
}: {
  value: number;
  setValue: (n: number) => void;
  min?: number;
  max?: number;
  color?: string;
}) {
  const colorMap = {
    blue: "bg-blue-100",
    green: "bg-green-100",
    purple: "bg-purple-100",
    orange: "bg-orange-100",
    pink: "bg-pink-100"
  };
  
  return (
    <Row>
      <Pressable
        onPress={() => setValue(Math.max(min, value - 1))}
        className={`w-12 h-12 rounded-2xl ${colorMap[color]} items-center justify-center`}
      >
        <Ionicons name="remove" size={20} color="#374151" />
      </Pressable>
      <Text className="mx-4 text-xl font-bold text-gray-900">{value}</Text>
      <Pressable
        onPress={() => setValue(Math.min(max, value + 1))}
        className={`w-12 h-12 rounded-2xl ${colorMap[color]} items-center justify-center`}
      >
        <Ionicons name="add" size={20} color="#374151" />
      </Pressable>
    </Row>
  );
}

function usePressScale(initial = 1) {
  const scale = useRef(new Animated.Value(initial)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return { scale, onPressIn, onPressOut };
}

// Image Upload Component
function ImageUploader({ 
  images, 
  onImagesChange, 
  maxImages = 5,
  title,
  color = "blue"
}: { 
  images: string[]; 
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  title: string;
  color?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert("Limit Reached", `You can only upload up to ${maxImages} images.`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need permissions to access your images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0].uri) return;

      const imageUri = result.assets[0].uri;
      setUploading(true);

      // Native vs Web upload
      let downloadURL = imageUri;

      if (!isWeb) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const filename = `events/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        downloadURL = await getDownloadURL(storageRef);
      }

      onImagesChange([...images, downloadURL]);
      setUploading(false);
    } catch (err) {
      console.error("Image upload error:", err);
      Alert.alert("Upload Failed", "Could not upload image. Please try again.");
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const colorMap = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    pink: "bg-pink-500"
  };

  return (
    <View className="mb-4">
      {title ? <Text className="text-gray-900 text-base font-semibold mb-3">{title}</Text> : null}
      <View className="flex-row flex-wrap">
        {images.map((image, index) => (
          <View key={index} className="relative mr-3 mb-3">
            <Image 
              source={{ uri: image }} 
              className="w-20 h-20 rounded-xl" 
              resizeMode="cover" 
            />
            <Pressable
              onPress={() => removeImage(index)}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
            >
              <Ionicons name="close" size={16} color="white" />
            </Pressable>
          </View>
        ))}
        {images.length < maxImages && (
          <Pressable
            onPress={pickImage}
            disabled={uploading}
            className={`w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 items-center justify-center ${colorMap[color]} opacity-90`}
          >
            {uploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="add" size={24} color="white" />
            )}
          </Pressable>
        )}
      </View>
      <Text className="text-gray-500 text-sm mt-1">
        {images.length}/{maxImages} images selected
      </Text>
    </View>
  );
}


// Date helpers for web inputs
function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function toDateInputValue(d?: Date | null) {
  if (!d) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toTimeInputValue(d?: Date | null) {
  if (!d) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatDate(d?: Date | null) {
  if (!d) return undefined;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function formatTime(d?: Date | null) {
  if (!d) return undefined;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function formatDateTime(ts?: Timestamp) {
  const d = tsToDate(ts);
  if (!d) return "No date";
  const dateStr = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} • ${timeStr}`;
}
function combineDateTime(date?: Date | null, time?: Date | null): Date | null {
  if (!date || !time) return null;
  const combined = new Date(date);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined;
}
function tsToDate(ts?: Timestamp) {
  try {
    if (!ts) return null;
    // @ts-ignore
    if (typeof ts.toDate === "function") return ts.toDate();
  } catch {}
  return null;
}
function getStatus(ev: EventDoc) {
  if (ev.status === "completed") return "Completed";
  const now = new Date();
  const eventDate = tsToDate(ev.eventAt);
  if (!eventDate) return "Upcoming";
  if (eventDate.getTime() > now.getTime()) return "Upcoming";
  return "In Progress";
}

// Event Card with enhanced UI
function EventCard({ ev, onClosePress }: { ev: EventDoc; onClosePress: () => void }) {
  const status = getStatus(ev);
  const d = formatDateTime(ev.eventAt);

  const statusColors: Record<string, { bg: string; text: string }> = {
    Upcoming: { bg: "bg-blue-100", text: "text-blue-700" },
    "In Progress": { bg: "bg-yellow-100", text: "text-yellow-700" },
    Completed: { bg: "bg-green-100", text: "text-green-700" },
  };

  const statusConfig = statusColors[status] || { bg: "bg-gray-100", text: "text-gray-700" };

  const openInMaps = () => {
    const { latitude, longitude, label } = ev.location || {};
    if (!latitude || !longitude) return;

    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    
    if (url) Linking.openURL(url);
  };

  return (
    <View className="mb-6 bg-white rounded-3xl overflow-hidden shadow-2xl border-2 border-gray-100">
      {ev.location?.latitude && ev.location?.longitude ? (
        <Pressable onPress={openInMaps}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={{ width: "100%", height: 192 }} // h-48 is 192px
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            initialRegion={{
              latitude: ev.location.latitude,
              longitude: ev.location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker coordinate={{ latitude: ev.location.latitude, longitude: ev.location.longitude }} />
          </MapView>
        </Pressable>
      ) : (
        <Image
          source={{
            uri: ev.imageUrl || "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400",
          }}
          className="w-full h-48"
        />
      )}
      <View className="p-6">
        <Row className="justify-between mb-3">
          <Text className="text-xl font-bold flex-1 text-gray-900 mr-3">{ev.title}</Text>
          <View className={`px-4 py-2 rounded-full ${statusConfig.bg}`}>
            <Text className={`font-bold text-xs ${statusConfig.text}`}>
              {status}
            </Text>
          </View>
        </Row>
        
        <Text className="text-gray-600 mb-3 font-medium">{d}</Text>
        
        {!!ev.location?.label && (
          <Row className="mb-2">
            <Ionicons name="location-outline" size={18} color="#ef4444" />
            <Text className="text-gray-700 ml-2 font-medium">{ev.location.label}</Text>
          </Row>
        )}
        
        <Row className="mb-2">
          <Ionicons name="people-outline" size={18} color="#3b82f6" />
          <Text className="text-gray-700 ml-2 font-medium">{ev.volunteersNeeded ?? 0} volunteers needed</Text>
        </Row>

        {ev.wasteTypes && ev.wasteTypes.length > 0 && (
          <Row className="mb-3 flex-wrap">
            <Ionicons name="trash-outline" size={16} color="#10b981" />
            <Text className="text-gray-700 ml-2 font-medium">Waste: </Text>
            {ev.wasteTypes.slice(0, 2).map((type, index) => (
              <Text key={index} className="text-gray-600 text-sm">
                {type}{index < Math.min(ev.wasteTypes!.length, 2) - 1 ? ', ' : ''}
              </Text>
            ))}
            {ev.wasteTypes.length > 2 && (
              <Text className="text-gray-500 text-sm"> +{ev.wasteTypes.length - 2} more</Text>
            )}
          </Row>
        )}

        {status === "In Progress" && (
          <Pressable
            onPress={onClosePress}
            className="mt-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl py-4 items-center shadow-lg"
          >
            <Text className="text-white font-bold text-base">Close Event & Submit Report</Text>
          </Pressable>
        )}
        
        {status === "Completed" && (
          <View className="mt-4 p-4 bg-green-50 rounded-2xl border-2 border-green-200">
            <Text className="text-green-800 font-bold mb-2">Event Completed 🎉</Text>
            {ev.actualParticipants !== undefined && (
              <Text className="text-green-700 font-medium">Participants: {ev.actualParticipants}</Text>
            )}
            {ev.collectedWastes?.map((waste, i) => (
              <Text key={i} className="text-green-700 font-medium">
                {waste.type}: {waste.weight} kg
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* NEW: Location Picker Modal                                         */
/* ------------------------------------------------------------------ */
function LocationPickerModal({
  visible,
  onClose,
  onLocationSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (coords: { latitude: number; longitude: number }) => void;
}) {
  const [initialRegion, setInitialRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  const [markerCoords, setMarkerCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    // A default location (e.g., San Francisco) in case everything fails
    const defaultRegion = {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };

    const setupLocation = async () => {
      // --- WEB PLATFORM LOGIC ---
      if (Platform.OS === 'web') {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              const region = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
              setInitialRegion(region);
              setMarkerCoords(region);
            },
            (err) => {
              console.warn(`Geolocation error on web: ${err.message}`);
              setInitialRegion(defaultRegion);
              setMarkerCoords(defaultRegion);
            }
          );
        } else {
          Alert.alert("Location not supported", "Your browser does not support geolocation.");
          setInitialRegion(defaultRegion);
          setMarkerCoords(defaultRegion);
        }
      // --- MOBILE PLATFORM LOGIC (iOS & Android) ---
      } else {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission denied", "We need permission to access your location to center the map.");
          setInitialRegion(defaultRegion);
          setMarkerCoords(defaultRegion);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        const region = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setInitialRegion(region);
        setMarkerCoords(region);
      }
    };

    setupLocation();
  }, []);

  const handleConfirm = () => {
    if (markerCoords) {
      onLocationSelect(markerCoords);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1">
        {initialRegion ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            initialRegion={initialRegion}
            showsUserLocation
          >
            {markerCoords && (
              <Marker
                draggable
                coordinate={markerCoords}
                onDragEnd={(e) => setMarkerCoords(e.nativeEvent.coordinate)}
                title="Event Location"
                description="Drag to move"
              />
            )}
          </MapView>
        ) : (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="mt-4">Fetching map...</Text>
          </View>
        )}
        <View className="absolute bottom-6 left-6 right-6 flex-row gap-4">
          <Pressable
            onPress={onClose}
            className="flex-1 bg-gray-500 rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-bold text-lg">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            className="flex-1 bg-blue-600 rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-bold text-lg">Confirm Location</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Create Event Form (with image upload)                             */
/* ------------------------------------------------------------------ */
function CreateEventForm({
  onCancel,
  onPublished,
}: {
  onCancel: () => void;
  onPublished: () => void;
}) {
  const { user, profile } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventImages, setEventImages] = useState<string[]>([]);

  const [date, setDate] = useState<Date | null>(new Date());
  const [time, setTime] = useState<Date | null>(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const combinedDate = useMemo(() => combineDateTime(date, time), [date, time]);

  const [locationLabel, setLocationLabel] = useState("");
  const [locationCoords, setLocationCoords] = useState<{latitude: number; longitude: number} | null>(null);
  const [isMapModalVisible, setMapModalVisible] = useState(false);

  const [wasteTypes, setWasteTypes] = useState<string[]>([]);
  const [volunteers, setVolunteers] = useState(20);
  const [sponsorshipRequired, setSponsorshipRequired] = useState(false);
  const [resourcesNeeded, setResourcesNeeded] = useState("");

  const [publishing, setPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleWaste = (w: string) =>
    setWasteTypes((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));

  const validate = () => {
    if (!title.trim()) return "Please enter an event title.";
    if (!combinedDate) return "Please select date and time.";
    if (combinedDate.getTime() < Date.now()) return "Event time must be in the future.";
    if (!locationLabel.trim()) return "Please enter a location/meeting point.";

    if (!locationCoords) return "Please select the event location on the map.";

    if (description.trim().length < 10) return "Description should be at least 10 characters.";
    if (eventImages.length === 0) return "Please add at least one event image.";
    return null;
  };

  const publish = async () => {
    setErrorMsg(null);
    const error = validate();
    if (error) {
      setErrorMsg(error);
      if (!isWeb) Alert.alert("Check your form", error);
      return;
    }
    if (!user) {
      const msg = "Not signed in. Please log in again.";
      setErrorMsg(msg);
      if (!isWeb) Alert.alert("Not signed in", msg);
      return;
    }
    try {
      setPublishing(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        eventAt: Timestamp.fromDate(combinedDate!),
        location: { 
          label: locationLabel.trim(),
          latitude: locationCoords?.latitude,
          longitude: locationCoords?.longitude,
        },
        wasteTypes,
        volunteersNeeded: volunteers,
        sponsorshipRequired,
        resourcesNeeded: sponsorshipRequired ? resourcesNeeded.trim() : "",
        organizerId: user.uid,
        organizerRole: profile?.role ?? "organizer",
        status: "open",
        platform: Platform.OS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        imageUrl: eventImages[0], // Use first image as main image
      };
      await addDoc(collection(db, "events"), payload);

      onPublished();
    } catch (e: any) {
      const msg = e?.message ?? "Failed to create event.";
      setErrorMsg(msg);
      if (!isWeb) Alert.alert("Publish failed", msg);
      console.error("[CreateEventForm] publish error:", e);
    } finally {
      setPublishing(false);
    }
  };

  const btnAnim = usePressScale();

  return (
    <View className="flex-1 bg-gradient-to-b from-blue-50 to-purple-50">
      <LocationPickerModal
        visible={isMapModalVisible}
        onClose={() => setMapModalVisible(false)}
        onLocationSelect={(coords) => {
          setLocationCoords(coords);
        }}
      />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
        <View className="items-center mb-6">
          <View className="bg-white rounded-3xl px-6 py-4 shadow-lg mb-2">
            <Text className="text-3xl font-bold text-gray-900 text-center">Create New Event</Text>
          </View>
          <Text className="text-gray-600 text-center font-medium">Make it memorable with great images! 📸</Text>
        </View>

        {errorMsg ? (
          <View className="mb-6 px-6 py-4 rounded-2xl bg-red-50 border-2 border-red-200">
            <Text className="text-red-700 font-bold text-lg">Oops! 🚨</Text>
            <Text className="text-red-700 mt-1 font-medium">{errorMsg}</Text>
          </View>
        ) : null}

        {/* Event Images */}
        <Section title="🎨 Event Images" color="purple">
          <View className="p-4">
            <ImageUploader
              images={eventImages}
              onImagesChange={setEventImages}
              maxImages={5}
              title=""
              color="purple"
            />
            <Text className="text-gray-600 text-sm mt-2">
              Add compelling images to attract more volunteers! First image will be the cover.
            </Text>
          </View>
        </Section>

        {/* Title */}
        <Section title="📝 Event Title" color="blue">
          <TextInput 
            value={title} 
            onChangeText={setTitle} 
            placeholder="Beach Cleanup Day 🌊" 
            className="px-4 py-4 text-lg font-medium" 
            maxLength={80} 
            placeholderTextColor="#9ca3af"
          />
        </Section>

        {/* Date & Time */}
        <Section title="📅 Date & Time" color="green">
          {!isWeb ? (
            <>
              <FieldButton icon="calendar-outline" label="Date" value={formatDate(date)} onPress={() => setShowDate(true)} color="green" />
              <View className="h-[2px] bg-green-100 mx-4" />
              <FieldButton icon="time-outline" label="Time" value={formatTime(time)} onPress={() => setShowTime(true)} color="green" />
              {showDate && (
                <DateTimePicker
                  mode="date"
                  value={date || new Date()}
                  onChange={(_, d) => {
                    if (Platform.OS !== "ios") setShowDate(false);
                    if (d) setDate(d);
                  }}
                  minimumDate={new Date()}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                />
              )}
              {showTime && (
                <DateTimePicker
                  mode="time"
                  value={time || new Date()}
                  onChange={(_, d) => {
                    if (Platform.OS !== "ios") setShowTime(false);
                    if (d) setTime(d);
                  }}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                />
              )}
            </>
          ) : (
            <View className="px-4 py-4">
              <Text className="text-gray-700 font-medium mb-2">Date</Text>
              {/* @ts-ignore web input */}
              <input
                type="date"
                value={toDateInputValue(date)}
                min={toDateInputValue(new Date())}
                onChange={(e: any) => {
                  const [yyyy, mm, dd] = e.target.value.split("-").map((n: string) => parseInt(n, 10));
                  const next = new Date(date || new Date());
                  next.setFullYear(yyyy, mm - 1, dd);
                  setDate(next);
                }}
                style={{ width: "100%", padding: 12, borderWidth: 2, borderColor: "#bbf7d0", borderRadius: 16, outline: "none", fontSize: 16 }}
              />
              <Text className="text-gray-700 font-medium mb-2 mt-4">Time</Text>
              {/* @ts-ignore web input */}
              <input
                type="time"
                value={toTimeInputValue(time)}
                onChange={(e: any) => {
                  const [hh, mm] = e.target.value.split(":").map((n: string) => parseInt(n, 10));
                  const next = new Date(time || new Date());
                  next.setHours(hh, mm, 0, 0);
                  setTime(next);
                }}
                style={{ width: "100%", padding: 12, borderWidth: 2, borderColor: "#bbf7d0", borderRadius: 16, outline: "none", fontSize: 16 }}
              />
            </View>
          )}
        </Section>

        {/* Location */}
        <Section title="📍 Location" color="orange">
          <TextInput
            value={locationLabel}
            onChangeText={setLocationLabel}
            placeholder="🏖️ Beach Point, Coastal Road..."
            className="px-4 py-4 text-lg font-medium"
            placeholderTextColor="#9ca3af"
          />
          <View className="h-[2px] bg-orange-100 mx-4" />
          <FieldButton
            icon="map-outline"
            label="Set on Map"
            value={locationCoords ? "Location Set" : "Select"}
            onPress={() => setMapModalVisible(true)}
            color="orange"
          />
        </Section>

        {/* Description */}
        <Section title="📋 Description" color="pink">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="🌟 Describe the meetup point, tools to bring, safety info... Make it exciting!"
            className="px-4 py-4 text-base"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#9ca3af"
          />
        </Section>

        {/* Waste Types */}
        <Section title="🗑️ Waste Types Expected" color="blue">
          <View className="flex-row flex-wrap p-4">
            {["Plastic Bottles", "Plastic Bags", "Fishing Gear", "Glass", "Cans", "Other"].map((w) => (
              <Chip key={w} label={w} selected={wasteTypes.includes(w)} onPress={() => toggleWaste(w)} color="blue" />
            ))}
          </View>
        </Section>

        {/* Volunteers */}
        <Section title="👥 Volunteers Needed" color="green">
          <View className="px-4 py-4 flex-row items-center justify-between">
            <Stepper value={volunteers} setValue={setVolunteers} min={1} max={1000} color="green" />
          </View>
        </Section>

        {/* Sponsorship */}
        <Section title="💰 Sponsorship" color="purple">
          <View className="px-4 py-4">
            <Row className="justify-between">
              <Text className="text-gray-800 font-medium text-lg">Require sponsors</Text>
              <Switch 
                value={sponsorshipRequired} 
                onValueChange={setSponsorshipRequired}
                trackColor={{ false: '#e5e7eb', true: '#c084fc' }}
                thumbColor={sponsorshipRequired ? '#9333ea' : '#9ca3af'}
              />
            </Row>
            {sponsorshipRequired && (
              <View className="mt-4">
                <Text className="text-gray-700 font-medium mb-2">Resources Needed</Text>
                <TextInput
                  value={resourcesNeeded}
                  onChangeText={setResourcesNeeded}
                  placeholder="🧤 Gloves, 🗑️ Trash bags, 🥤 Refreshments..."
                  className="px-4 py-3 text-base border-2 border-purple-200 rounded-xl"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            )}
          </View>
        </Section>

        {/* Actions */}
        <View className="flex-row mt-6 mb-8">
          <Pressable 
            onPress={onCancel} 
            className="flex-1 mr-4 rounded-2xl py-5 items-center bg-gradient-to-r from-gray-400 to-gray-500 shadow-lg"
          >
            <Text className="text-white font-bold text-lg">Cancel</Text>
          </Pressable>

          <Animated.View style={{ flex: 1, transform: [{ scale: btnAnim.scale }] }}>
            <Pressable
              onPressIn={btnAnim.onPressIn}
              onPressOut={btnAnim.onPressOut}
              onPress={publish}
              disabled={publishing}
              className={`rounded-2xl py-5 items-center shadow-xl ${
                publishing 
                  ? "bg-gradient-to-r from-blue-400 to-purple-400" 
                  : "bg-gradient-to-r from-blue-500 to-purple-600"
              }`}
            >
              {publishing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-bold text-lg">🚀 Publish Event</Text>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Close Event Form (with evidence photos)                           */
/* ------------------------------------------------------------------ */
function CloseEventForm({
  event,
  onCancel,
  onClosed,
}: {
  event: EventDoc;
  onCancel: () => void;
  onClosed: () => void;
}) {
  const [actualParticipants, setActualParticipants] = useState(0);
  const [collectedWastes, setCollectedWastes] = useState<{ type: string; weight: number }[]>([]);
  const [newWasteType, setNewWasteType] = useState("");
  const [newWasteWeight, setNewWasteWeight] = useState(0);
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const [closing, setClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addWaste = () => {
    if (newWasteType && newWasteWeight > 0) {
      setCollectedWastes([...collectedWastes, { type: newWasteType, weight: newWasteWeight }]);
      setNewWasteType("");
      setNewWasteWeight(0);
    }
  };

  const removeWaste = (index: number) => {
    setCollectedWastes(collectedWastes.filter((_, i) => i !== index));
  };

  const validate = () => {
    if (actualParticipants < 0) return "Participants count must be non-negative.";
    if (collectedWastes.length === 0) return "Add at least one collected waste type.";
    if (evidencePhotos.length === 0) return "Please add evidence photos of the cleanup.";
    return null;
  };

  const closeEvent = async () => {
    setErrorMsg(null);
    const error = validate();
    if (error) {
      setErrorMsg(error);
      if (!isWeb) Alert.alert("Check your form", error);
      return;
    }
    try {
      setClosing(true);
      const eventRef = doc(db, "events", event.id);
      await updateDoc(eventRef, {
        actualParticipants,
        collectedWastes,
        evidencePhotos,
        notes: notes.trim(),
        status: "completed",
        updatedAt: serverTimestamp(),
      });
      onClosed();
    } catch (e: any) {
      const msg = e?.message ?? "Failed to close event.";
      setErrorMsg(msg);
      if (!isWeb) Alert.alert("Close failed", msg);
      console.error("[CloseEventForm] error:", e);
    } finally {
      setClosing(false);
    }
  };

  const btnAnim = usePressScale();

  return (
    <View className="flex-1 bg-gradient-to-b from-green-50 to-blue-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <View className="items-center mb-6">
          <View className="bg-white rounded-3xl px-6 py-4 shadow-lg mb-2">
            <Text className="text-3xl font-bold text-gray-900 text-center">Close Event</Text>
            <Text className="text-lg font-semibold text-gray-600 text-center mt-1">{event.title}</Text>
          </View>
          <Text className="text-gray-600 text-center font-medium">Document your amazing work! 📊</Text>
        </View>

        {errorMsg ? (
          <View className="mb-6 px-6 py-4 rounded-2xl bg-red-50 border-2 border-red-200">
            <Text className="text-red-700 font-bold text-lg">Almost there! 🚨</Text>
            <Text className="text-red-700 mt-1 font-medium">{errorMsg}</Text>
          </View>
        ) : null}

        {/* Evidence Photos */}
        <Section title="📸 Evidence Photos" color="green">
          <View className="p-4">
            <ImageUploader
              images={evidencePhotos}
              onImagesChange={setEvidencePhotos}
              maxImages={10}
              title=""
              color="green"
            />
            <Text className="text-gray-600 text-sm mt-2">
              Show the impact! Upload before/after photos and cleanup evidence.
            </Text>
          </View>
        </Section>

        {/* Actual Participants */}
        <Section title="👥 Actual Participants" color="blue">
          <View className="px-4 py-4">
            <Stepper value={actualParticipants} setValue={setActualParticipants} min={0} max={1000} color="blue" />
          </View>
        </Section>

        {/* Collected Wastes */}
        <Section title="🗑️ Collected Wastes" color="orange">
          <View className="p-4">
            {collectedWastes.map((waste, i) => (
              <View key={i} className="flex-row justify-between items-center bg-orange-50 p-3 rounded-xl mb-2">
                <Text className="font-semibold text-gray-800">{waste.type}: {waste.weight} kg</Text>
                <Pressable onPress={() => removeWaste(i)} className="p-1">
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </View>
            ))}
            <View className="flex-row mt-3">
              <TextInput
                value={newWasteType}
                onChangeText={setNewWasteType}
                placeholder="Waste Type"
                className="flex-1 px-4 py-3 border-2 border-orange-200 rounded-xl mr-2"
              />
              <TextInput
                value={newWasteWeight.toString()}
                onChangeText={(t) => setNewWasteWeight(parseFloat(t) || 0)}
                placeholder="Weight"
                keyboardType="numeric"
                className="w-24 px-4 py-3 border-2 border-orange-200 rounded-xl"
              />
            </View>
            <Pressable onPress={addWaste} className="bg-orange-500 rounded-xl py-3 items-center mt-2 shadow-lg">
              <Text className="text-white font-bold">Add Waste</Text>
            </Pressable>
          </View>
        </Section>

        {/* Additional Notes */}
        <Section title="📝 Additional Notes" color="purple">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Share highlights, challenges, or special moments from the event..."
            className="px-4 py-4 text-base"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor="#9ca3af"
          />
        </Section>

        {/* Actions */}
        <View className="flex-row mt-6 mb-8">
          <Pressable 
            onPress={onCancel} 
            className="flex-1 mr-4 rounded-2xl py-5 items-center bg-gradient-to-r from-gray-400 to-gray-500 shadow-lg"
          >
            <Text className="text-white font-bold text-lg">Cancel</Text>
          </Pressable>
          <Animated.View style={{ flex: 1, transform: [{ scale: btnAnim.scale }] }}>
            <Pressable
              onPressIn={btnAnim.onPressIn}
              onPressOut={btnAnim.onPressOut}
              onPress={closeEvent}
              disabled={closing}
              className={`rounded-2xl py-5 items-center shadow-xl ${
                closing 
                  ? "bg-gradient-to-r from-green-400 to-blue-400" 
                  : "bg-gradient-to-r from-green-500 to-blue-600"
              }`}
            >
              {closing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-bold text-lg">✅ Submit Report</Text>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* My Events List + Create New Event Button                          */
/* ------------------------------------------------------------------ */
export default function OrgEvents() {
  const { user } = useAuth();

  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const addBtnAnim = usePressScale();

  // Live events subscription
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const all: EventDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const mine = user ? all.filter((e) => e.organizerId === user.uid) : all;
        setEvents(mine);
        setLoading(false);
      },
      (err) => {
        console.error("[EventsList] snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  const filtered = events.filter((ev) =>
    ev.title?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedEvent = showCloseForm ? events.find((e) => e.id === showCloseForm) : null;

  if (showForm) {
    return (
      <CreateEventForm
        onCancel={() => setShowForm(false)}
        onPublished={() => {
          setShowForm(false);
          setInfoMsg("🎉 Event created successfully!");
          setTimeout(() => setInfoMsg(null), 4000);
        }}
      />
    );
  }

  if (showCloseForm && selectedEvent) {
    return (
      <CloseEventForm
        event={selectedEvent}
        onCancel={() => setShowCloseForm(null)}
        onClosed={() => {
          setShowCloseForm(null);
          setInfoMsg("✅ Event closed successfully! Great work!");
          setTimeout(() => setInfoMsg(null), 4000);
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* FIXED: Enhanced Header - Removed transparency */}
      <View className="px-6 pt-12 pb-6 bg-gradient-to-r from-blue-600 to-purple-600 shadow-2xl">
        <Row className="justify-between items-center mb-6">
          <View>
            <Text className="text-3xl font-bold text-white">My Events</Text>
            <Text className="text-blue-100 font-medium mt-1">Manage your cleanup events</Text>
          </View>
          <Pressable 
            onPress={() => Alert.alert("Notifications", "No notifications yet.")}
            className="bg-white/10 p-3 rounded-2xl border border-white/20"
          >
            <Ionicons name="notifications-outline" size={24} color="white" />
          </Pressable>
        </Row>

        {/* FIXED: Enhanced Search Bar - Solid background */}
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-lg">
          <Ionicons name="search-outline" size={20} color="#6b7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search your events..."
            placeholderTextColor="#9ca3af"
            className="ml-3 flex-1 text-gray-800 font-medium text-base"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {infoMsg ? (
          <View className="mb-6 px-6 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-blue-500 shadow-xl">
            <Text className="text-white font-bold text-lg text-center">{infoMsg}</Text>
          </View>
        ) : null}

        {loading ? (
          <View className="py-16 items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-gray-600 mt-4 font-medium text-lg">Loading your events...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View className="py-16 items-center">
            <View className="bg-white rounded-3xl p-8 shadow-2xl items-center">
              <Ionicons name="calendar-outline" size={48} color="#3b82f6" />
              <Text className="text-gray-800 font-bold text-xl mt-4">No events yet</Text>
              <Text className="text-gray-600 text-center mt-2 font-medium">
                {search ? "No events match your search." : "Tap the + button to create your first event!"}
              </Text>
            </View>
          </View>
        ) : (
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-gray-700 font-bold text-lg">
                {filtered.length} event{filtered.length !== 1 ? 's' : ''} found
              </Text>
              <View className="bg-white rounded-full px-3 py-1 shadow-sm">
                <Text className="text-gray-600 font-medium">Total: {events.length}</Text>
              </View>
            </View>
            {filtered.map((ev) => (
              <EventCard
                key={ev.id}
                ev={ev}
                onClosePress={() => setShowCloseForm(ev.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Enhanced Floating Add Button */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: 30,
          right: 25,
          transform: [{ scale: addBtnAnim.scale }],
        }}
      >
        <Pressable
          onPressIn={addBtnAnim.onPressIn}
          onPressOut={addBtnAnim.onPressOut}
          onPress={() => setShowForm(true)}
          className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-2xl items-center justify-center border-4 border-white"
        >
          <Ionicons name="add" size={32} color="white" />
        </Pressable>
      </Animated.View>
    </View>
  );
}