// app/eventorganizer/tabs/org_events.tsx
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../../../contexts/AuthContext";
import { db } from "../../../services/firebaseConfig";

// Helpers
const isWeb = Platform.OS === "web";
type IconName = React.ComponentProps<typeof Ionicons>["name"];

type EventDoc = {
  id: string;
  title: string;
  description: string;
  eventAt?: Timestamp;
  location?: { label?: string };
  wasteTypes?: string[];
  volunteersNeeded?: number;
  sponsorshipRequired?: boolean;
  organizerId?: string;
  createdAt?: Timestamp;
};

// Small UI helpers
function Row({ children }: { children: React.ReactNode }) {
  return <View className="flex-row items-center">{children}</View>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-gray-900 text-base font-semibold mb-2">{title}</Text>
      <View className="bg-white rounded-xl border border-gray-200 shadow-sm p-1">{children}</View>
    </View>
  );
}
function FieldButton({
  icon,
  label,
  value,
  onPress,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between px-4 py-3">
      <Row>
        <Ionicons name={icon} size={18} color="#4b5563" />
        <Text className="ml-2 text-gray-700">{label}</Text>
      </Row>
      <Row>
        <Text className={`mr-2 ${value ? "text-gray-900" : "text-gray-400"} font-medium`}>
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
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
        selected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
      }`}
      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
    >
      <Text className={selected ? "text-white font-medium" : "text-gray-700 font-medium"}>
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
function usePressScale(initial = 1) {
  const scale = useRef(new Animated.Value(initial)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return { scale, onPressIn, onPressOut };
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

// List item
function EventCard({ ev }: { ev: EventDoc }) {
  const d = tsToDate(ev.eventAt);
  const dateStr = d ? `${formatDate(d)} • ${formatTime(d)}` : "No date";
  return (
    <View className="mb-3 bg-white border border-gray-200 rounded-xl p-4">
      <Text className="text-lg font-semibold text-gray-900">{ev.title}</Text>
      <Text className="text-gray-500 mt-1">{dateStr}</Text>
      {!!ev.location?.label && (
        <Row>
          <Ionicons name="location-outline" size={16} color="#6b7280" />
          <Text className="text-gray-700 ml-1">{ev.location.label}</Text>
        </Row>
      )}
      <Row>
        <Ionicons name="people-outline" size={16} color="#6b7280" />
        <Text className="text-gray-700 ml-1">{ev.volunteersNeeded ?? 0} volunteers</Text>
      </Row>
      {!!ev.wasteTypes?.length && (
        <View className="flex-row flex-wrap mt-2">
          {ev.wasteTypes.slice(0, 3).map((w) => (
            <View key={w} className="px-2 py-1 mr-2 mb-2 rounded-full bg-blue-50 border border-blue-200">
              <Text className="text-blue-700 text-xs">{w}</Text>
            </View>
          ))}
          {ev.wasteTypes.length > 3 && (
            <View className="px-2 py-1 rounded-full bg-gray-100 border border-gray-200">
              <Text className="text-gray-600 text-xs">+{ev.wasteTypes.length - 3} more</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Create Event Form (manual location, web-safe date/time)             */
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

  const [date, setDate] = useState<Date | null>(new Date());
  const [time, setTime] = useState<Date | null>(new Date());
  const [showDate, setShowDate] = useState(false); // native only
  const [showTime, setShowTime] = useState(false); // native only
  const combinedDate = useMemo(() => combineDateTime(date, time), [date, time]);

  const [locationLabel, setLocationLabel] = useState("");
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
    if (description.trim().length < 10) return "Description should be at least 10 characters.";
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
        location: { label: locationLabel.trim() },
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
      };
      await addDoc(collection(db, "events"), payload);

      // Close form, show list (snapshot will bring the new event)
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
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
        <Text className="text-2xl font-bold text-gray-900 text-center mt-6 mb-2">Create New Event</Text>
        <Text className="text-gray-500 text-center mb-4">Event Organizer</Text>

        {errorMsg ? (
          <View className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <Text className="text-red-700 font-medium">Error</Text>
            <Text className="text-red-700 mt-1">{errorMsg}</Text>
          </View>
        ) : null}

        {/* Title */}
        <Section title="Event Title">
          <TextInput value={title} onChangeText={setTitle} placeholder="Beach Cleanup Day" className="px-4 py-3 text-base" maxLength={80} />
        </Section>

        {/* Date & Time */}
        <Section title="Date & Time">
          {!isWeb ? (
            <>
              <FieldButton icon="calendar-outline" label="Date" value={formatDate(date)} onPress={() => setShowDate(true)} />
              <View className="h-[1px] bg-gray-200" />
              <FieldButton icon="time-outline" label="Time" value={formatTime(time)} onPress={() => setShowTime(true)} />
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
            <View className="px-4 py-3">
              <Text className="text-gray-700 mb-1">Date</Text>
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
                style={{ width: "100%", padding: 12, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, outline: "none" }}
              />
              <Text className="text-gray-700 mb-1 mt-4">Time</Text>
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
                style={{ width: "100%", padding: 12, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, outline: "none" }}
              />
            </View>
          )}
        </Section>

        {/* Location */}
        <Section title="Location">
          <TextInput
            value={locationLabel}
            onChangeText={setLocationLabel}
            placeholder="Meeting point or address (required)"
            className="px-4 py-3 text-base"
          />
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
            {["Plastic Bottles", "Plastic Bags", "Fishing Gear", "Glass", "Cans", "Other"].map((w) => (
              <Chip key={w} label={w} selected={wasteTypes.includes(w)} onPress={() => toggleWaste(w)} />
            ))}
          </View>
        </Section>

        {/* Volunteers */}
        <Section title="Number of Volunteers Needed">
          <View className="px-4 py-3 flex-row items-center justify-between">
            <Stepper value={volunteers} setValue={setVolunteers} min={1} max={1000} />
          </View>
        </Section>

        {/* Sponsorship */}
        <Section title="Sponsorship Required">
          <View className="px-4 py-3">
            <Row>
              <Text className="text-gray-700 mr-3">Require sponsors</Text>
              <Switch value={sponsorshipRequired} onValueChange={setSponsorshipRequired} />
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

        {/* Actions */}
        <View className="flex-row mt-2">
          <Pressable onPress={onCancel} className="flex-1 mr-3 rounded-xl py-4 items-center bg-gray-200">
            <Text className="text-gray-800 font-semibold">Cancel</Text>
          </Pressable>

          <Animated.View style={{ flex: 1, transform: [{ scale: btnAnim.scale }] }}>
            <Pressable
              onPressIn={btnAnim.onPressIn}
              onPressOut={btnAnim.onPressOut}
              onPress={publish}
              disabled={publishing}
              className={`rounded-xl py-4 items-center ${publishing ? "bg-blue-400" : "bg-blue-600"}`}
              pointerEvents="auto"
            >
              {publishing ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Publish Event</Text>}
            </Pressable>
          </Animated.View>
        </View>

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* My Events List + Create New Event Button                            */
/* ------------------------------------------------------------------ */
export default function OrgEvents() {
  const { user } = useAuth();

  // Hooks must be called before any early return
  const addBtnAnim = usePressScale(); // moved BEFORE conditional return to avoid hook order mismatch

  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Header animation
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(headerTranslate, { toValue: 0, bounciness: 8, useNativeDriver: true }),
    ]).start();
  }, []);

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

  // Now it's safe to conditionally render
  if (showForm) {
    return (
      <CreateEventForm
        onCancel={() => setShowForm(false)}
        onPublished={() => {
          setShowForm(false);
          setInfoMsg("Event created successfully.");
          setTimeout(() => setInfoMsg(null), 3000);
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <Animated.View
          style={{ opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }}
          className="mt-6 mb-4"
        >
          <Text className="text-2xl font-bold text-gray-900 text-center">My Events</Text>
          <Text className="text-gray-500 text-center">Manage and create your clean-up events</Text>
        </Animated.View>

        {infoMsg ? (
          <View className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
            <Text className="text-green-800">{infoMsg}</Text>
          </View>
        ) : null}

        {/* Visible Create New Event button */}
        <Animated.View style={{ transform: [{ scale: addBtnAnim.scale }] }}>
          <Pressable
            onPressIn={addBtnAnim.onPressIn}
            onPressOut={addBtnAnim.onPressOut}
            onPress={() => setShowForm(true)}
            className="rounded-xl py-4 items-center bg-blue-600 mb-4"
            pointerEvents="auto"
            style={isWeb ? { cursor: "pointer" } : undefined}
          >
            <Row>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text className="text-white font-semibold ml-2">Create New Event</Text>
            </Row>
          </Pressable>
        </Animated.View>

        {/* List */}
        {loading ? (
          <View className="py-10 items-center">
            <ActivityIndicator />
            <Text className="text-gray-500 mt-2">Loading events...</Text>
          </View>
        ) : events.length === 0 ? (
          <View className="py-10 items-center">
            <Ionicons name="calendar-outline" size={24} color="#9ca3af" />
            <Text className="text-gray-600 mt-2">No events yet</Text>
            <Text className="text-gray-500">Tap “Create New Event” to get started.</Text>
          </View>
        ) : (
          <View>
            {events.map((ev) => (
              <EventCard key={ev.id} ev={ev} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}