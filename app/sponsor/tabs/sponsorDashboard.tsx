import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from '@/contexts/CurrencyContext';
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
  imageUrl?: string;
  imageUrls?: string[];
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

// Filter types
type EventFilter = 'all' | 'upcoming' | 'completed' | 'requires_sponsorship';

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
    year: "numeric"
  });
}

function isEventUpcoming(event: EventDoc): boolean {
  const eventDate = tsToDate(event.eventAt);
  const now = new Date();
  return eventDate ? eventDate > now : false;
}

function isEventCompleted(event: EventDoc): boolean {
  const normalizedStatus = event.status?.toLowerCase();
  if (normalizedStatus === 'completed') return true;
  
  const eventDate = tsToDate(event.eventAt);
  const now = new Date();
  return eventDate ? eventDate < now : false;
}

function requiresSponsorship(event: EventDoc): boolean {
  return event.sponsorshipRequired === true;
}

// NEW: Safe progress calculation
function calculateFundingProgress(event: EventDoc): { percentage: number; hasValidGoal: boolean } {
  const funding = event.currentFunding || 0;
  const goal = event.fundingGoal || 0;
  
  // If no goal is set, we can't calculate a meaningful percentage
  if (goal <= 0) {
    return { percentage: 0, hasValidGoal: false };
  }
  
  const percentage = (funding / goal) * 100;
  return { percentage: Math.min(percentage, 100), hasValidGoal: true };
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
        shadowColor: color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View className={`w-10 h-10 ${bgColor} rounded-xl items-center justify-center mb-3`}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text className="text-gray-900 text-lg font-bold mb-1">{value}</Text>
      <Text className="text-gray-600 text-xs font-medium">{label}</Text>
    </View>
  );
}

