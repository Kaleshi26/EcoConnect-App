import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// Event type
type EventDoc = {
  id: string;
  title: string;
  description: string;
  eventAt?: any;
  location?: { label?: string; address?: string };
  sponsorshipRequired?: boolean;
  fundingGoal?: number;
  currentFunding?: number;
  image?: string;
  goal?: string;
  organizer?: string;
  organizerId?: string;
  contactEmail?: string;
  contactPhone?: string;
  maxVolunteers?: number;
  currentVolunteers?: number;
  volunteersNeeded?: number;
  category?: string;
  status?: string;
  createdAt?: any;
  completedAt?: any;
  updatedAt?: any;
  sponsorCount?: number;
  requirements?: string[];
  resourcesNeeded?: string;
};

// Helpers
function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  try {
    if (ts.toDate && typeof ts.toDate === 'function') {
      return ts.toDate();
    }
    if (typeof ts === 'string') {
      return new Date(ts);
    }
    return null;
  } catch {
    return null;
  }
}

function formatDate(d?: Date | null) {
  if (!d) return "TBA";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

function isEventUpcoming(event: EventDoc): boolean {
  const eventDate = tsToDate(event.eventAt);
  const now = new Date();
  return eventDate ? eventDate > now : false;
}

function isEventActive(event: EventDoc): boolean {
  const normalizedStatus = event.status?.toLowerCase();
  if (normalizedStatus === 'completed' || normalizedStatus === 'cancelled') {
    return false;
  }
  
  const eventDate = tsToDate(event.eventAt);
  if (eventDate && eventDate < new Date()) {
    return false;
  }
  
  return true;
}

// Press animation hook
function usePressScale(initial = 1) {
  const scale = useRef(new Animated.Value(initial)).current;
  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  return { scale, onPressIn, onPressOut };
}

// Stats Card Component
function StatsCard({ icon, label, value, color, bgColor }: any) {
  return (
    <View
      className="flex-1 bg-white rounded-2xl p-4 mx-1.5"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
      }}
    >
      <View className={`w-12 h-12 ${bgColor} rounded-xl items-center justify-center mb-3`}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text className="text-gray-900 text-xl font-bold mb-1">{value}</Text>
      <Text className="text-gray-600 text-sm font-medium">{label}</Text>
    </View>
  );
}

