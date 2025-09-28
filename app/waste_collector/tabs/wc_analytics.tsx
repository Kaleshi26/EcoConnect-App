import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp
} from "firebase/firestore";
import {
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Package,
  TrendingUp
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Text,
  View
} from "react-native";
import { db } from "../../../services/firebaseConfig";

type EventDoc = {
  id: string;
  title: string;
  description?: string;
  eventAt?: Timestamp;
  location?: { label?: string; lat?: number; lng?: number };
  wasteTypes?: string[];
  estimatedQuantity?: string;
  priority?: string;
  status?: "Pending" | "In-progress" | "Completed";
  assignedTo?: string;
  proofUrl?: string;
  completedAt?: Timestamp;
  collectedWeights?: Record<string, string>;
};

function tsToDate(ts?: Timestamp) {
  try {
    if (!ts) return null;
    // @ts-ignore
    if (typeof ts.toDate === "function") return ts.toDate();
  } catch {}
  return null;
}

const Analytics = ({ userId }: { userId: string }) => {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const screenWidth = Dimensions.get('window').width;

  // Fetch assigned events
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const all: EventDoc[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((ev) => ev.assignedTo === userId);
        setEvents(all);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [userId]);

  // Calculate comprehensive waste statistics
  const wasteAnalytics = useMemo(() => {
    const completedEvents = events.filter(ev => ev.status === "Completed");
    const pendingEvents = events.filter(ev => ev.status === "Pending");
    const inProgressEvents = events.filter(ev => ev.status === "In-progress");
    
    let stats = {
      totalWeight: 0,
      plasticBottles: 0,
      plasticBags: 0,
      fishingGear: 0,
      glass: 0,
      cans: 0,
      other: 0
    };

    completedEvents.forEach(ev => {
      if (ev.collectedWeights) {
        Object.entries(ev.collectedWeights).forEach(([type, weight]) => {
          const weightNum = parseFloat(weight) || 0;
          const normalizedType = type.toLowerCase().replace(/\s+/g, '');
          
          stats.totalWeight += weightNum;
          
          switch (normalizedType) {
            case 'plasticbottles':
              stats.plasticBottles += weightNum;
              break;
            case 'plasticbags':
              stats.plasticBags += weightNum;
              break;
            case 'fishinggear':
              stats.fishingGear += weightNum;
              break;
            case 'glass':
              stats.glass += weightNum;
              break;
            case 'cans':
              stats.cans += weightNum;
              break;
            case 'other':
              stats.other += weightNum;
              break;
            default:
              if (type.toLowerCase().includes('plastic') && type.toLowerCase().includes('bottle')) {
                stats.plasticBottles += weightNum;
              } else if (type.toLowerCase().includes('plastic') && type.toLowerCase().includes('bag')) {
                stats.plasticBags += weightNum;
              } else if (type.toLowerCase().includes('fishing')) {
                stats.fishingGear += weightNum;
              } else if (type.toLowerCase().includes('glass')) {
                stats.glass += weightNum;
              } else if (type.toLowerCase().includes('can')) {
                stats.cans += weightNum;
              } else {
                stats.other += weightNum;
              }
              break;
          }
        });
      }
    });

    // Calculate percentages
    const wasteTypes = [
      { name: 'Plastic Bottles', value: stats.plasticBottles, color: '#3b82f6' },
      { name: 'Plastic Bags', value: stats.plasticBags, color: '#10b981' },
      { name: 'Fishing Gear', value: stats.fishingGear, color: '#f59e0b' },
      { name: 'Glass', value: stats.glass, color: '#ef4444' },
      { name: 'Cans', value: stats.cans, color: '#8b5cf6' },
      { name: 'Other', value: stats.other, color: '#6b7280' }
    ].filter(item => item.value > 0);

    // Calculate monthly data for trend analysis
    const monthlyData: Record<string, number> = {};
    completedEvents.forEach(ev => {
      if (ev.completedAt && ev.collectedWeights) {
        const date = tsToDate(ev.completedAt);
        if (date) {
          const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          const totalWeight = Object.values(ev.collectedWeights).reduce((sum, weight) => {
            return sum + (parseFloat(weight) || 0);
          }, 0);
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + totalWeight;
        }
      }
    });

    // Calculate performance metrics
    const completionRate = events.length > 0 ? (completedEvents.length / events.length) * 100 : 0;
    const averageWeightPerAssignment = completedEvents.length > 0 ? stats.totalWeight / completedEvents.length : 0;
    
    // Calculate weekly data
    const weeklyData: Record<string, number> = {};
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    completedEvents.forEach(ev => {
      if (ev.completedAt) {
        const date = tsToDate(ev.completedAt);
        if (date && date >= weekAgo) {
          const dayKey = date.toLocaleDateString('en-US', { weekday: 'short' });
          const totalWeight = Object.values(ev.collectedWeights || {}).reduce((sum, weight) => {
            return sum + (parseFloat(weight) || 0);
          }, 0);
          weeklyData[dayKey] = (weeklyData[dayKey] || 0) + totalWeight;
        }
      }
    });
    
    
    return {
      ...stats,
      completedAssignments: completedEvents.length,
      totalAssignments: events.length,
      pendingAssignments: pendingEvents.length,
      inProgressAssignments: inProgressEvents.length,
      completionRate,
      averageWeightPerAssignment,
      wasteTypeBreakdown: wasteTypes,
      monthlyTrend: Object.entries(monthlyData).map(([month, weight]) => ({
        month,
        weight
      })).slice(-6), // Last 6 months
      weeklyTrend: Object.entries(weeklyData).map(([day, weight]) => ({
        day,
        weight
      }))
    };
  }, [events]);

  // Custom Pie Chart Component
  const CustomPieChart = ({ data }: { data: Array<{name: string, value: number, color: string}> }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const chartSize = 160;
    const center = chartSize / 2;
    const radius = 70;
    
    let currentAngle = 0;
    
    const segments = data.map(item => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;
      
      // Calculate position for percentage labels
      const labelAngle = (startAngle + endAngle) / 2;
      const labelRadius = radius * 0.7;
      const labelX = center + labelRadius * Math.cos((labelAngle - 90) * Math.PI / 180);
      const labelY = center + labelRadius * Math.sin((labelAngle - 90) * Math.PI / 180);
      
      return {
        ...item,
        percentage,
        startAngle,
        endAngle,
        labelX,
        labelY
      };
    });

    return (
      <View className="items-center">
        <View style={{ width: chartSize, height: chartSize }} className="relative">
          {/* Chart Background */}
          <View 
            style={{
              width: chartSize,
              height: chartSize,
              borderRadius: chartSize / 2,
              backgroundColor: '#f3f4f6'
            }}
            className="absolute"
          />
          
          {/* Segments */}
          {segments.map((segment, index) => {
            const circumference = 2 * Math.PI * radius;
            const strokeDasharray = `${(segment.percentage / 100) * circumference} ${circumference}`;
            const rotation = (segment.startAngle - 90);
            
            return (
              <View
                key={index}
                style={{
                  position: 'absolute',
                  width: chartSize,
                  height: chartSize,
                  borderRadius: chartSize / 2,
                  borderWidth: 20,
                  borderColor: segment.color,
                  borderStyle: 'solid',
                  transform: [{ rotate: `${rotation}deg` }],
                }}
                className="opacity-80"
              />
            );
          })}
          
          {/* Center Circle */}
          <View 
            style={{
              position: 'absolute',
              width: chartSize - 40,
              height: chartSize - 40,
              borderRadius: (chartSize - 40) / 2,
              backgroundColor: 'white',
              top: 20,
              left: 20,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Text className="text-2xl font-bold text-gray-900">{total.toFixed(1)}</Text>
            <Text className="text-sm text-gray-600">kg total</Text>
          </View>
        </View>
        
        {/* Legend */}
        <View className="flex-row flex-wrap justify-center mt-4">
          {segments.map((segment, index) => (
            <View key={index} className="flex-row items-center m-1 bg-gray-50 px-3 py-1 rounded-full">
              <View 
                style={{ backgroundColor: segment.color }}
                className="w-3 h-3 rounded-full mr-2"
              />
              <Text className="text-xs text-gray-700">{segment.percentage.toFixed(1)}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Render pie chart data for Recharts
  const pieChartData = wasteAnalytics.wasteTypeBreakdown.map(item => ({
    name: item.name,
    value: item.value,
    fill: item.color
  }));

  if (loading) {
    return (
      <View className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50 justify-center items-center">
        <View className="bg-white p-6 rounded-2xl shadow-sm">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-gray-600 mt-3 font-medium">Loading analytics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gradient-to-br from-slate-50 to-blue-50">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <View className="bg-blue-100 p-3 rounded-2xl mr-4">
            <BarChart3 size={28} color="#2563eb" />
          </View>
          <View>
            <Text className="text-2xl font-bold text-gray-900">Analytics Dashboard</Text>
            <Text className="text-gray-600">Your collection performance overview</Text>
          </View>
        </View>

        {/* Key Metrics Row */}
        <View className="flex-row flex-wrap mb-6">
          <View className="w-1/2 pr-2 mb-4">
            <View className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-400">
              <View className="flex-row items-center mb-2">
                <Package size={20} color="#2563eb" />
                <Text className="text-gray-600 text-sm ml-2">Total Weight</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-900">{wasteAnalytics.totalWeight.toFixed(1)}</Text>
              <Text className="text-gray-500 text-xs">kg collected</Text>
            </View>
          </View>
          
          <View className="w-1/2 pl-2 mb-4">
            <View className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-green-400">
              <View className="flex-row items-center mb-2">
                <CheckCircle size={20} color="#059669" />
                <Text className="text-gray-600 text-sm ml-2">Completed</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-900">{wasteAnalytics.completedAssignments}</Text>
              <Text className="text-gray-500 text-xs">assignments</Text>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View className="flex-row flex-wrap mb-6">
          <View className="w-1/2 pr-2 mb-4">
            <View className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-purple-400">
              <View className="flex-row items-center mb-2">
                <TrendingUp size={20} color="#7c3aed" />
                <Text className="text-gray-600 text-sm ml-2">Efficiency</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-900">{wasteAnalytics.completionRate.toFixed(0)}%</Text>
              <Text className="text-gray-500 text-xs">completion rate</Text>
            </View>
          </View>
          
          <View className="w-1/2 pl-2 mb-4">
            <View className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-orange-400">
              <View className="flex-row items-center mb-2">
                <Clock size={20} color="#f97316" />
                <Text className="text-gray-600 text-sm ml-2">Avg Weight</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-900">{wasteAnalytics.averageWeightPerAssignment.toFixed(1)}</Text>
              <Text className="text-gray-500 text-xs">kg per assignment</Text>
            </View>
          </View>
        </View>

        {/* Weekly Performance Chart */}
        {wasteAnalytics.weeklyTrend.length > 0 && (
          <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <View className="bg-green-100 p-2 rounded-lg mr-3">
                <Calendar size={20} color="#059669" />
              </View>
              <Text className="text-lg font-bold text-gray-900">This Week's Performance</Text>
            </View>
            
            <View className="space-y-3">
              {wasteAnalytics.weeklyTrend.map((item, index) => {
                const maxWeight = Math.max(...wasteAnalytics.weeklyTrend.map(d => d.weight));
                const barWidth = maxWeight > 0 ? (item.weight / maxWeight) * 100 : 0;
                
                return (
                  <View key={index} className="flex-row items-center">
                    <Text className="text-gray-600 text-sm w-12">{item.day}</Text>
                    <View className="flex-1 bg-gray-200 rounded-full h-4 mx-3 overflow-hidden">
                      <View 
                        className="bg-green-500 h-4 rounded-full flex-row items-center justify-end pr-2"
                        style={{ width: `${Math.max(barWidth, 5)}%` }}
                      >
                        <Text className="text-white text-xs font-semibold">
                          {item.weight.toFixed(1)}kg
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* For Waste Type Distribution */}
        {wasteAnalytics.wasteTypeBreakdown.length > 0 && (
          <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <View className="bg-blue-100 p-2 rounded-lg mr-3">
                <Package size={20} color="#2563eb" />
              </View>
              <Text className="text-lg font-bold text-gray-900">For Waste Type Distribution</Text>
            </View>
            
            {/* Detailed breakdown */}
            <View className="space-y-2">
              {wasteAnalytics.wasteTypeBreakdown.map((item, index) => (
                <View key={index} className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <View className="flex-row items-center">
                    <View 
                      style={{ backgroundColor: item.color }}
                      className="w-4 h-4 rounded-full mr-3"
                    />
                    <Text className="font-medium text-gray-800">{item.name}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-bold text-gray-900">{item.value.toFixed(1)} kg</Text>
                    <Text className="text-xs text-gray-500">
                      {((item.value / wasteAnalytics.totalWeight) * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}


        {/* Empty State */}
        {wasteAnalytics.totalWeight === 0 && (
          <View className="bg-white rounded-2xl p-8 items-center">
            <View className="bg-gray-100 p-4 rounded-full mb-4">
              <BarChart3 size={32} color="#6b7280" />
            </View>
            <Text className="text-gray-600 text-center font-medium mb-2">
              No data available yet
            </Text>
            <Text className="text-gray-500 text-center text-sm">
              Complete some assignments to see your analytics
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default Analytics;
