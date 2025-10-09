// app/eventorganizer/tabs/org_reports.tsx
import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { db } from "../../../services/firebaseConfig";

const { width } = Dimensions.get('window');

type EventDoc = {
  id: string;
  title: string;
  eventAt?: any;
  status: string;
  volunteersNeeded?: number;
  actualParticipants?: number;
  collectedWastes?: { type: string; weight: number }[];
  location?: { label?: string };
};

type ReportData = {
  totalEvents: number;
  completedEvents: number;
  upcomingEvents: number;
  totalVolunteers: number;
  totalParticipants: number;
  totalWasteCollected: number;
  participationRate: number;
  favoriteWasteType: string;
  monthlyStats: { month: string; events: number; waste: number }[];
  recentEvents: EventDoc[];
};

export default function OrgReports() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<"all" | "month" | "quarter" | "year">("all");

  // Live events subscription
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(db, "events"),
      where("organizerId", "==", user.uid),
      orderBy("eventAt", "desc")
    );
    
    const unsub = onSnapshot(
      q,
      (snap) => {
        const allEvents: EventDoc[] = snap.docs.map((d) => ({ 
          id: d.id, 
          ...(d.data() as any) 
        }));
        setEvents(allEvents);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.error("[OrgReports] snapshot error:", err);
        setLoading(false);
        setRefreshing(false);
      }
    );
    
    return () => unsub();
  }, [user?.uid]);

  // Calculate report data
  const reportData: ReportData = React.useMemo(() => {
    const completedEvents = events.filter(e => e.status === "completed");
    const upcomingEvents = events.filter(e => e.status === "open");
    
    const totalParticipants = completedEvents.reduce((sum, event) => 
      sum + (event.actualParticipants || 0), 0
    );
    
    const totalVolunteersRequested = events.reduce((sum, event) => 
      sum + (event.volunteersNeeded || 0), 0
    );
    
    const totalWasteCollected = completedEvents.reduce((sum, event) => 
      sum + (event.collectedWastes?.reduce((wasteSum, waste) => wasteSum + waste.weight, 0) || 0), 0
    );
    
    const participationRate = totalVolunteersRequested > 0 
      ? Math.round((totalParticipants / totalVolunteersRequested) * 100) 
      : 0;

    // Calculate waste type distribution
    const wasteTypeCounts: Record<string, number> = {};
    completedEvents.forEach(event => {
      event.collectedWastes?.forEach(waste => {
        wasteTypeCounts[waste.type] = (wasteTypeCounts[waste.type] || 0) + waste.weight;
      });
    });
    
    const favoriteWasteType = Object.keys(wasteTypeCounts).length > 0
      ? Object.entries(wasteTypeCounts).sort((a, b) => b[1] - a[1])[0][0]
      : "No data";

    // Monthly stats (last 6 months)
    const monthlyStats = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const monthEvents = completedEvents.filter(event => {
        const eventDate = event.eventAt?.toDate?.();
        if (!eventDate) return false;
        return eventDate.getMonth() === date.getMonth() && 
               eventDate.getFullYear() === date.getFullYear();
      });
      
      const monthWaste = monthEvents.reduce((sum, event) => 
        sum + (event.collectedWastes?.reduce((wasteSum, waste) => wasteSum + waste.weight, 0) || 0), 0
      );
      
      return {
        month,
        events: monthEvents.length,
        waste: monthWaste
      };
    }).reverse();

    return {
      totalEvents: events.length,
      completedEvents: completedEvents.length,
      upcomingEvents: upcomingEvents.length,
      totalVolunteers: totalVolunteersRequested,
      totalParticipants,
      totalWasteCollected,
      participationRate,
      favoriteWasteType,
      monthlyStats,
      recentEvents: events.slice(0, 5)
    };
  }, [events]);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const generatePDFReport = async () => {
    Alert.alert(
      "Export Feature",
      "PDF export will be available in the next update! For now, you can use the share feature to export your data summary.",
      [{ text: "OK" }]
    );
  };

  const shareSummary = async () => {
    try {
      const message = `🌊 My EcoConnect Impact Summary 🌊

📊 Events Organized: ${reportData.totalEvents}
✅ Completed: ${reportData.completedEvents}
👥 Total Volunteers: ${reportData.totalParticipants}
🗑️ Waste Collected: ${reportData.totalWasteCollected} kg
📈 Participation Rate: ${reportData.participationRate}%

Join me in making our environment cleaner! 🌍

#EcoConnect #CleanupImpact #EnvironmentalAction`;

      await Share.share({
        message,
        title: 'My EcoConnect Impact Report'
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  // Stat Card Component
  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color = "blue",
    trend 
  }: { 
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color?: "blue" | "green" | "purple" | "orange" | "red";
    trend?: string;
  }) => {
    const colorMap = {
      blue: "from-blue-500 to-blue-600",
      green: "from-green-500 to-green-600",
      purple: "from-purple-500 to-purple-600",
      orange: "from-orange-500 to-orange-600",
      red: "from-red-500 to-red-600"
    };

    return (
      <View className={`rounded-3xl p-6 bg-gradient-to-br ${colorMap[color]} shadow-xl mb-4`}>
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-white/80 text-sm font-medium">{title}</Text>
            <Text className="text-white text-2xl font-bold mt-1">{value}</Text>
            {subtitle && <Text className="text-white/70 text-xs mt-1">{subtitle}</Text>}
            {trend && <Text className="text-white/90 text-xs font-medium mt-2">{trend}</Text>}
          </View>
          <View className="bg-white/20 p-3 rounded-2xl">
            <Ionicons name={icon as any} size={24} color="white" />
          </View>
        </View>
      </View>
    );
  };

  // Progress Bar Component
  const ProgressBar = ({ percentage, color = "blue" }: { percentage: number; color?: string }) => {
    const colorMap = {
      blue: "bg-blue-500",
      green: "bg-green-500",
      purple: "bg-purple-500",
      orange: "bg-orange-500",
      red: "bg-red-500"
    };

    return (
      <View className="h-3 bg-white/20 rounded-full overflow-hidden mt-2">
        <View 
          className={`h-full ${colorMap[color]} rounded-full`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gradient-to-br from-blue-50 to-purple-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-600 mt-4 text-lg font-medium">Loading your reports...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <View className="px-6 pt-12 pb-6 bg-gradient-to-r from-blue-600 to-purple-600 shadow-2xl">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-3xl font-bold text-white">Impact Reports</Text>
            <Text className="text-blue-100 font-medium mt-1">Track your environmental impact</Text>
          </View>
          <Pressable 
            onPress={shareSummary}
            className="bg-white/10 p-3 rounded-2xl border border-white/20"
          >
            <Ionicons name="share-social-outline" size={24} color="white" />
          </Pressable>
        </View>

        {/* Period Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
          <View className="flex-row space-x-2">
            {[
              { key: "all", label: "All Time" },
              { key: "month", label: "This Month" },
              { key: "quarter", label: "This Quarter" },
              { key: "year", label: "This Year" }
            ].map((period) => (
              <Pressable
                key={period.key}
                onPress={() => setSelectedPeriod(period.key as any)}
                className={`px-4 py-2 rounded-2xl ${
                  selectedPeriod === period.key 
                    ? "bg-white" 
                    : "bg-white/10 border border-white/20"
                }`}
              >
                <Text className={
                  selectedPeriod === period.key 
                    ? "text-blue-600 font-semibold" 
                    : "text-white font-medium"
                }>
                  {period.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats Grid */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-4">Overview</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
            <View style={{ width: '50%', padding: 8 }}>
              <StatCard
                title="Total Events"
                value={reportData.totalEvents}
                icon="calendar-outline"
                color="blue"
              />
            </View>
            <View style={{ width: '50%', padding: 8 }}>
              <StatCard
                title="Completed"
                value={reportData.completedEvents}
                subtitle={`${reportData.upcomingEvents} upcoming`}
                icon="checkmark-done-outline"
                color="green"
              />
            </View>
            <View style={{ width: '50%', padding: 8 }}>
              <StatCard
                title="Total Volunteers"
                value={reportData.totalParticipants}
                subtitle={`${reportData.participationRate}% participation`}
                icon="people-outline"
                color="purple"
              />
            </View>
            <View style={{ width: '50%', padding: 8 }}>
              <StatCard
                title="Waste Collected"
                value={`${reportData.totalWasteCollected} kg`}
                subtitle={`Most: ${reportData.favoriteWasteType}`}
                icon="trash-outline"
                color="orange"
              />
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View className="bg-white rounded-3xl p-6 shadow-xl mb-6 border-2 border-gray-100">
          <Text className="text-xl font-bold text-gray-900 mb-4">Performance Metrics</Text>
          
          <View className="space-y-4">
            <View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-700 font-medium">Event Completion Rate</Text>
                <Text className="text-gray-900 font-bold">
                  {reportData.totalEvents > 0 
                    ? Math.round((reportData.completedEvents / reportData.totalEvents) * 100) 
                    : 0}%
                </Text>
              </View>
              <ProgressBar 
                percentage={reportData.totalEvents > 0 ? (reportData.completedEvents / reportData.totalEvents) * 100 : 0} 
                color="green" 
              />
            </View>

            <View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-700 font-medium">Volunteer Participation</Text>
                <Text className="text-gray-900 font-bold">{reportData.participationRate}%</Text>
              </View>
              <ProgressBar percentage={reportData.participationRate} color="blue" />
            </View>

            <View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-700 font-medium">Waste Collection Efficiency</Text>
                <Text className="text-gray-900 font-bold">
                  {reportData.completedEvents > 0 
                    ? Math.round(reportData.totalWasteCollected / reportData.completedEvents) 
                    : 0} kg/event
                </Text>
              </View>
              <ProgressBar 
                percentage={Math.min((reportData.totalWasteCollected / (reportData.completedEvents * 50)) * 100, 100)} 
                color="orange" 
              />
            </View>
          </View>
        </View>

        {/* Monthly Trends */}
        <View className="bg-white rounded-3xl p-6 shadow-xl mb-6 border-2 border-gray-100">
          <Text className="text-xl font-bold text-gray-900 mb-4">Monthly Trends</Text>
          <View className="space-y-3">
            {reportData.monthlyStats.map((stat, index) => (
              <View key={index} className="flex-row justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <Text className="text-gray-700 font-medium flex-1">{stat.month}</Text>
                <View className="flex-row space-x-4">
                  <Text className="text-gray-600 font-medium">{stat.events} events</Text>
                  <Text className="text-orange-600 font-bold">{stat.waste} kg</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Events */}
        <View className="bg-white rounded-3xl p-6 shadow-xl mb-6 border-2 border-gray-100">
          <Text className="text-xl font-bold text-gray-900 mb-4">Recent Events</Text>
          <View className="space-y-3">
            {reportData.recentEvents.map((event) => (
              <View key={event.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <Text className="text-gray-900 font-bold text-lg mb-1">{event.title}</Text>
                <View className="flex-row justify-between items-center">
                  <Text className={`px-3 py-1 rounded-full text-xs font-bold ${
                    event.status === 'completed' 
                      ? 'bg-green-100 text-green-800'
                      : event.status === 'in_progress'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    {event.actualParticipants || 0} participants
                  </Text>
                </View>
                {event.collectedWastes && event.collectedWastes.length > 0 && (
                  <Text className="text-gray-600 text-sm mt-2">
                    🗑️ {event.collectedWastes.reduce((sum, waste) => sum + waste.weight, 0)} kg collected
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Export Section */}
        <View className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-6 shadow-2xl">
          <Text className="text-white text-xl font-bold mb-2">Export Your Impact</Text>
          <Text className="text-white/80 text-sm mb-4">
            Share your environmental impact with sponsors, community, or keep for records
          </Text>
          
          <View className="flex-row space-x-3">
            <Pressable 
              onPress={generatePDFReport}
              className="flex-1 bg-white rounded-2xl py-4 items-center shadow-lg"
            >
              <Ionicons name="document-text-outline" size={24} color="#3b82f6" />
              <Text className="text-blue-600 font-bold mt-1">PDF Report</Text>
            </Pressable>
            
            <Pressable 
              onPress={shareSummary}
              className="flex-1 bg-white/20 rounded-2xl py-4 items-center border border-white/30"
            >
              <Ionicons name="share-social-outline" size={24} color="white" />
              <Text className="text-white font-bold mt-1">Share Summary</Text>
            </Pressable>
          </View>
        </View>

        {/* Impact Message */}
        <View className="mt-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-6 shadow-xl">
          <Text className="text-white text-xl font-bold text-center mb-2">🌍 Environmental Impact</Text>
          <Text className="text-white/90 text-center text-sm">
            You've helped remove {reportData.totalWasteCollected} kg of waste from our environment! 
            That's equivalent to saving approximately {Math.round(reportData.totalWasteCollected * 3.5)} 
            kg of CO2 emissions. Thank you for making a difference! 🌟
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}