// Progress Bar Component
function ProgressBar({ percentage, color = "#14B8A6" }: any) {
  return (
    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <View 
        className="h-full rounded-full" 
        style={{ 
          width: `${Math.min(percentage, 100)}%`,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

// Compact Event Card
function CompactEventCard({ ev, index }: { ev: EventDoc; index: number }) {
  const { user } = useAuth();
  const router = useRouter();
  const d = tsToDate(ev.eventAt);
  const dateStr = formatDate(d);
  const cardAnim = usePressScale();

  const funding = ev.currentFunding || 0;
  const goal = ev.fundingGoal || 1;
  const progress = (funding / goal) * 100;
  const sponsorCount = ev.sponsorCount || 0;

  const handlePress = () => {
    if (!user) {
      Alert.alert("Authentication Required", "Please sign in to view event details.");
      return;
    }
    
    // Navigate to event details
    router.push({
      pathname: "/sponsor/tabs/EventDetails",
      params: { eventId: ev.id }
    });
  };

  const colors = [
    { bg: "bg-teal-50", border: "border-teal-100", accent: "#14B8A6" },
    { bg: "bg-blue-50", border: "border-blue-100", accent: "#3B82F6" },
    { bg: "bg-purple-50", border: "border-purple-100", accent: "#A855F7" },
    { bg: "bg-amber-50", border: "border-amber-100", accent: "#F59E0B" },
  ];
  const colorScheme = colors[index % colors.length];

  return (
    <Animated.View style={{ transform: [{ scale: cardAnim.scale }] }} className="mb-3">
      <Pressable
        onPress={handlePress}
        onPressIn={cardAnim.onPressIn}
        onPressOut={cardAnim.onPressOut}
        className={`bg-white ${colorScheme.border} border rounded-2xl p-4`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-row items-start flex-1">
            <View className={`${colorScheme.bg} rounded-xl p-2.5 mr-3`}>
              <Ionicons name="calendar" size={18} color={colorScheme.accent} />
            </View>
            
            <View className="flex-1">
              <Text className="text-gray-900 text-base font-semibold mb-1.5" numberOfLines={1}>
                {ev.title}
              </Text>
              
              <View className="flex-row items-center mb-1">
                <Ionicons name="time-outline" size={14} color="#6B7280" />
                <Text className="text-gray-600 text-sm ml-1.5">{dateStr}</Text>
              </View>

              {ev.location?.label && (
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text className="text-gray-600 text-sm ml-1.5" numberOfLines={1}>
                    {ev.location.label}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="items-center justify-center">
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </View>
        </View>

        {/* Funding Progress */}
        <View className="mb-2">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-gray-700 text-sm font-medium">Funding Progress</Text>
            <Text className="text-gray-900 text-sm font-semibold">{Math.round(progress)}%</Text>
          </View>
          <ProgressBar percentage={progress} color={colorScheme.accent} />
          <View className="flex-row justify-between mt-1">
            <Text className="text-gray-500 text-xs">{formatCurrency(funding)} raised</Text>
            <Text className="text-gray-500 text-xs">Goal: {formatCurrency(goal)}</Text>
          </View>
        </View>

        {/* Sponsors Count */}
        <View className="flex-row items-center">
          <Ionicons name="people" size={14} color="#6B7280" />
          <Text className="text-gray-600 text-sm ml-1.5">
            {sponsorCount} sponsor{sponsorCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Main Sponsor Dashboard
export default function SponsorDashboard() {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Get current date for filtering
        const now = new Date();
        
        // Query for events that require sponsorship
        const eventsQuery = query(
          collection(db, "events"), 
          where("sponsorshipRequired", "==", true)
        );
        
        const unsub = onSnapshot(eventsQuery, (snap) => {
          const allEvents: EventDoc[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));

          // Filter for upcoming and active events on the client side
          const upcomingEvents = allEvents.filter((event) => {
            const isUpcoming = isEventUpcoming(event);
            const isActive = isEventActive(event);
            return isUpcoming && isActive;
          });
          
          // Sort by date (soonest first)
          const sortedEvents = upcomingEvents.sort((a, b) => {
            const dateA = tsToDate(a.eventAt)?.getTime() || 0;
            const dateB = tsToDate(b.eventAt)?.getTime() || 0;
            return dateA - dateB;
          });
          
          setEvents(sortedEvents);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching events:", error);
          setLoading(false);
        });

        return () => unsub();
      } catch (error) {
        console.error("Error setting up events listener:", error);
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Calculate analytics
  const totalEvents = events.length;
  const totalFunding = events.reduce((sum, event) => sum + (event.currentFunding || 0), 0);
  const totalGoal = events.reduce((sum, event) => sum + (event.fundingGoal || 0), 0);
  const totalSponsors = events.reduce((sum, event) => sum + (event.sponsorCount || 0), 0);
  
  const displayedEvents = showAll ? events : events.slice(0, 3);

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 80,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-gray-900">Sponsor Dashboard</Text>
          <Text className="text-gray-600 text-base mt-2">
            Discover and support upcoming beach cleanup events
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center py-32">
            <ActivityIndicator size="large" color="#14B8A6" />
            <Text className="text-gray-600 font-medium mt-4 text-base">Loading events...</Text>
          </View>
        ) : (
          <>
            {/* Stats Overview */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Overview</Text>
              <View className="flex-row">
                <StatsCard
                  icon="calendar"
                  label="Upcoming Events"
                  value={totalEvents}
                  color="#14B8A6"
                  bgColor="bg-teal-50"
                />
                <StatsCard
                  icon="wallet"
                  label="Total Raised"
                  value={formatCurrency(totalFunding)}
                  color="#3B82F6"
                  bgColor="bg-blue-50"
                />
              </View>
              <View className="flex-row mt-3">
                <StatsCard
                  icon="people"
                  label="Active Sponsors"
                  value={totalSponsors}
                  color="#A855F7"
                  bgColor="bg-purple-50"
                />
                <StatsCard
                  icon="flag"
                  label="Funding Goal"
                  value={formatCurrency(totalGoal)}
                  color="#F59E0B"
                  bgColor="bg-amber-50"
                />
              </View>
            </View>

            {/* Events Section */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-lg font-semibold text-gray-900">
                    Sponsorship Opportunities
                  </Text>
                  <Text className="text-gray-600 text-sm mt-1">
                    {totalEvents} upcoming events seeking sponsorship
                  </Text>
                </View>
                <View className="bg-teal-100 px-3 py-1.5 rounded-full">
                  <Text className="text-teal-700 font-semibold text-xs">{totalEvents} Total</Text>
                </View>
              </View>

              {events.length === 0 ? (
                <View className="bg-white rounded-2xl p-8 items-center">
                  <View className="bg-gray-100 rounded-full p-4 mb-4">
                    <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
                  </View>
                  <Text className="text-gray-900 font-semibold text-lg mb-2">No Events Available</Text>
                  <Text className="text-gray-600 text-sm text-center">
                    There are currently no upcoming events seeking sponsorship.
                  </Text>
                </View>
              ) : (
                <>
                  {displayedEvents.map((ev, idx) => (
                    <CompactEventCard key={ev.id} ev={ev} index={idx} />
                  ))}

                  {/* View More Button */}
                  {events.length > 3 && (
                    <Pressable
                      onPress={() => setShowAll(!showAll)}
                      className="bg-white border border-gray-200 rounded-2xl py-4 mt-2 items-center"
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 6,
                        elevation: 3,
                      }}
                    >
                      <View className="flex-row items-center">
                        <Text className="text-gray-700 font-semibold text-base mr-2">
                          {showAll ? "Show Less" : `View ${events.length - 3} More Events`}
                        </Text>
                        <Ionicons
                          name={showAll ? "chevron-up" : "chevron-down"}
                          size={20}
                          color="#374151"
                        />
                      </View>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}