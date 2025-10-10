import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { collection, doc, getDoc, getDocs, query, Timestamp, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Types based on your Firebase structure
type WasteItem = {
  type: string;
  weight: number;
  description?: string;
  createdAt: Timestamp;
  eventAt: Timestamp;
};

type EventDoc = {
  id: string;
  title: string;
  eventAt?: Timestamp;
  location?: { label?: string };
  status?: "upcoming" | "ongoing" | "completed";
  actualParticipants?: number;
  collectedWastes?: WasteItem[];
  evidencePhotos?: string[];
  volunteersNeeded?: number;
  wasteTypes?: string[];
  organizerId: string;
  organizerRole: string;
  platform: string;
  resourcesNeeded?: string;
  sponsorshipRequired?: boolean;
  updatedAt: Timestamp;
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

type AnalyticsData = {
  totalWasteCollected: number;
  totalParticipants: number;
  totalEventsSupported: number;
  totalInvestment: number;
  wasteByType: { type: string; weight: number; percentage: number }[];
  eventsTimeline: { month: string; waste: number; events: number }[];
  impactScore: number;
};

function tsToDate(ts?: Timestamp) {
  if (!ts) return null;
  try {
    return ts.toDate();
  } catch {
    return null;
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(d?: Date | null) {
  if (!d) return "TBA";
  return d.toLocaleDateString(undefined, { 
    year: "numeric", 
    month: "short", 
    day: "numeric" 
  });
}

function getMonthName(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function calculateImpactScore(
  totalWaste: number,
  totalParticipants: number,
  totalInvestment: number,
  totalEvents: number
): number {
  // Normalize values and calculate a score out of 100
  const wasteScore = Math.min((totalWaste / 100) * 40, 40); // Max 40 points for waste
  const participantScore = Math.min((totalParticipants / 50) * 30, 30); // Max 30 points for participants
  const investmentScore = Math.min((totalInvestment / 50000) * 20, 20); // Max 20 points for investment
  const eventScore = Math.min(totalEvents * 2.5, 10); // Max 10 points for number of events
  
  return Math.round(wasteScore + participantScore + investmentScore + eventScore);
}

export default function SponsorAnalytics() {
  const { user } = useAuth();
  const [sponsorships, setSponsorships] = useState<SponsorshipDoc[]>([]);
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'year' | 'month'>('all');
  const insets = useSafeAreaInsets();

  const screenWidth = Dimensions.get('window').width - 40;

  const fetchData = async () => {
    if (!user) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }
    
    try {
      setRefreshing(true);
      setError(null);
      
      // Fetch sponsorships for the current user
      const sponsorshipsQuery = query(
        collection(db, "sponsorships"), 
        where("sponsorId", "==", user.uid)
      );
      
      const sponsorshipsSnap = await getDocs(sponsorshipsQuery);
      const sponsorshipData: SponsorshipDoc[] = sponsorshipsSnap.docs.map((d) => ({ 
        id: d.id, 
        ...(d.data() as any) 
      }));

      // Filter only approved/completed sponsorships for analytics
      const validSponsorships = sponsorshipData.filter(
        s => s.status === 'approved' || s.status === 'completed'
      );

      setSponsorships(validSponsorships);

      // Fetch event details for sponsored events
      const eventPromises = validSponsorships.map(async (sponsorship) => {
        try {
          const eventDoc = await getDoc(doc(db, "events", sponsorship.eventId));
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

      // Calculate analytics
      calculateAnalytics(validSponsorships, eventData);

    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateAnalytics = (sponsorships: SponsorshipDoc[], events: EventDoc[]) => {
    // Filter completed events only for impact analysis
    const completedEvents = events.filter(event => event.status === 'completed');
    
    // Calculate total waste collected
    const totalWasteCollected = completedEvents.reduce((total, event) => {
      const eventWaste = event.collectedWastes?.reduce((sum, waste) => sum + (waste.weight || 0), 0) || 0;
      return total + eventWaste;
    }, 0);

    // Calculate total participants
    const totalParticipants = completedEvents.reduce((total, event) => {
      return total + (event.actualParticipants || 0);
    }, 0);

    // Calculate total investment (only from approved/completed sponsorships for completed events)
    const totalInvestment = sponsorships.reduce((total, sponsorship) => {
      const event = events.find(e => e.id === sponsorship.eventId);
      if (event?.status === 'completed') {
        return total + sponsorship.amount;
      }
      return total;
    }, 0);

    // Calculate waste by type
    const wasteByTypeMap = new Map<string, number>();
    completedEvents.forEach(event => {
      event.collectedWastes?.forEach(waste => {
        const current = wasteByTypeMap.get(waste.type) || 0;
        wasteByTypeMap.set(waste.type, current + (waste.weight || 0));
      });
    });

    const wasteByType = Array.from(wasteByTypeMap.entries())
      .map(([type, weight]) => ({
        type,
        weight,
        percentage: totalWasteCollected > 0 ? (weight / totalWasteCollected) * 100 : 0
      }))
      .sort((a, b) => b.weight - a.weight);

    // Calculate timeline data (last 6 months)
    const eventsTimeline = calculateTimelineData(completedEvents);

    // Calculate impact score
    const impactScore = calculateImpactScore(
      totalWasteCollected,
      totalParticipants,
      totalInvestment,
      completedEvents.length
    );

    setAnalytics({
      totalWasteCollected,
      totalParticipants,
      totalEventsSupported: completedEvents.length,
      totalInvestment,
      wasteByType,
      eventsTimeline,
      impactScore
    });
  };

  const calculateTimelineData = (events: EventDoc[]) => {
    const months: { [key: string]: { waste: number; events: number } } = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthName(date);
      months[key] = { waste: 0, events: 0 };
    }

    // Populate with actual data
    events.forEach(event => {
      const eventDate = tsToDate(event.eventAt);
      if (eventDate) {
        const monthKey = getMonthName(eventDate);
        if (months[monthKey]) {
          const eventWaste = event.collectedWastes?.reduce((sum, waste) => sum + (waste.weight || 0), 0) || 0;
          months[monthKey].waste += eventWaste;
          months[monthKey].events += 1;
        }
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      waste: data.waste,
      events: data.events
    }));
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleRefresh = () => {
    fetchData();
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(20, 184, 166, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#0d9488'
    }
  };

  const pieChartColors = ['#14B8A6', '#0EA5E9', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981'];

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text className="text-teal-700 mt-4 font-medium">Loading your impact analytics...</Text>
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

  const hasCompletedEvents = analytics && analytics.totalEventsSupported > 0;

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ 
          padding: 20, 
          paddingBottom: 100,
          paddingTop: insets.top + 20 
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
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-extrabold text-teal-600">Impact Analytics</Text>
          <Text className="text-gray-600 mt-2">
            Track the environmental impact of your sponsorships
          </Text>
        </View>

        {!hasCompletedEvents ? (
          <View className="flex-1 justify-center items-center py-20">
            <View className="bg-teal-100 rounded-full p-6 mb-6">
              <Ionicons name="analytics-outline" size={48} color="#0d9488" />
            </View>
            <Text className="text-2xl font-bold text-teal-700 mb-3 text-center">No Impact Data Yet</Text>
            <Text className="text-teal-600 text-center max-w-sm leading-6 mb-6">
              Your sponsored events havenot been completed yet. Impact data will appear here once events are finished and reports are submitted.
            </Text>
            <Pressable
              onPress={handleRefresh}
              className="bg-teal-500 rounded-xl py-4 px-8"
            >
              <Text className="text-white font-bold text-lg">Refresh Data</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Impact Score */}
            <View className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-6 mb-6">
              <Text className="text-white text-lg font-semibold mb-2">Your Environmental Impact Score</Text>
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="text-white text-4xl font-bold">{analytics.impactScore}/100</Text>
                  <Text className="text-teal-100 mt-1">
                    Based on {analytics.totalEventsSupported} completed event{analytics.totalEventsSupported !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View className="bg-white bg-opacity-20 rounded-full p-3">
                  <Ionicons name="trophy" size={32} color="white" />
                </View>
              </View>
            </View>

            {/* Key Metrics */}
            <View className="flex-row flex-wrap justify-between mb-6 -mx-1">
              <View className="w-1/2 p-1">
                <View className="bg-white rounded-2xl border border-gray-200 p-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="leaf-outline" size={20} color="#10B981" />
                    <Text className="text-lg font-bold text-teal-700 ml-2">Waste Collected</Text>
                  </View>
                  <Text className="text-2xl font-bold text-teal-600">{analytics.totalWasteCollected} kg</Text>
                </View>
              </View>
              
              <View className="w-1/2 p-1">
                <View className="bg-white rounded-2xl border border-gray-200 p-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="people-outline" size={20} color="#0EA5E9" />
                    <Text className="text-lg font-bold text-teal-700 ml-2">Volunteers Mobilized</Text>
                  </View>
                  <Text className="text-2xl font-bold text-teal-600">{analytics.totalParticipants}</Text>
                </View>
              </View>

              <View className="w-1/2 p-1 mt-2">
                <View className="bg-white rounded-2xl border border-gray-200 p-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="business-outline" size={20} color="#8B5CF6" />
                    <Text className="text-lg font-bold text-teal-700 ml-2">Total Investment</Text>
                  </View>
                  <Text className="text-2xl font-bold text-teal-600">{formatCurrency(analytics.totalInvestment)}</Text>
                </View>
              </View>

              <View className="w-1/2 p-1 mt-2">
                <View className="bg-white rounded-2xl border border-gray-200 p-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
                    <Text className="text-lg font-bold text-teal-700 ml-2">Events Supported</Text>
                  </View>
                  <Text className="text-2xl font-bold text-teal-600">{analytics.totalEventsSupported}</Text>
                </View>
              </View>
            </View>

            {/* Waste Collection Timeline */}
            <View className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <Text className="text-xl font-bold text-teal-700 mb-4">Waste Collection Timeline</Text>
              <BarChart
                data={{
                  labels: analytics.eventsTimeline.map(item => item.month.split(' ')[0]),
                  datasets: [
                    {
                      data: analytics.eventsTimeline.map(item => item.waste),
                    },
                  ],
                }}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
                yAxisLabel=""
                yAxisSuffix="kg"
                showValuesOnTopOfBars
              />
            </View>

            {/* Waste by Type */}
            {analytics.wasteByType.length > 0 && (
              <View className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                <Text className="text-xl font-bold text-teal-700 mb-4">Waste by Type</Text>
                <PieChart
                  data={analytics.wasteByType.map((item, index) => ({
                    name: item.type,
                    population: item.weight,
                    color: pieChartColors[index % pieChartColors.length],
                    legendFontColor: '#6B7280',
                    legendFontSize: 12,
                  }))}
                  width={screenWidth}
                  height={200}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
                
                {/* Waste Type Details */}
                <View className="mt-4 space-y-2">
                  {analytics.wasteByType.map((item, index) => (
                    <View key={item.type} className="flex-row justify-between items-center py-2 border-b border-gray-100">
                      <View className="flex-row items-center">
                        <View 
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: pieChartColors[index % pieChartColors.length] }}
                        />
                        <Text className="text-gray-700">{item.type}</Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text className="text-gray-600 font-medium">{item.weight} kg</Text>
                        <Text className="text-gray-400 text-sm ml-2">({item.percentage.toFixed(1)}%)</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Environmental Impact */}
            <View className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <Text className="text-xl font-bold text-teal-700 mb-4">Environmental Impact</Text>
              
              <View className="space-y-4">
                <View className="flex-row justify-between items-center p-4 bg-teal-50 rounded-xl">
                  <Text className="text-teal-700 font-medium">Carbon Footprint Reduced</Text>
                  <Text className="text-teal-600 font-bold">
                    {(analytics.totalWasteCollected * 2.5).toFixed(0)} kg CO₂
                  </Text>
                </View>
                
                <View className="flex-row justify-between items-center p-4 bg-blue-50 rounded-xl">
                  <Text className="text-blue-700 font-medium">Equivalent Plastic Bottles</Text>
                  <Text className="text-blue-600 font-bold">
                    {(analytics.totalWasteCollected * 50).toLocaleString()}
                  </Text>
                </View>
                
                <View className="flex-row justify-between items-center p-4 bg-green-50 rounded-xl">
                  <Text className="text-green-700 font-medium">Community Engagement</Text>
                  <Text className="text-green-600 font-bold">
                    {analytics.totalParticipants} people
                  </Text>
                </View>
              </View>
            </View>

            {/* Investment Efficiency */}
            <View className="bg-white rounded-2xl border border-gray-200 p-6">
              <Text className="text-xl font-bold text-teal-700 mb-4">Investment Efficiency</Text>
              
              <View className="space-y-4">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Cost per kg of waste</Text>
                  <Text className="text-teal-700 font-bold">
                    {analytics.totalWasteCollected > 0 
                      ? formatCurrency(analytics.totalInvestment / analytics.totalWasteCollected)
                      : formatCurrency(0)
                    }
                  </Text>
                </View>
                
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Cost per volunteer</Text>
                  <Text className="text-teal-700 font-bold">
                    {analytics.totalParticipants > 0
                      ? formatCurrency(analytics.totalInvestment / analytics.totalParticipants)
                      : formatCurrency(0)
                    }
                  </Text>
                </View>
                
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Cost per event</Text>
                  <Text className="text-teal-700 font-bold">
                    {analytics.totalEventsSupported > 0
                      ? formatCurrency(analytics.totalInvestment / analytics.totalEventsSupported)
                      : formatCurrency(0)
                    }
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}