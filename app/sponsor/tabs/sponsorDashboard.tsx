import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query, Timestamp, where } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Pressable, ScrollView, Text, View } from "react-native";

// Event type
type EventDoc = {
  id: string;
  title: string;
  description: string;
  eventAt?: Timestamp;
  location?: { label?: string };
  sponsorshipRequired?: boolean;
  fundingGoal?: number;
  currentFunding?: number;
  image?: string;
  goal?: string;
};

// Helpers
function tsToDate(ts?: Timestamp) {
  if (!ts) return null;
  try {
    return ts.toDate();
  } catch {
    return null;
  }
}
function formatDate(d?: Date | null) {
  if (!d) return "TBA";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Press animation hook
function usePressScale(initial = 1) {
  const scale = useRef(new Animated.Value(initial)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return { scale, onPressIn, onPressOut };
}

// Individual Event Card
function EventCard({ ev }: { ev: EventDoc }) {
  const { user } = useAuth();
  const router = useRouter();
  const d = tsToDate(ev.eventAt);
  const dateStr = formatDate(d);
  const sponsorAnim = usePressScale();

  const handleSponsor = () => {
    if (!user) {
      Alert.alert("Authentication Required", "Please sign in to sponsor this event.");
      return;
    }
    router.push({ pathname: "/sponsor/tabs/EventDetails", params: { eventId: ev.id } });
  };

  return (
    <View className="mb-5 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <View className="p-6 pb-4 bg-gradient-to-r from-teal-50 to-white">
        <Text className="text-xl font-bold text-teal-700 mb-2">{ev.title}</Text>
        <View className="flex-row items-center">
          <Ionicons name="calendar-outline" size={16} color="#4FB7B3" />
          <Text className="text-teal-700 font-medium ml-2">{dateStr}</Text>
        </View>
      </View>
      <View className="px-6 py-4">
        {ev.location?.label && (
          <View className="flex-row items-center mb-2.5">
            <View className="w-8 h-8 bg-teal-100 rounded-full items-center justify-center">
              <Ionicons name="location-outline" size={16} color="#3b82f6" />
            </View>
            <Text className="text-teal-700 ml-3 flex-1 font-medium">{ev.location.label}</Text>
          </View>
        )}
        {ev.description && (
          <View className="mt-2 pt-2 border-t border-gray-100">
            <Text className="text-gray-600 leading-6" numberOfLines={3}>
              {ev.description}
            </Text>
          </View>
        )}
        {ev.sponsorshipRequired && (
          <View className="mt-3 flex-row items-center">
            <View className="w-2 h-2 bg-teal-500 rounded-full mr-2" />
            <Text className="text-teal-700 text-sm font-medium">Sponsorship available</Text>
          </View>
        )}
      </View>
      <View className="p-6 pt-0">
        <Animated.View style={{ transform: [{ scale: sponsorAnim.scale }] }}>
          <Pressable
            onPress={handleSponsor}
            onPressIn={sponsorAnim.onPressIn}
            onPressOut={sponsorAnim.onPressOut}
            className="bg-teal-600 rounded-xl py-4 items-center shadow-md"
          >
            <Text className="text-white font-bold text-base">Sponsor Now</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// Main Sponsor Dashboard
export default function SponsorDashboard() {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "events"), where("sponsorshipRequired", "==", true));
    const unsub = onSnapshot(q, (snap) => {
      const all: EventDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setEvents(all);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-3xl font-extrabold text-teal-600 mb-6">Sponsor Dashboard</Text>
      {loading ? (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#4FB7B3" />
          <Text className="text-teal-700 mt-4 font-medium">Loading events...</Text>
        </View>
      ) : events.length === 0 ? (
        <View className="flex-1 justify-center items-center py-20">
          <Ionicons name="calendar-outline" size={48} color="#4FB7B3" />
          <Text className="text-2xl font-bold text-teal-700 mt-4 mb-2">No Events Available</Text>
          <Text className="text-teal-600 text-center max-w-sm leading-6">
            There are currently no sponsorship events. Check back soon for new opportunities.
          </Text>
        </View>
      ) : (
        events.map((ev) => <EventCard key={ev.id} ev={ev} />)
      )}
    </ScrollView>
  );
}