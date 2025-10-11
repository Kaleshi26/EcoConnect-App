// app/eventorganizer/tabs/org_reports.tsx
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";

import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View
} from "react-native";

import { useAuth } from "../../../contexts/AuthContext";
import { db } from "../../../services/firebaseConfig";

const { width } = Dimensions.get('window');

// --- CORRECT AI SETUP ---
const PAT = 'ac9054dae5984f66b297de6f510bbcb0'; // Your key from the screenshot
const USER_ID = 'yn0njmazqq4r'; // From your URL
const APP_ID = 'EcoConnect-App'; // From your URL
const MODEL_ID = 'general-image-recognition';
const MODEL_VERSION_ID = 'aa7f35c01e0642fda5cf400f543e7c40';
// --- END OF SETUP ---


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

  const [isCameraVisible, setCameraVisible] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  


  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any[] | null>(null);


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


  const takePicture = async () => {
    if (!cameraRef.current) return;

    // Show the loading indicator immediately
    setIsAnalyzing(true);
    setCameraVisible(false);

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });

      // Check if we actually got the base64 data needed for the AI
      if (photo && photo.base64) {
        // Now, call the analysis function with the photo data
        await analyzeImage(photo.base64);
      } else {
        throw new Error("Captured image data is missing.");
      }
    } catch (error: any) {
      console.error("Failed to capture or analyze image:", error);
      Alert.alert("Capture Failed", "Could not capture or process the image. Please try again.");
      // Stop the loading indicator if an error occurs
      setIsAnalyzing(false);
    }
  };



  const analyzeImage = async (base64Image: string) => {
  try {
    const raw = JSON.stringify({
      user_app_id: {
        user_id: USER_ID,
        app_id: APP_ID,
      },
      inputs: [
        {
          data: {
            image: { base64: base64Image },
          },
        },
      ],
    });

    const response = await fetch(
      `https://api.clarifai.com/v2/models/${MODEL_ID}/versions/${MODEL_VERSION_ID}/outputs`,
      {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": "Key " + PAT,
        },
        body: raw,
      }
    );

    const jsonResponse = await response.json();

    // ✅ Better error check
    if (!response.ok || jsonResponse.status.code !== 10000) {
      console.log("Clarifai raw response:", jsonResponse);
      throw new Error(
        jsonResponse.status?.description || "Failed to analyze image."
      );
    }

    const outputs = jsonResponse.outputs?.[0];
    if (!outputs || !outputs.data?.concepts) {
      throw new Error("No recognizable concepts found in response.");
    }

    const concepts = outputs.data.concepts;
    const relevantConcepts = concepts.filter((c: any) =>
      ["plastic", "bottle", "fishing net", "bag", "wrapper", "can", "glass", "debris", "pollution"].some(
        (keyword) => c.name.toLowerCase().includes(keyword)
      )
    );

      setAnalysisResult(relevantConcepts);
    } catch (error: any) {
      console.error("Clarifai analysis error:", error);
      Alert.alert("AI Error", error.message || "Could not analyze the image.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  
  const generateEcologicalStory = (concepts: any[]) => {
      const hasNets = concepts.some(c => c.name.includes('net'));
      const hasPlastic = concepts.some(c => c.name.includes('plastic') || c.name.includes('bottle') || c.name.includes('bag'));
      let story = "Thank you for your cleanup effort!\n\n";
      
      if (hasNets) {
          story += "🐢 By removing fishing nets from the coast in October, you've helped clear a vital nesting ground for Sri Lanka's sea turtles just as their nesting season begins. Your work directly protects the next generation.\n\n";
      }
      if (hasPlastic) {
          story += "🐦 Removing plastic waste prevents it from breaking into microplastics, protecting local seabirds and marine life that mistake it for food.\n";
      }
      if (!hasNets && !hasPlastic) {
          story += "Even small cleanups have a big impact on maintaining the beauty and health of our local beaches for everyone to enjoy."
      }
      return story;
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
      blue: "bg-blue-600",
      green: "bg-green-600",
      purple: "bg-purple-600",
      orange: "bg-orange-600",
      red: "bg-red-600"
    };

    return (
      <View className={`rounded-3xl p-6 ${colorMap[color]} shadow-xl mb-4`}>
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
      <ImageBackground
        source={{ uri: "https://do6raq9h04ex.cloudfront.net/sites/8/2023/11/hikkaduwa-beach-1050x700-1.jpg" }}
        resizeMode="cover"
        className="shadow-2xl"
      >
        <View className="px-6 pt-12 pb-6 bg-black/40">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-3xl font-bold text-white">Impact Reports</Text>
              <Text className="text-white/80 font-medium mt-1">Track your environmental impact</Text>
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
      </ImageBackground>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >

        <View className="mb-6">
          <Pressable
              onPress={async () => {
                // This logic correctly checks and requests permission
                if (!permission) {
                  // Permissions are still loading
                  return;
                }
                if (!permission.granted) {
                  // Ask for permission
                  const { granted } = await requestPermission();
                  if (!granted) {
                    Alert.alert("Permission Required", "Please enable camera access in your device settings to use this feature.");
                    return;
                  }
                }
                // If we have permission, open the camera
                setCameraVisible(true);
              }}
              className="bg-purple-600 p-4 rounded-2xl shadow-lg flex-row items-center justify-center"
          >
              <Ionicons name="sparkles" size={22} color="white" />
              <Text className="text-white font-bold text-base ml-3">Create AI Impact Report</Text>
          </Pressable>
        </View>

        {/* Quick Stats Grid */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-4">Your Impact Overview</Text>
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
        <View className="bg-blue-600 rounded-3xl p-6 shadow-2xl">
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
        <View className="mt-6 bg-green-600 rounded-3xl p-6 shadow-xl">
          <Text className="text-white text-xl font-bold text-center mb-2">🌍 Environmental Impact</Text>
          <Text className="text-white/90 text-center text-sm">
            You've helped remove {reportData.totalWasteCollected} kg of waste from our environment! 
            That's equivalent to saving approximately {Math.round(reportData.totalWasteCollected * 3.5)} 
            kg of CO2 emissions. Thank you for making a difference! 🌟
          </Text>
        </View>
      </ScrollView>

      <Modal visible={isCameraVisible} animationType="slide">
        <View style={{ flex: 1 }}>
          {permission?.granted ? (
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
          ) : (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "black" }}>
              <Text style={{ color: "white", fontSize: 18, marginBottom: 20 }}>
                Camera permission required
              </Text>
              <Pressable onPress={requestPermission} className="bg-blue-600 px-6 py-3 rounded-xl">
                <Text className="text-white font-bold">Grant Permission</Text>
              </Pressable>
            </View>
          )}
          
          <View className="absolute bottom-12 left-0 right-0 items-center">
            <Pressable onPress={takePicture} className="w-20 h-20 bg-white rounded-full border-4 border-gray-400" />
            <Pressable onPress={() => setCameraVisible(false)} className="mt-4">
              <Text className="text-white font-semibold text-lg" style={{ textShadowColor: 'rgba(0, 0, 0, 0.7)', textShadowRadius: 4 }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>


      <Modal visible={isAnalyzing || !!analysisResult} transparent={true} animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center p-6">
          <View className="bg-white rounded-2xl p-6 w-full items-center">
            {isAnalyzing ? (
              <>
                <ActivityIndicator size="large" color="#4f46e5" />
                <Text className="mt-4 text-gray-700 font-semibold text-lg">Analyzing your haul...</Text>
              </>
            ) : (
              analysisResult && <>
                <Ionicons name="leaf" size={40} color="#10b981" />
                <Text className="text-2xl font-bold mt-4 mb-2 text-center">Impact Analysis Complete!</Text>
                <Text className="text-gray-600 text-center mb-6">{generateEcologicalStory(analysisResult)}</Text>
                <Pressable onPress={() => setAnalysisResult(null)} className="bg-blue-600 px-8 py-3 rounded-xl">
                    <Text className="text-white font-bold">Awesome!</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>


    </View>
  );
}