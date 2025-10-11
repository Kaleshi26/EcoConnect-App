import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from '@/contexts/CurrencyContext';
import { db } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, query, Timestamp, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type EventDoc = {
  id: string;
  title: string;
  eventAt?: Timestamp;
  location?: { label?: string };
  status?: "upcoming" | "ongoing" | "completed";
  wasteCollected?: number;
  image?: string;
  description?: string;
  fundingGoal?: number;
  currentFunding?: number;
  sponsorCount?: number;
};

type SponsorshipDoc = {
  id: string;
  eventId: string;
  eventTitle: string;
  sponsorId: string;
  amount: number;
  sponsorshipType: 'financial' | 'in_kind' | 'both';
  companyName?: string;
  contactEmail: string;
  contactPhone: string;
  message?: string;
  inKindDescription?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// Constants for pagination
const INITIAL_ITEMS_TO_SHOW = 3;
const ADDITIONAL_ITEMS_TO_SHOW = 5;

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
/*
function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
  }).format(amount);
}
*/
function getStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case "completed":
    case "approved":
      return "text-green-600";
    case "ongoing":
      return "text-blue-600";
    case "pending":
      return "text-yellow-600";
    case "rejected":
    case "cancelled":
    case "failed":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}

function getStatusBackground(status?: string) {
  switch (status?.toLowerCase()) {
    case "completed":
    case "approved":
      return "bg-green-100";
    case "ongoing":
      return "bg-blue-100";
    case "pending":
      return "bg-yellow-100";
    case "rejected":
    case "cancelled":
    case "failed":
      return "bg-red-100";
    default:
      return "bg-gray-100";
  }
}

function getStatusText(status?: string) {
  switch (status?.toLowerCase()) {
    case "pending":
      return "Under Review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "completed":
      return "Completed";
    default:
      return status || "Pending";
  }
}

function getSponsorshipTypeText(type?: string) {
  switch (type) {
    case 'financial': return 'Financial';
    case 'in_kind': return 'In-Kind';
    case 'both': return 'Combined';
    default: return 'Financial';
  }
}

// Filter options
type FilterOption = 'all' | 'pending' | 'approved' | 'rejected' | 'completed';

const filterOptions: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

