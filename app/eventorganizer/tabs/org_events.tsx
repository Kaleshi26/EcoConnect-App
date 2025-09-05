// app/eventorganizer/tabs/org_events.tsx
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

import { useAuth } from "../../../contexts/AuthContext";
import { db } from "../../../services/firebaseConfig";

type Coords = { latitude: number; longitude: number };

const WASTE_OPTIONS = [
  "Plastic Bottles",
  "Plastic Bags",
  "Fishing Gear",
  "Glass",
  "Cans",
  "Other",
];

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
        selected ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"
      }`}
      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
    >
      <Text className={selected ? "text-white font-medium" : "text-gray-700 font-medium"}>
        {label}
      </Text>
    </Pressable>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View className="flex-row items-center">{children}</View>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-gray-900 text-base font-semibold mb-2">{title}</Text>
      <View className="bg-white rounded-xl border border-gray-200 shadow-sm p-1">
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-3"
    >
      <Row>
        <Ionicons name={icon} size={18} color="#4b5563" />
        <Text className="ml-2 text-gray-700">{label}</Text>
      </Row>
      <Row>
        {value ? (
          <Text className="mr-2 text-gray-900 font-medium">{value}</Text>
        ) : (
          <Text className="mr-2 text-gray-400">Select</Text>
        )}
        <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
      </Row>
    </Pressable>
  );
}

function Stepper({
  value,
  setValue,
  min = 1,
  max = 1000,
}: {
  value: number;
  setValue: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <Row>
      <Pressable
        onPress={() => setValue(Math.max(min, value - 1))}
        className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center"
      >
        <Ionicons name="remove" size={18} color="#374151" />
      </Pressable>
      <Text className="mx-4 text-lg font-semibold">{value}</Text>
      <Pressable
        onPress={() => setValue(Math.min(max, value + 1))}
        className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center"
      >
        <Ionicons name="add" size={18} color="#374151" />
      </Pressable>
    </Row>
  );
}

function formatDate(d?: Date | null) {
  if (!d) return undefined;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function formatTime(d?: Date | null) {
  if (!d) return undefined;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function combineDateTime(date?: Date | null, time?: Date | null): Date | null {
  if (!date || !time) return null;
  const combined = new Date(date);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined;
}

function MapPickerModal({
  visible,
  onClose,
  onConfirm,
  initialCoords,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (coords: Coords, addressText: string) => void;
  initialCoords?: Coords | null;
}) {
  const [marker, setMarker] = useState<Coords | null>(initialCoords ?? null);
  const [region, setRegion] = useState<Region>({
    latitude: initialCoords?.latitude ?? 37.78825,
    longitude: initialCoords?.longitude ?? -122.4324,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [loadingLoc, setLoadingLoc] = useState(false);

  const useCurrentLocation = async () => {
    try {
      setLoadingLoc(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Location permission is needed.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setMarker(coords);
      setRegion({ ...region, ...coords });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not get current location.");
    } finally {
      setLoadingLoc(false);
    }
  };

  const confirm = async () => {
    if (!marker) {
      Alert.alert("Pick a location", "Tap on the map to drop a pin.");
      return;
    }
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: marker.latitude,
        longitude: marker.longitude,
      });
      const a = addresses?.[0];
      const line = [a?.name, a?.street, a?.city, a?.region, a?.country].filter(Boolean).join(", ");
      onConfirm(marker, line || "Selected Location");
      onClose();
    } catch {
      onConfirm(marker, "Selected Location");
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        <View className="px-4 py-3 border-b border-gray-200 flex-row items-center justify-between">
          <Pressable onPress={onClose} className="px-2 py-1">
            <Ionicons name="close" size={22} color="#374151" />
          </Pressable>
          <Text className="text-base font-semibold">Pick Location</Text>
          <Pressable onPress={useCurrentLocation} className="px-2 py-1 flex-row items-center">
            {loadingLoc ? (
              <ActivityIndicator />
            ) : (
              <>
                <Ionicons name="locate" size={18} color="#2563eb" />
                <Text className="ml-1 text-blue-600 font-medium">Use current</Text>
              </>
            )}
          </Pressable>
        </View>

        <MapView
          provider={Platform.OS === "ios" ? undefined : PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={(e) => setMarker(e.nativeEvent.coordinate as Coords)} // FIX: tap instead of long-press
        >
          {marker && (
            <Marker
              coordinate={marker}
              draggable
              onDragEnd={(e) => setMarker(e.nativeEvent.coordinate as Coords)}
            />
          )}
        </MapView>

        <View className="p-4 border-t border-gray-200">
          <Pressable
            onPress={confirm}
            className="bg-blue-600 rounded-xl py-3 items-center"
          >
            <Text className="text-white font-semibold">Confirm Location</Text>
          </Pressable>
          <Text className="text-gray-500 mt-2 text-center">
            Tip: tap on the map to drop a pin.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

export default function OrgEvents() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | null>(new Date());
  const [time, setTime] = useState<Date | null>(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const [description, setDescription] = useState("");
  const [wasteTypes, setWasteTypes] = useState<string[]>([]);

  const [volunteers, setVolunteers] = useState(20);
  const [sponsorshipRequired, setSponsorshipRequired] = useState(false);
  const [resourcesNeeded, setResourcesNeeded] = useState("");

  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationText, setLocationText] = useState("");
  const [mapVisible, setMapVisible] = useState(false);

  const [publishing, setPublishing] = useState(false);

  const combinedDate = useMemo(() => combineDateTime(date, time), [date, time]);

  const toggleWaste = (w: string) =>
    setWasteTypes((prev) =>
      prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]
    );

  const openMap = () => setMapVisible(true);

  const useCurrentLocationInline = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Location permission is needed.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCoords(c);
      const addresses = await Location.reverseGeocodeAsync(c);
      const a = addresses?.[0];
      const line = [a?.name, a?.street, a?.city, a?.region, a?.country].filter(Boolean).join(", ");
      setLocationText(line || "Current Location");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not get current location.");
    }
  };

  const validate = () => {
    if (!title.trim()) return "Please enter an event title.";
    if (!combinedDate) return "Please select date and time.";
    if (combinedDate.getTime() < Date.now()) return "Event time must be in the future.";
    if (!coords) return "Please set a location.";
    if (description.trim().length < 10) return "Description should be at least 10 characters.";
    return null;
  };

  const publish = async () => {
    const error = validate();
    if (error) {
      Alert.alert("Check your form", error);
      return;
    }
    if (!user) {
      Alert.alert("Not signed in", "Please log in again.");
      return;
    }
    try {
      setPublishing(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        eventAt: Timestamp.fromDate(combinedDate!), 
        location: {
          label: locationText || "Selected Location",
          latitude: coords!.latitude,
          longitude: coords!.longitude,
        },
        wasteTypes,
        volunteersNeeded: volunteers,
        sponsorshipRequired,
        resourcesNeeded: sponsorshipRequired ? resourcesNeeded.trim() : "",
        organizerId: user.uid,
        organizerRole: profile?.role ?? "organizer",
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(collection(db, "events"), payload);
      Alert.alert("Event published", "Your event is now live.", [{ text: "OK" }]);

      setTitle("");
      setDescription("");
      setWasteTypes([]);
      setVolunteers(20);
      setSponsorshipRequired(false);
      setResourcesNeeded("");
      setCoords(null);
      setLocationText("");
      setDate(new Date());
      setTime(new Date());
    } catch (e: any) {
      Alert.alert("Publish failed", e?.message ?? "Something went wrong.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View className="flex-1 bg-gradient-to-b from-blue-50 to-cyan-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mt-6 mb-4">
          <Text className="text-2xl font-bold text-gray-900 text-center">Create New Event</Text>
          <Text className="text-gray-500 text-center">Event Organizer</Text>
        </View>

        {/* Event Title */}
        <Section title="Event Title">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Beach Cleanup Day"
            className="px-4 py-3 text-base"
            maxLength={80}
          />
        </Section>

        {/* Date + Time */}
        <Section title="Date & Time">
          <View className="divide-y divide-gray-200">
            <FieldButton
              icon="calendar-outline"
              label="Date"
              value={formatDate(date)}
              onPress={() => setShowDate(true)}
            />
            <View className="h-[1px] bg-gray-200" />
            <FieldButton
              icon="time-outline"
              label="Time"
              value={formatTime(time)}
              onPress={() => setShowTime(true)}
            />
          </View>
          {showDate && (
            <DateTimePicker
              mode="date"
              value={date || new Date()}
              onChange={(_, d) => {
                setShowDate(Platform.OS === "ios");
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
                setShowTime(Platform.OS === "ios");
                if (d) setTime(d);
              }}
              display={Platform.OS === "ios" ? "spinner" : "default"}
            />
          )}
        </Section>

        {/* Location */}
        <Section title="Location">
          <View className="divide-y divide-gray-200">
            <FieldButton
              icon="location-outline"
              label="Pick on Map"
              value={locationText || (coords ? "Pinned" : undefined)}
              onPress={openMap}
            />
            <View className="h-[1px] bg-gray-200" />
            <Pressable
              onPress={useCurrentLocationInline}
              className="flex-row items-center justify-between px-4 py-3"
            >
              <Row>
                <Ionicons name="locate-outline" size={18} color="#4b5563" />
                <Text className="ml-2 text-gray-700">Use Current Location</Text>
              </Row>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </Pressable>
            {coords && (
              <View className="p-3">
                <View className="rounded-xl overflow-hidden border border-gray-200 h-40">
                  <MapView
                    pointerEvents="none"
                    style={{ flex: 1 }}
                    initialRegion={{
                      latitude: coords.latitude,
                      longitude: coords.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                  >
                    <Marker coordinate={coords} />
                  </MapView>
                </View>
                {!!locationText && (
                  <Text className="text-gray-600 mt-2 text-sm">{locationText}</Text>
                )}
              </View>
            )}
          </View>
        </Section>

        {/* Description */}
        <Section title="Description">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the meetup point, tools to bring, safety info..."
            className="px-4 py-3 text-base"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Section>

        {/* Waste Types */}
        <Section title="Waste Types Expected">
          <View className="flex-row flex-wrap px-3 py-3">
            {WASTE_OPTIONS.map((w) => (
              <Chip key={w} label={w} selected={wasteTypes.includes(w)} onPress={() => toggleWaste(w)} />
            ))}
          </View>
        </Section>

        {/* Volunteers */}
        <Section title="Number of Volunteers Needed">
          <View className="px-4 py-3 flex-row items-center justify-between">
            <Stepper value={volunteers} setValue={setVolunteers} min={1} max={1000} />
            {/* Optional switch to allow extra volunteers; using as a visual toggle only */}
            {/* <Row>
              <Text className="mr-2 text-gray-700">Flexible</Text>
              <Switch value={flexible} onValueChange={setFlexible} />
            </Row> */}
          </View>
        </Section>

        {/* Sponsorship */}
        <Section title="Sponsorship Required">
          <View className="px-4 py-3">
            <Row>
              <Text className="text-gray-700 mr-3">Require sponsors</Text>
              <Switch
                value={sponsorshipRequired}
                onValueChange={setSponsorshipRequired}
              />
            </Row>
            {sponsorshipRequired && (
              <View className="mt-3">
                <Text className="text-gray-500 mb-1">Resources Needed</Text>
                <TextInput
                  value={resourcesNeeded}
                  onChangeText={setResourcesNeeded}
                  placeholder="e.g., gloves, trash bags, refreshments"
                  className="px-4 py-3 text-base border border-gray-200 rounded-lg"
                />
              </View>
            )}
          </View>
        </Section>

        {/* Publish */}
        <Pressable
          onPress={publish}
          disabled={publishing}
          className={`mt-2 rounded-xl py-4 items-center ${
            publishing ? "bg-blue-400" : "bg-blue-600"
          }`}
        >
          {publishing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Publish Event</Text>
          )}
        </Pressable>

        <View className="h-10" />
      </ScrollView>

      {/* Map Picker Modal */}
      <MapPickerModal
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
        initialCoords={coords}
        onConfirm={(c, label) => {
          setCoords(c);
          setLocationText(label);
        }}
      />
    </View>
  );
}