// Progress Bar Component - UPDATED
function ProgressBar({ percentage, color = "#14B8A6", height = 8, showPercentage = false }: any) {
  return (
    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <View 
        className="h-full rounded-full" 
        style={{ 
          width: `${Math.min(percentage, 100)}%`,
          backgroundColor: color,
          height: height,
        }}
      />
      {showPercentage && (
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-xs font-bold text-gray-800">{Math.round(percentage)}%</Text>
        </View>
      )}
    </View>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status?: string }) {
  const getStatusConfig = (status: string = 'active') => {
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
      case 'completed':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' };
      case 'upcoming':
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Upcoming' };
      case 'ongoing':
        return { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Ongoing' };
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Active' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <View className={`${config.bg} px-2 py-1 rounded-full`}>
      <Text className={`${config.text} text-xs font-medium`}>
        {config.label}
      </Text>
    </View>
  );
}

// NEW: Compact Filter Button Component
function CompactFilterButton({ 
  filter, 
  currentFilter, 
  onPress, 
  icon, 
  label 
}: { 
  filter: EventFilter;
  currentFilter: EventFilter;
  onPress: (filter: EventFilter) => void;
  icon: string;
  label: string;
}) {
  const isActive = currentFilter === filter;
  
  return (
    <Pressable
      onPress={() => onPress(filter)}
      className={`flex-row items-center px-3 py-2 rounded-full border mx-1 ${
        isActive 
          ? 'bg-teal-500 border-teal-500' 
          : 'bg-white border-gray-300'
      }`}
      style={{
        shadowColor: isActive ? "#14B8A6" : "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isActive ? 0.3 : 0.1,
        shadowRadius: isActive ? 4 : 2,
        elevation: isActive ? 3 : 1,
      }}
    >
      <Ionicons 
        name={icon as any} 
        size={14} 
        color={isActive ? 'white' : '#6B7280'} 
      />
      <Text className={`ml-1.5 text-xs font-medium ${
        isActive ? 'text-white' : 'text-gray-700'
      }`}>
        {label}
      </Text>
    </Pressable>
  );
}

// NEW: Active Filter Indicator
function ActiveFilterIndicator({ filter, count }: { filter: EventFilter; count: number }) {
  const getFilterConfig = (filter: EventFilter) => {
    switch (filter) {
      case 'all':
        return { label: 'All Events', color: 'bg-gray-500' };
      case 'upcoming':
        return { label: 'Upcoming', color: 'bg-blue-500' };
      case 'completed':
        return { label: 'Completed', color: 'bg-green-500' };
      case 'requires_sponsorship':
        return { label: 'Need Sponsors', color: 'bg-teal-500' };
      default:
        return { label: 'All Events', color: 'bg-gray-500' };
    }
  };

  const config = getFilterConfig(filter);

  return (
    <View className="flex-row items-center bg-teal-50 rounded-lg px-3 py-2 border border-teal-200">
      <View className={`w-2 h-2 ${config.color} rounded-full mr-2`} />
      <Text className="text-teal-800 text-sm font-medium flex-1">
        Showing {count} {config.label.toLowerCase()}
      </Text>
      <View className="bg-teal-100 px-2 py-1 rounded">
        <Text className="text-teal-700 text-xs font-bold">{count}</Text>
      </View>
    </View>
  );
}

// Compact Event Card - UPDATED
function CompactEventCard({ ev, index }: { ev: EventDoc; index: number }) {
  const { user } = useAuth();
  const router = useRouter();
  const d = tsToDate(ev.eventAt);
  const dateStr = formatDate(d);
  const cardAnim = usePressScale();
  const { formatCurrency } = useCurrency();

  // UPDATED: Use safe progress calculation
  const funding = ev.currentFunding || 0;
  const { percentage, hasValidGoal } = calculateFundingProgress(ev);
  const sponsorCount = ev.sponsorCount || 0;
  
  const isCompleted = isEventCompleted(ev);
  const isUpcoming = isEventUpcoming(ev);

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
              <Ionicons 
                name={isCompleted ? "checkmark-circle" : "calendar"} 
                size={18} 
                color={colorScheme.accent} 
              />
            </View>
            
            <View className="flex-1">
              <Text className="text-gray-900 text-base font-semibold mb-1.5" numberOfLines={1}>
                {ev.title}
              </Text>
              
              <View className="flex-row items-center justify-between mb-1">
                <StatusBadge status={ev.status} />
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={12} color="#6B7280" />
                  <Text className="text-gray-600 text-xs ml-1">{dateStr}</Text>
                </View>
              </View>

              {ev.location?.label && (
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={12} color="#6B7280" />
                  <Text className="text-gray-600 text-xs ml-1" numberOfLines={1}>
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

        {/* Funding Progress - Only show for events that need sponsorship */}
        {ev.sponsorshipRequired && (
          <View className="mb-2">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-gray-700 text-sm font-medium">Funding Progress</Text>
              {hasValidGoal && (
                <Text className="text-gray-900 text-sm font-semibold">{Math.round(percentage)}%</Text>
              )}
            </View>
            <ProgressBar percentage={percentage} color={colorScheme.accent} />
            <View className="flex-row justify-between mt-1">
              <Text className="text-gray-500 text-xs">{formatCurrency(funding)} raised</Text>
              <Text className="text-gray-500 text-xs">
                {hasValidGoal ? `Goal: ${formatCurrency(ev.fundingGoal || 0)}` : 'No goal set'}
              </Text>
            </View>
          </View>
        )}

        {/* Sponsors Count */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="people" size={14} color="#6B7280" />
            <Text className="text-gray-600 text-sm ml-1.5">
              {sponsorCount} sponsor{sponsorCount !== 1 ? 's' : ''}
            </Text>
          </View>
          
          {ev.sponsorshipRequired && isUpcoming && (
            <View className="bg-teal-100 px-2 py-1 rounded-full">
              <Text className="text-teal-700 text-xs font-medium">Needs Sponsors</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Main Sponsor Dashboard - UPDATED
export default function SponsorDashboard() {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<EventFilter>('all');
  const [showAll, setShowAll] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  

  // Fetch all events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
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

          console.log('Fetched events:', allEvents.map(ev => ({
            id: ev.id,
            title: ev.title,
            fundingGoal: ev.fundingGoal,
            currentFunding: ev.currentFunding,
            sponsorshipRequired: ev.sponsorshipRequired
          })));

          // Sort by date (most recent first)
          const sortedEvents = allEvents.sort((a, b) => {
            const dateA = tsToDate(a.eventAt)?.getTime() || 0;
            const dateB = tsToDate(b.eventAt)?.getTime() || 0;
            return dateB - dateA; // Most recent first
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

  // Filter events based on active filter
  useEffect(() => {
    const filterEvents = () => {
      let filtered = events;

      switch (activeFilter) {
        case 'upcoming':
          filtered = events.filter(event => isEventUpcoming(event));
          break;
        case 'completed':
          filtered = events.filter(event => isEventCompleted(event));
          break;
        case 'requires_sponsorship':
          filtered = events.filter(event => requiresSponsorship(event) && isEventUpcoming(event));
          break;
        case 'all':
        default:
          filtered = events;
          break;
      }

      setFilteredEvents(filtered);
    };

    filterEvents();
  }, [events, activeFilter]);

  // Calculate analytics based on filtered events
  const totalEvents = filteredEvents.length;
  const totalFunding = filteredEvents.reduce((sum, event) => sum + (event.currentFunding || 0), 0);
  const totalGoal = filteredEvents.reduce((sum, event) => sum + (event.fundingGoal || 0), 0);
  const totalSponsors = filteredEvents.reduce((sum, event) => sum + (event.sponsorCount || 0), 0);
  const upcomingEventsCount = events.filter(event => isEventUpcoming(event)).length;
  const completedEventsCount = events.filter(event => isEventCompleted(event)).length;
  
  const displayedEvents = showAll ? filteredEvents : filteredEvents.slice(0, 6);

  const handleFilterChange = (filter: EventFilter) => {
    setActiveFilter(filter);
    setShowAll(false); // Reset show all when filter changes
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      <View 
        className="bg-teal-500 pt-4 px-4 border-b border-gray-200"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1 items-center">
            <Text className="text-xl font-bold text-white ">Home</Text>
            <Text className="text-white text-base mt-1">
              Discover beach cleanup opportunities
            </Text>
          </View>
          
          
          
        </View>
      </View>
      
      
      

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Content starts here */}
        <View className="px-4 pt-6 pb-8">
          {loading ? (
            <View className="flex-1 justify-center items-center py-32">
              <ActivityIndicator size="large" color="#14B8A6" />
              <Text className="text-gray-600 font-medium mt-4 text-base">Loading events...</Text>
            </View>
          ) : (
            <>
              {/* Quick Stats Overview */}
              <View className="flex-row justify-between mb-6 -mx-1">
                <View className="flex-1 p-1">
                  <View className="bg-white rounded-xl p-4 border border-gray-200">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="calendar" size={20} color="#14B8A6" />
                      <Text className="text-gray-700 font-medium ml-2">Total</Text>
                    </View>
                    <Text className="text-gray-900 text-xl font-bold">{events.length}</Text>
                    <Text className="text-gray-500 text-xs mt-1">Events</Text>
                  </View>
                </View>
                
                <View className="flex-1 p-1">
                  <View className="bg-white rounded-xl p-4 border border-gray-200">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="trending-up" size={20} color="#3B82F6" />
                      <Text className="text-gray-700 font-medium ml-2">Raised</Text>
                    </View>
                    <Text className="text-gray-900 text-xl font-bold">
                      {formatCurrency(totalFunding).replace('LKR', '').trim()}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">Total</Text>
                  </View>
                </View>
                
                <View className="flex-1 p-1">
                  <View className="bg-white rounded-xl p-4 border border-gray-200">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="rocket" size={20} color="#A855F7" />
                      <Text className="text-gray-700 font-medium ml-2">Active</Text>
                    </View>
                    <Text className="text-gray-900 text-xl font-bold">{upcomingEventsCount}</Text>
                    <Text className="text-gray-500 text-xs mt-1">Upcoming</Text>
                  </View>
                </View>
              </View>

              {/* Filter Section */}
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg font-semibold text-gray-900">Browse Events</Text>
                  <View className="bg-gray-100 px-2 py-1 rounded">
                    <Text className="text-gray-700 text-xs font-medium">{filteredEvents.length} events</Text>
                  </View>
                </View>
                
                {/* Compact Filter Buttons */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  className="flex-row mb-2"
                >
                  <CompactFilterButton
                    filter="all"
                    currentFilter={activeFilter}
                    onPress={handleFilterChange}
                    icon="grid"
                    label="All"
                  />
                  <CompactFilterButton
                    filter="upcoming"
                    currentFilter={activeFilter}
                    onPress={handleFilterChange}
                    icon="calendar"
                    label="Upcoming"
                  />
                  <CompactFilterButton
                    filter="completed"
                    currentFilter={activeFilter}
                    onPress={handleFilterChange}
                    icon="checkmark-circle"
                    label="Completed"
                  />
                  <CompactFilterButton
                    filter="requires_sponsorship"
                    currentFilter={activeFilter}
                    onPress={handleFilterChange}
                    icon="business"
                    label="Need Sponsors"
                  />
                </ScrollView>
                
                {/* Active Filter Indicator */}
                <ActiveFilterIndicator filter={activeFilter} count={filteredEvents.length} />
              </View>

              {/* Events Section */}
              <View className="mb-6">
                {filteredEvents.length === 0 ? (
                  <View className="bg-white rounded-2xl p-8 items-center border border-gray-200">
                    <View className="bg-gray-100 rounded-full p-4 mb-4">
                      <Ionicons name="search-outline" size={32} color="#9CA3AF" />
                    </View>
                    <Text className="text-gray-900 font-semibold text-lg mb-2">No Events Found</Text>
                    <Text className="text-gray-600 text-sm text-center">
                      {activeFilter === 'upcoming' ? 'No upcoming events at the moment.' :
                       activeFilter === 'completed' ? 'No completed events yet.' :
                       activeFilter === 'requires_sponsorship' ? 'No events currently need sponsorship.' :
                       'No events available.'}
                    </Text>
                    {activeFilter !== 'all' && (
                      <Pressable
                        onPress={() => setActiveFilter('all')}
                        className="bg-teal-500 rounded-lg py-2 px-4 mt-4"
                      >
                        <Text className="text-white font-medium">Show All Events</Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <>
                    {displayedEvents.map((ev, idx) => (
                      <CompactEventCard key={ev.id} ev={ev} index={idx} />
                    ))}

                    {/* View More Button */}
                    {filteredEvents.length > 6 && (
                      <Pressable
                        onPress={() => setShowAll(!showAll)}
                        className="bg-white border border-gray-200 rounded-2xl py-3 mt-2 items-center"
                        style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 6,
                          elevation: 3,
                        }}
                      >
                        <View className="flex-row items-center">
                          <Text className="text-gray-700 font-semibold text-sm mr-2">
                            {showAll ? "Show Less" : `View ${filteredEvents.length - 6} More Events`}
                          </Text>
                          <Ionicons
                            name={showAll ? "chevron-up" : "chevron-down"}
                            size={16}
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
        </View>
      </ScrollView>
    </View>
  );
}