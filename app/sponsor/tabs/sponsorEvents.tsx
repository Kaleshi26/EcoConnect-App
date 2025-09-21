import { db } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";

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
  status?: "upcoming" | "ongoing" | "completed";
  wasteCollected?: number;
  organizer?: string;
  createdAt?: Timestamp;
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
  return d.toLocaleDateString(undefined, { 
    year: "numeric", 
    month: "short", 
    day: "numeric" 
  });
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString()}`;
}

export default function SponsorEvents() {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all, sponsorship, completed, upcoming

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const all: EventDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setEvents(all);
      setFilteredEvents(all);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let filtered = events;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.label?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    switch (filter) {
      case "sponsorship":
        filtered = filtered.filter(event => event.sponsorshipRequired);
        break;
      case "completed":
        filtered = filtered.filter(event => event.status === "completed");
        break;
      case "upcoming":
        filtered = filtered.filter(event => event.status === "upcoming" || !event.status);
        break;
      case "ongoing":
        filtered = filtered.filter(event => event.status === "ongoing");
        break;
      default:
        // all events
        break;
    }

    setFilteredEvents(filtered);
  }, [searchQuery, filter, events]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "ongoing":
        return "bg-blue-100 text-blue-800";
      case "upcoming":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getFundingProgress = (event: EventDoc) => {
    if (!event.fundingGoal || !event.currentFunding) return 0;
    return (event.currentFunding / event.fundingGoal) * 100;
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4FB7B3" />
        <Text className="text-teal-700 mt-4 font-medium">Loading events...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header and Search */}
      <View className="p-6 bg-white border-b border-gray-200">
        <Text className="text-3xl font-extrabold text-teal-600 mb-4">Events</Text>
        
        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            className="flex-1 ml-3 text-gray-700"
            placeholder="Search events by title, description, or location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </Pressable>
          )}
        </View>

        {/* Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row space-x-2">
            {[
              { key: "all", label: "All Events", icon: "list" },
              { key: "sponsorship", label: "Needs Sponsors", icon: "cash" },
              { key: "upcoming", label: "Upcoming", icon: "calendar" },
              { key: "ongoing", label: "Ongoing", icon: "time" },
              { key: "completed", label: "Completed", icon: "checkmark-done" },
            ].map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  filter === item.key ? "bg-teal-600" : "bg-gray-200"
                }`}
              >
                <Ionicons 
                  name={item.icon as any} 
                  size={16} 
                  color={filter === item.key ? "white" : "#6B7280"} 
                />
                <Text 
                  className={`ml-2 font-medium ${
                    filter === item.key ? "text-white" : "text-gray-700"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Results Count */}
        <Text className="text-gray-600">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Events List */}
      <ScrollView className="flex-1 p-6">
        {filteredEvents.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Ionicons name="calendar-outline" size={64} color="#4FB7B3" />
            <Text className="text-2xl font-bold text-teal-700 mt-6 mb-2">
              {searchQuery ? "No matching events" : "No events found"}
            </Text>
            <Text className="text-gray-600 text-center">
              {searchQuery 
                ? "Try adjusting your search terms or filters"
                : "There are currently no events available"
              }
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            {filteredEvents.map((event) => {
              const date = tsToDate(event.eventAt);
              const fundingProgress = getFundingProgress(event);

              return (
                <View
                  key={event.id}
                  className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
                >
                  {/* Event Image */}
                  {event.image && (
                    <Image
                      source={{ uri: event.image }}
                      className="w-full h-48"
                      resizeMode="cover"
                    />
                  )}

                  <View className="p-6">
                    {/* Event Header */}
                    <View className="flex-row justify-between items-start mb-3">
                      <Text className="text-xl font-bold text-teal-700 flex-1 mr-2">
                        {event.title}
                      </Text>
                      <View className={`px-3 py-1 rounded-full ${getStatusColor(event.status)}`}>
                        <Text className="text-xs font-medium capitalize">
                          {event.status || "upcoming"}
                        </Text>
                      </View>
                    </View>

                    {/* Event Details */}
                    <View className="space-y-2 mb-4">
                      <View className="flex-row items-center">
                        <Ionicons name="calendar-outline" size={16} color="#4FB7B3" />
                        <Text className="text-gray-600 ml-2">{formatDate(date)}</Text>
                      </View>

                      {event.location?.label && (
                        <View className="flex-row items-center">
                          <Ionicons name="location-outline" size={16} color="#4FB7B3" />
                          <Text className="text-gray-600 ml-2">{event.location.label}</Text>
                        </View>
                      )}

                      {event.organizer && (
                        <View className="flex-row items-center">
                          <Ionicons name="people-outline" size={16} color="#4FB7B3" />
                          <Text className="text-gray-600 ml-2">By {event.organizer}</Text>
                        </View>
                      )}

                      {event.sponsorshipRequired && (
                        <View className="flex-row items-center">
                          <Ionicons name="cash-outline" size={16} color="#4FB7B3" />
                          <Text className="text-teal-600 ml-2 font-medium">
                            Sponsorship needed
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Funding Progress */}
                    {event.fundingGoal && event.currentFunding !== undefined && (
                      <View className="mb-4">
                        <View className="flex-row justify-between mb-2">
                          <Text className="text-sm text-gray-600">Funding Progress</Text>
                          <Text className="text-sm text-teal-700">
                            {formatCurrency(event.currentFunding)} / {formatCurrency(event.fundingGoal)}
                          </Text>
                        </View>
                        <View className="w-full bg-gray-200 rounded-full h-2">
                          <View
                            className="bg-teal-600 h-2 rounded-full"
                            style={{ width: `${Math.min(fundingProgress, 100)}%` }}
                          />
                        </View>
                      </View>
                    )}

                    {/* Event Description */}
                    {event.description && (
                      <Text className="text-gray-600 mb-4" numberOfLines={3}>
                        {event.description}
                      </Text>
                    )}

                    {/* Impact Metrics */}
                    {event.wasteCollected !== undefined && (
                      <View className="flex-row items-center bg-green-50 rounded-lg p-3 mb-4">
                        <Ionicons name="leaf-outline" size={20} color="#4FB7B3" />
                        <Text className="text-green-700 ml-2 font-medium">
                          {event.wasteCollected} kg waste collected
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View className="flex-row space-x-3">
                      <Pressable className="flex-1 bg-teal-600 rounded-lg py-3 items-center">
                        <Text className="text-white font-bold">View Details</Text>
                      </Pressable>
                      {event.sponsorshipRequired && (
                        <Pressable className="flex-1 bg-orange-500 rounded-lg py-3 items-center">
                          <Text className="text-white font-bold">Sponsor</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}