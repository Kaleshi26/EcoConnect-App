import { Ionicons } from "@expo/vector-icons";
import { addDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Alert, Animated, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebaseConfig";
import { Timestamp } from "firebase/firestore";

// Reuse type from org_events.tsx
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

// Reuse helpers from org_events.tsx
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

// Clean Row component
function Row({ children }: { children: React.ReactNode }) {
  return <View className="flex-row items-center mb-2.5">{children}</View>;
}

// Custom hook for press animations
function usePressScale(initial = 1) {
  const scale = useRef(new Animated.Value(initial)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return { scale, onPressIn, onPressOut };
}

// Professional EventCard with blue-gray theme
function EventCard({ ev }: { ev: EventDoc }) {
  const { user } = useAuth();
  const d = tsToDate(ev.eventAt);
  const dateStr = d ? `${formatDate(d)} • ${formatTime(d)}` : "Date TBD";
  const registerAnim = usePressScale();
  const viewInfoAnim = usePressScale();

  const handleRegister = async () => {
    if (!user) {
      Alert.alert("Authentication Required", "Please sign in to register for events.");
      return;
    }
    try {
      await addDoc(collection(db, `events/${ev.id}/registrations`), {
        userId: user.uid,
        registeredAt: Timestamp.fromDate(new Date()),
      });
      Alert.alert("Registration Successful", "You have been registered for this event!");
    } catch (e: any) {
      console.error("[EventCard] Registration error:", e);
      Alert.alert("Registration Failed", "Unable to register for this event. Please try again.");
    }
  };

  const handleViewInfo = () => {
    const details = [
      `Event: ${ev.title}`,
      `Date & Time: ${dateStr}`,
      ev.location?.label ? `Location: ${ev.location.label}` : "",
      `Volunteers Needed: ${ev.volunteersNeeded ?? 0}`,
      ev.wasteTypes?.length ? `Focus Areas: ${ev.wasteTypes.join(", ")}` : "",
      `\nDescription:\n${ev.description}`,
      ev.sponsorshipRequired ? "\n• Sponsorship opportunities available" : "",
    ].filter(Boolean).join("\n");
    Alert.alert("Event Information", details);
  };

  return (
    <View className="mb-5 bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
      {/* Header Section */}
      <View className="p-6 pb-4 bg-gradient-to-r from-blue-50 to-slate-50">
        <Text className="text-xl font-bold text-slate-800 mb-2">{ev.title}</Text>
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={16} color="#475569" />
          <Text className="text-slate-600 font-medium ml-2">{dateStr}</Text>
        </View>
      </View>

      {/* Event Details Section */}
      <View className="px-6 py-4">
        {!!ev.location?.label && (
          <Row>
            <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center">
              <Ionicons name="location-outline" size={16} color="#3b82f6" />
            </View>
            <Text className="text-slate-700 ml-3 flex-1 font-medium">{ev.location.label}</Text>
          </Row>
        )}
        
        <Row>
          <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center">
            <Ionicons name="people-outline" size={16} color="#3b82f6" />
          </View>
          <Text className="text-slate-700 ml-3 font-medium">{ev.volunteersNeeded ?? 0} volunteers needed</Text>
        </Row>

        {/* Waste Types Tags */}
        {!!ev.wasteTypes?.length && (
          <View className="mt-4">
            <Text className="text-slate-600 font-medium mb-2 text-sm">Focus Areas:</Text>
            <View className="flex-row flex-wrap">
              {ev.wasteTypes.slice(0, 4).map((w) => (
                <View key={w} className="px-3 py-2 mr-2 mb-2 rounded-full bg-blue-50 border border-blue-200">
                  <Text className="text-blue-700 text-sm font-medium">{w}</Text>
                </View>
              ))}
              {ev.wasteTypes.length > 4 && (
                <View className="px-3 py-2 rounded-full bg-slate-100 border border-slate-200">
                  <Text className="text-slate-600 text-sm font-medium">+{ev.wasteTypes.length - 4} more</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Description Preview */}
        {ev.description && (
          <View className="mt-4 pt-4 border-t border-blue-100">
            <Text className="text-slate-600 leading-6" numberOfLines={3}>
              {ev.description}
            </Text>
          </View>
        )}

        {/* Sponsorship Badge */}
        {ev.sponsorshipRequired && (
          <View className="mt-3 flex-row items-center">
            <View className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
            <Text className="text-blue-700 text-sm font-medium">Sponsorship opportunities available</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View className="p-6 pt-0">
        <View className="flex-row space-x-3">
          <Animated.View style={{ flex: 1, transform: [{ scale: registerAnim.scale }] }}>
            <Pressable
              onPress={handleRegister}
              onPressIn={registerAnim.onPressIn}
              onPressOut={registerAnim.onPressOut}
              className="bg-blue-600 rounded-xl py-4 items-center mr-1.5 shadow-md"
            >
              <Text className="text-white font-bold text-base">Register</Text>
            </Pressable>
          </Animated.View>
          <Animated.View style={{ flex: 1, transform: [{ scale: viewInfoAnim.scale }] }}>
            <Pressable
              onPress={handleViewInfo}
              onPressIn={viewInfoAnim.onPressIn}
              onPressOut={viewInfoAnim.onPressOut}
              className="bg-slate-100 border border-slate-200 rounded-xl py-4 items-center ml-1.5"
            >
              <Text className="text-slate-700 font-bold text-base">Details</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

export default function VolEvent() {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch events
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "events"), where("status", "==", "open"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const all: EventDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setEvents(all);
        setFilteredEvents(all);
        setLoading(false);
      },
      (err) => {
        console.error("[VolEvent] Snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Enhanced filter with multiple search criteria
  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();
    if (!lowerQuery) {
      setFilteredEvents(events);
      return;
    }
    const filtered = events.filter(
      (ev) =>
        ev.title.toLowerCase().includes(lowerQuery) ||
        (ev.location?.label?.toLowerCase() || "").includes(lowerQuery) ||
        ev.description.toLowerCase().includes(lowerQuery) ||
        (ev.wasteTypes || []).some(type => type.toLowerCase().includes(lowerQuery))
    );
    setFilteredEvents(filtered);
  }, [searchQuery, events]);

  // Animation for header
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerTranslate, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <Animated.View
        style={{ 
          opacity: headerOpacity, 
          transform: [{ translateY: headerTranslate }] 
        }}
        className="bg-gradient-to-r from-blue-600 to-slate-700"
      >
        <View className="px-6 pt-5 pb-1">
          
          {/* Search Bar */}
          <View className="flex-row items-center bg-white rounded-2xl px-5 py-4 shadow-lg">
            <Ionicons name="search" size={22} color="#64748b" />
            <TextInput
              className="flex-1 mx-3 text-base text-slate-800"
              placeholder="Search events, locations, or focus areas..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={clearSearch}
                className="p-1"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={22} color="#94a3b8" />
              </Pressable>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ 
          padding: 20, 
          paddingBottom: 100 
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-slate-600 mt-4 font-medium">Loading events...</Text>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-6">
              <Ionicons 
                name={searchQuery ? "search-outline" : "calendar-outline"} 
                size={32} 
                color="#3b82f6" 
              />
            </View>
            <Text className="text-2xl font-bold text-slate-800 mb-3">
              {searchQuery ? "No Events Found" : "No Events Available"}
            </Text>
            <Text className="text-slate-600 text-center max-w-sm leading-6 mb-6">
              {searchQuery
                ? `No events match "${searchQuery}". Try adjusting your search terms.`
                : "There are currently no open volunteer events. Check back soon for new opportunities to make a difference."}
            </Text>
            {searchQuery && (
              <Pressable
                onPress={clearSearch}
                className="bg-blue-600 px-6 py-3 rounded-xl shadow-md"
              >
                <Text className="text-white font-bold">Clear Search</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View>
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-slate-700 font-bold text-lg">
                  {filteredEvents.length} {filteredEvents.length === 1 ? 'Event' : 'Events'} 
                  {searchQuery ? ` Found` : ` Available`}
                </Text>
                <Text className="text-slate-500 text-sm">
                  Ready for registration
                </Text>
              </View>
              {searchQuery && (
                <Pressable
                  onPress={clearSearch}
                  className="bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl"
                >
                  <Text className="text-slate-700 font-medium">Clear</Text>
                </Pressable>
              )}
            </View>
            {filteredEvents.map((ev) => (
              <EventCard key={ev.id} ev={ev} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}