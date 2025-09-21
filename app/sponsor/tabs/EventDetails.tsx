import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";

type EventDoc = {
  id: string;
  title: string;
  description: string;
  eventAt?: { seconds: number; nanoseconds: number };
  location?: { label?: string };
  sponsorshipRequired?: boolean;
  fundingGoal?: number;
  currentFunding?: number;
  image?: string;
  goal?: string;
  time?: string;
};

function tsToDate(ts?: { seconds: number; nanoseconds: number }) {
  if (!ts) return null;
  try {
    return new Date(ts.seconds * 1000);
  } catch {
    return null;
  }
}

function formatDate(d?: Date | null) {
  if (!d) return "TBA";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function EventDetails() {
  const { user } = useAuth();
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    const fetchEvent = async () => {
      try {
        const docRef = doc(db, "events", eventId as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEvent({ id: docSnap.id, ...(docSnap.data() as any) });
        }
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleSponsor = () => {
    if (!user) {
      Alert.alert("Authentication Required", "Please sign in to sponsor this event.");
      return;
    }
    router.push({ pathname: "/sponsor/tabs/SponsorForm", params: { eventId } });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4FB7B3" />
        <Text className="text-teal-700 mt-4 font-medium">Loading event...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <Text className="text-2xl font-bold text-teal-700">Event Not Found</Text>
      </View>
    );
  }

  const date = tsToDate(event.eventAt);
  const dateStr = formatDate(date);

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      <View className="flex-row items-center mb-4">
        <Pressable onPress={() => router.back()} className="mr-2">
          <Ionicons name="arrow-back" size={24} color="#4FB7B3" />
        </Pressable>
        <Text className="text-xl font-bold text-teal-700">Event Details</Text>
      </View>

      <View className="space-y-6">
        <View className="relative">
          <Image
            source={{ uri: event.image || "https://via.placeholder.com/300" }}
            className="w-full h-48 rounded-lg"
            resizeMode="cover"
          />
          <View
            className={`absolute top-3 right-3 px-2 py-1 rounded-full ${
              event.sponsorshipRequired ? "bg-green-500" : "bg-gray-500"
            }`}
          >
            <Text className="text-white text-sm font-medium">
              {event.sponsorshipRequired ? "Open for Sponsorship" : "Closed"}
            </Text>
          </View>
        </View>

        <View>
          <Text className="text-2xl font-bold text-teal-700 mb-3">{event.title}</Text>
          <View className="space-y-2">
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={16} color="#4FB7B3" />
              <Text className="text-gray-600 ml-2">{event.location?.label || "TBA"}</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color="#4FB7B3" />
              <Text className="text-gray-600 ml-2">{dateStr}</Text>
            </View>
            {event.time && (
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={16} color="#4FB7B3" />
                <Text className="text-gray-600 ml-2">{event.time}</Text>
              </View>
            )}
            {event.goal && (
              <View className="flex-row items-center">
                <Ionicons name="flag-outline" size={16} color="#4FB7B3" />
                <Text className="text-gray-600 ml-2">Target: {event.goal}</Text>
              </View>
            )}
          </View>
          <Text className="mt-4 text-gray-700">{event.description}</Text>
        </View>

        {event.fundingGoal && event.currentFunding !== undefined && (
          <View className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-gray-600">Funding Progress</Text>
              <Text className="text-sm text-teal-700">
                ₹{event.currentFunding.toLocaleString()} / ₹{event.fundingGoal.toLocaleString()}
              </Text>
            </View>
            <View className="w-full bg-gray-200 rounded-full h-2">
              <View
                className="bg-teal-600 h-2 rounded-full"
                style={{ width: `${(event.currentFunding / event.fundingGoal) * 100}%` }}
              />
            </View>
          </View>
        )}

        {event.sponsorshipRequired ? (
          <View className="space-y-4">
            <Pressable
              onPress={handleSponsor}
              className="bg-teal-600 rounded-xl py-4 items-center shadow-md"
            >
              <Text className="text-white font-bold text-base">Sponsor This Event</Text>
            </Pressable>
            <Text className="text-center text-sm text-gray-600">
              Join {Math.floor(Math.random() * 50) + 10}+ other sponsors making a difference
            </Text>
          </View>
        ) : (
          <View className="bg-gray-50 rounded-lg p-4">
            <Text className="text-center text-gray-600">This event is no longer accepting sponsorships</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}