export default function SponsorReports() {
  const { user } = useAuth();
  const [sponsorships, setSponsorships] = useState<SponsorshipDoc[]>([]);
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [itemsToShow, setItemsToShow] = useState(INITIAL_ITEMS_TO_SHOW);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { formatCurrency } = useCurrency();


  const fetchData = async () => {
    if (!user) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }
    
    try {
      setRefreshing(true);
      setError(null);
      
      console.log("Fetching sponsorships for user:", user.uid);
      
      // Query sponsorships for the current user
      const sponsorshipsQuery = query(
        collection(db, "sponsorships"), 
        where("sponsorId", "==", user.uid)
      );
      
      const sponsorshipsSnap = await getDocs(sponsorshipsQuery);
      
      console.log(`Found ${sponsorshipsSnap.docs.length} sponsorships`);
      
      const sponsorshipData: SponsorshipDoc[] = sponsorshipsSnap.docs.map((d) => ({ 
        id: d.id, 
        ...(d.data() as any) 
      }));

      // Sort manually by createdAt on client side (newest first)
      const sortedSponsorships = sponsorshipData.sort((a, b) => {
        const dateA = tsToDate(a.createdAt)?.getTime() || 0;
        const dateB = tsToDate(b.createdAt)?.getTime() || 0;
        return dateB - dateA;
      });
      
      setSponsorships(sortedSponsorships);

      // Extract unique event IDs from sponsorships
      const eventIds = [...new Set(sortedSponsorships.map((s) => s.eventId))];
      console.log(`Found ${eventIds.length} unique events`);
      
      if (eventIds.length === 0) {
        setEvents([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch event details for each sponsored event
      const eventPromises = eventIds.map(async (id) => {
        try {
          const eventDoc = await getDoc(doc(db, "events", id));
          if (eventDoc.exists()) {
            return { id: eventDoc.id, ...(eventDoc.data() as any) } as EventDoc;
          }
          console.warn(`Event ${id} not found`);
          return null;
        } catch (error) {
          console.error("Error fetching event:", error);
          return null;
        }
      });
      
      const eventData = (await Promise.all(eventPromises)).filter((e) => e !== null) as EventDoc[];
      console.log(`Successfully loaded ${eventData.length} events`);
      setEvents(eventData);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load your sponsorships. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Filter sponsorships based on active filter
  const filteredSponsorships = sponsorships.filter(sponsorship => {
    if (activeFilter === 'all') return true;
    return sponsorship.status === activeFilter;
  });

  // Sponsorships to display with pagination
  const displayedSponsorships = filteredSponsorships.slice(0, itemsToShow);
  const hasMoreSponsorships = itemsToShow < filteredSponsorships.length;

  const handleRefresh = () => {
    setItemsToShow(INITIAL_ITEMS_TO_SHOW);
    fetchData();
  };

  const handleSponsorshipPress = (sponsorshipId: string, eventId: string) => {
    router.push({
      pathname: "/sponsor/tabs/SponsorConfirmation",
      params: { 
        sponsorshipId: sponsorshipId,
        eventId: eventId,
        fromReports: "true"
      }
    });
  };

  const handleFilterPress = (filter: FilterOption) => {
    setActiveFilter(filter);
    setItemsToShow(INITIAL_ITEMS_TO_SHOW);
  };

  const handleViewMore = () => {
    setItemsToShow(prev => prev + ADDITIONAL_ITEMS_TO_SHOW);
  };

  const handleShowLess = () => {
    setItemsToShow(INITIAL_ITEMS_TO_SHOW);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text className="text-teal-700 mt-4 font-medium">Loading your sponsorships...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50 px-5">
        <View className="bg-red-100 rounded-2xl p-6 items-center border border-red-200">
          <Ionicons name="alert-circle" size={48} color="#dc2626" />
          <Text className="text-xl font-bold text-red-700 mt-4 mb-2">Unable to Load Data</Text>
          <Text className="text-red-600 text-center mb-4 leading-5">
            {error}
          </Text>
          <Pressable
            onPress={handleRefresh}
            className="bg-teal-500 rounded-lg py-3 px-6"
          >
            <Text className="text-white font-bold">Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const totalAmount = sponsorships.reduce((sum, sponsorship) => sum + sponsorship.amount, 0);
  const totalSponsorships = sponsorships.length;
  const approvedSponsorships = sponsorships.filter(s => s.status === 'approved').length;
  const pendingSponsorships = sponsorships.filter(s => s.status === 'pending').length;
  const completedSponsorships = sponsorships.filter(s => s.status === 'completed').length;

  // Stats for filtered view
  const filteredAmount = filteredSponsorships.reduce((sum, sponsorship) => sum + sponsorship.amount, 0);
  const filteredCount = filteredSponsorships.length;

  return (
<View className="flex-1 bg-slate-50">
      
      {/* Fixed Header */}
      <View 
        className="bg-teal-500 pt-4 px-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center justify-between pb-4">
          <View className="flex-1 items-center">
            <Text className="text-xl font-bold text-white">My Sponsorships</Text>
            <Text className="text-white text-base mt-1">
              Track your sponsorship history
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ 
          padding: 20, 
          paddingBottom: 100
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#14B8A6']}
            tintColor="#14B8A6"
          />
        }
        showsVerticalScrollIndicator={false}
      >


        {sponsorships.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <View className="bg-teal-100 rounded-full p-6 mb-6">
              <Ionicons name="bar-chart-outline" size={48} color="#0d9488" />
            </View>
            <Text className="text-2xl font-bold text-teal-700 mb-3 text-center">No Sponsorships Yet</Text>
            <Text className="text-teal-600 text-center max-w-sm leading-6 mb-6">
              You have not sponsored any events yet. Check the dashboard for upcoming events that need your support.
            </Text>
            <Pressable
              onPress={() => router.push("/sponsor/tabs/sponsorDashboard")}
              className="bg-teal-500 rounded-xl py-4 px-8"
            >
              <Text className="text-white font-bold text-lg">Browse Events</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Summary Cards  */}
            <View className="flex-row justify-between mb-4 -mx-1">
              <View className="flex-1 p-1">
                <View className="bg-white rounded-xl p-3 border border-gray-200">
                  <Text className="text-gray-700 text-s font-medium mb-1">Total Sponsored</Text>
                  <Text className="text-gray-900 text-base font-bold">{formatCurrency(totalAmount)}</Text>
                </View>
              </View>
              
              <View className="flex-1 p-1">
                <View className="bg-white rounded-xl p-3 border border-gray-200">
                  <Text className="text-gray-700 text-s font-medium mb-1">Total Sponsorships</Text>
                  <Text className="text-gray-900 text-base font-bold">{totalSponsorships}</Text>
                </View>
              </View>
            </View>

            {/* Additional Stats */}
<View className="flex-row justify-between mb-6 -mx-1">
              <View className="flex-1 p-1">
                <View className="bg-white rounded-xl p-3 border border-gray-200">
                  <Text className="text-gray-700 text-s font-medium mb-1">Approved</Text>
                  <Text className="text-gray-900 text-base font-bold">{approvedSponsorships}</Text>
                </View>
              </View>
              
              <View className="flex-1 p-1">
                <View className="bg-white rounded-xl p-3 border border-gray-200">
                  <Text className="text-gray-700 text-s font-medium mb-1">Pending</Text>
                  <Text className="text-gray-900 text-base font-bold">{pendingSponsorships}</Text>
                </View>
              </View>
            </View>

            {/* Filter Section */}
                  <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-semibold text-gray-900">Filter Sponsorships</Text>
                <View className="bg-gray-100 px-2 py-1 rounded">
                  <Text className="text-gray-700 text-s font-medium">{filteredCount} events</Text>
                </View>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                className="flex-row mb-2"
              >
                {filterOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => handleFilterPress(option.value)}
                    className={`px-3 py-2 rounded-full border mx-1 ${
                      activeFilter === option.value
                        ? 'bg-teal-500 border-teal-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`text-s font-medium ${
                        activeFilter === option.value ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              
              {/* Filter Results Summary */}
              {activeFilter !== 'all' && (
                <View className="bg-teal-50 rounded-lg px-3 py-2 border border-teal-200">
                  <Text className="text-teal-700 text-xs text-center">
                    Showing {filteredCount} {activeFilter} sponsorship{filteredCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
            {/* Sponsorships List Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-gray-900">
                Your Sponsorships {activeFilter !== 'all' && `(${getStatusText(activeFilter)})`}
              </Text>
              <Text className="text-gray-500 text-xs">
                {displayedSponsorships.length} of {filteredSponsorships.length}
              </Text>
            </View>
            
            {filteredSponsorships.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 items-center border border-gray-200">
                <Ionicons name="search-outline" size={48} color="#9CA3AF" />
                <Text className="text-xl font-bold text-gray-500 mt-4 mb-2">No {activeFilter !== 'all' ? activeFilter : ''} sponsorships found</Text>
                <Text className="text-gray-500 text-center">
                  {activeFilter !== 'all' 
                    ? `You don't have any ${activeFilter} sponsorships.`
                    : "No sponsorships found."}
                </Text>
                {activeFilter !== 'all' && (
                  <Pressable
                    onPress={() => setActiveFilter('all')}
                    className="bg-teal-500 rounded-lg py-2 px-4 mt-4"
                  >
                    <Text className="text-white font-medium">Show All Sponsorships</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <>
               {/* Sponsorships List */}
                {displayedSponsorships.map((sponsorship) => {
                  const event = events.find((e) => e.id === sponsorship.eventId);
                  const eventDate = tsToDate(event?.eventAt);
                  const sponsorshipDate = tsToDate(sponsorship.createdAt);

                  return (
                    <Pressable
                      key={sponsorship.id}
                      onPress={() => handleSponsorshipPress(sponsorship.id, sponsorship.eventId)}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4"
                    >
                      {/* Event Image */}
                      {event?.image && (
                        <Image
                          source={{ uri: event.image }}
                          className="w-full h-32"
                          resizeMode="cover"
                        />
                      )}
                      
                      <View className="p-4">
                        {/* Event Header */}
                        <View className="flex-row justify-between items-start mb-3">
                          <Text className="text-base font-semibold text-gray-900 flex-1 mr-2">
                            {event?.title || sponsorship.eventTitle}
                          </Text>
                          <View className={`px-2 py-1 rounded-full ${getStatusBackground(sponsorship.status)}`}>
                            <Text className={`text-xs font-medium capitalize ${getStatusColor(sponsorship.status)}`}>
                              {getStatusText(sponsorship.status)}
                            </Text>
                          </View>
                        </View>

                        {/* Sponsorship Details */}
                        <View className="space-y-2 mb-3">
                          <View className="flex-row items-center">
                            <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                            <Text className="text-gray-600 text-xs ml-2">
                              Event: {formatDate(eventDate)}
                            </Text>
                          </View>
                          
                          <View className="flex-row items-center">
                            <Ionicons name="time-outline" size={12} color="#6B7280" />
                            <Text className="text-gray-600 text-xs ml-2">
                              Sponsored: {formatDate(sponsorshipDate)}
                            </Text>
                          </View>

                          {event?.location?.label && (
                            <View className="flex-row items-center">
                              <Ionicons name="location-outline" size={12} color="#6B7280" />
                              <Text className="text-gray-600 text-xs ml-2">{event.location.label}</Text>
                            </View>
                          )}
                        </View>

                        {/* Sponsorship Summary */}
                        <View className="bg-teal-50 rounded-lg p-3 border-l-2 border-l-teal-500">
                          <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-gray-600 text-xs">Amount:</Text>
                            <Text className="text-teal-700 font-bold text-sm">
                              {formatCurrency(sponsorship.amount)}
                            </Text>
                          </View>
                          
                          <View className="flex-row justify-between items-center">
                            <Text className="text-gray-600 text-xs">Type:</Text>
                            <Text className="text-teal-700 font-medium text-xs">
                              {getSponsorshipTypeText(sponsorship.sponsorshipType)}
                            </Text>
                          </View>

                          {sponsorship.companyName && (
                            <View className="flex-row justify-between items-center mt-1">
                              <Text className="text-gray-600 text-xs">Company:</Text>
                              <Text className="text-gray-600 text-xs">{sponsorship.companyName}</Text>
                            </View>
                          )}
                        </View>

                        {/* Tap to view details */}
                        <View className="flex-row items-center justify-center mt-3 pt-3 border-t border-gray-200">
                          <Text className="text-teal-600 font-medium text-xs">
                            Tap to view details
                          </Text>
                          <Ionicons name="chevron-forward" size={12} color="#14B8A6" />
                        </View>
                      </View>
                    </Pressable>
                  );
                })}

                {/* View More / Show Less Buttons */}
                {filteredSponsorships.length > INITIAL_ITEMS_TO_SHOW && (
                  <View className="flex-row justify-center mt-4">
                    {hasMoreSponsorships ? (
                      <Pressable
                        onPress={handleViewMore}
                        className="bg-teal-500 rounded-lg py-2 px-4 flex-row items-center"
                      >
                        <Ionicons name="chevron-down" size={16} color="white" />
                        <Text className="text-white font-medium text-sm ml-1">
                          View More ({filteredSponsorships.length - displayedSponsorships.length})
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={handleShowLess}
                        className="bg-gray-500 rounded-lg py-2 px-4 flex-row items-center"
                      >
                        <Ionicons name="chevron-up" size={16} color="white" />
                        <Text className="text-white font-medium text-sm ml-1">
                          Show Less
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}