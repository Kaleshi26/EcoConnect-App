import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { collection, doc, getDoc, getDocs, query, Timestamp, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";

type EventDoc = {
  id: string;
  title: string;
  eventAt?: Timestamp;
  location?: { label?: string };
  status?: "upcoming" | "ongoing" | "completed";
  wasteCollected?: number;
  image?: string;
};

type PledgeDoc = {
  id: string;
  eventId: string;
  amount?: number;
  purpose?: string;
  paymentMethod?: string;
  status?: string;
  createdAt?: Timestamp;
  showCompanyName?: boolean;
  isAnonymous?: boolean;
};

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

function formatCurrency(amount: number) {
  return `LKR ${amount.toLocaleString()}`;
}

export default function SponsorReports() {
  const { user } = useAuth();
  const [pledges, setPledges] = useState<PledgeDoc[]>([]);
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      setRefreshing(true);
      
      // Query pledges for the current user
      const pledgesQuery = query(collection(db, "pledges"), where("userId", "==", user.uid));
      const pledgesSnap = await getDocs(pledgesQuery);
      
      const pledgeData: PledgeDoc[] = pledgesSnap.docs.map((d) => ({ 
        id: d.id, 
        ...(d.data() as any) 
      }));
      
      setPledges(pledgeData);

      // Extract unique event IDs from pledges
      const eventIds = [...new Set(pledgeData.map((p) => p.eventId))];
      if (eventIds.length === 0) {
        setEvents([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch event details for each pledged event using getDoc
      const eventPromises = eventIds.map(async (id) => {
        try {
          const eventDoc = await getDoc(doc(db, "events", id));
          if (eventDoc.exists()) {
            return { id: eventDoc.id, ...(eventDoc.data() as any) } as EventDoc;
          }
          return null;
        } catch (error) {
          console.error("Error fetching event:", error);
          return null;
        }
      });
      
      const eventData = (await Promise.all(eventPromises)).filter((e) => e !== null) as EventDoc[];
      setEvents(eventData);
      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "text-green-600";
      case "ongoing":
        return "text-blue-600";
      case "pending":
        return "text-yellow-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusBackground = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100";
      case "ongoing":
        return "bg-blue-100";
      case "pending":
        return "bg-yellow-100";
      case "failed":
        return "bg-red-100";
      default:
        return "bg-gray-100";
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4FB7B3" />
        <Text className="text-teal-700 mt-4 font-medium">Loading reports...</Text>
      </View>
    );
  }

  const totalAmount = pledges.reduce((sum, pledge) => sum + (pledge.amount || 0), 0);
  const completedEvents = events.filter(ev => ev.status === "completed").length;

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
    >
      {/* Header */}
      <View className="mb-6">
        <Text className="text-3xl font-extrabold text-teal-600">Impact Dashboard</Text>
        <Text className="text-gray-600 mt-2">
          {pledges.length} sponsorship{pledges.length !== 1 ? 's' : ''} • {formatCurrency(totalAmount)} total
        </Text>
      </View>

      {/* Refresh Button */}
      <Pressable
        onPress={fetchData}
        className="bg-teal-600 rounded-lg py-3 px-4 mb-6 flex-row items-center justify-center"
        disabled={refreshing}
      >
        <Ionicons name="refresh" size={20} color="white" />
        <Text className="text-white font-bold ml-2">
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </Text>
      </Pressable>

      {pledges.length === 0 ? (
        <View className="flex-1 justify-center items-center py-20">
          <Ionicons name="bar-chart-outline" size={48} color="#4FB7B3" />
          <Text className="text-2xl font-bold text-teal-700 mt-4 mb-2">No Sponsored Events</Text>
          <Text className="text-teal-600 text-center max-w-sm leading-6">
            You havent sponsored any events yet. Check the Home tab for opportunities.
          </Text>
        </View>
      ) : (
        <>
          {/* Summary Cards */}
          <View className="flex-row justify-between mb-6 space-x-4">
            <View className="flex-1 bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
              <Text className="text-lg font-bold text-teal-700">Total Sponsored</Text>
              <Text className="text-2xl font-bold text-teal-600">{formatCurrency(totalAmount)}</Text>
            </View>
            <View className="flex-1 bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
              <Text className="text-lg font-bold text-teal-700">Events Supported</Text>
              <Text className="text-2xl font-bold text-teal-600">{events.length}</Text>
            </View>
          </View>

          {/* Events List */}
          {events.map((ev) => {
            const eventPledges = pledges.filter((p) => p.eventId === ev.id);
            const totalEventAmount = eventPledges.reduce((sum, pledge) => sum + (pledge.amount || 0), 0);
            const date = tsToDate(ev.eventAt);

            return (
              <View
                key={ev.id}
                className="mb-5 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
              >
                {/* Event Image */}
                {ev.image && (
                  <Image
                    source={{ uri: ev.image }}
                    className="w-full h-48"
                    resizeMode="cover"
                  />
                )}
                
                <View className="p-6">
                  {/* Event Header */}
                  <View className="flex-row justify-between items-start mb-3">
                    <Text className="text-xl font-bold text-teal-700 flex-1 mr-2">{ev.title}</Text>
                    <View className={`px-3 py-1 rounded-full ${getStatusBackground(ev.status)}`}>
                      <Text className={`text-xs font-medium capitalize ${getStatusColor(ev.status)}`}>
                        {ev.status || "unknown"}
                      </Text>
                    </View>
                  </View>

                  {/* Event Details */}
                  <View className="space-y-3">
                    <View className="flex-row items-center">
                      <Ionicons name="calendar-outline" size={16} color="#4FB7B3" />
                      <Text className="text-gray-600 ml-2">{formatDate(date)}</Text>
                    </View>
                    
                    {ev.location?.label && (
                      <View className="flex-row items-center">
                        <Ionicons name="location-outline" size={16} color="#4FB7B3" />
                        <Text className="text-gray-600 ml-2">{ev.location.label}</Text>
                      </View>
                    )}

                    {/* Sponsorship Details */}
                    <View className="pt-3 border-t border-gray-100">
                      <Text className="text-lg font-bold text-teal-700 mb-2">Your Sponsorship</Text>
                      
                      <View className="space-y-2">
                        <View className="flex-row justify-between">
                          <Text className="text-gray-600">Total Pledged:</Text>
                          <Text className="text-teal-700 font-bold">{formatCurrency(totalEventAmount)}</Text>
                        </View>
                        
                        <View className="flex-row justify-between">
                          <Text className="text-gray-600">Number of Pledges:</Text>
                          <Text className="text-gray-600">{eventPledges.length}</Text>
                        </View>

                        {eventPledges.map((pledge, index) => (
                          <View key={pledge.id} className="bg-gray-50 rounded-lg p-3">
                            <View className="flex-row justify-between mb-1">
                              <Text className="text-gray-600">Pledge {index + 1}:</Text>
                              <Text className="text-teal-700 font-bold">{formatCurrency(pledge.amount || 0)}</Text>
                            </View>
                            {pledge.purpose && (
                              <Text className="text-gray-600 text-sm">Purpose: {pledge.purpose}</Text>
                            )}
                            {pledge.status && (
                              <Text className="text-gray-600 text-sm">Status: {pledge.status}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Impact Metrics */}
                    {ev.wasteCollected !== undefined && (
                      <View className="pt-3 border-t border-gray-100">
                        <Text className="text-lg font-bold text-teal-700 mb-2">Impact Created</Text>
                        <View className="flex-row items-center">
                          <Ionicons name="leaf-outline" size={16} color="#4FB7B3" />
                          <Text className="text-gray-600 ml-2">
                            Waste Collected: {ev.wasteCollected} kg
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}