import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import {
    addDoc,
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
    Brain,
    Calendar,
    Camera,
    CheckCircle,
    CheckCircle2,
    ChevronLeft,
    Clock,
    Image as ImageIcon,
    MapPin,
    Package,
    PlayCircle,
    Search,
    Trash2,
    Truck,
    X,
    Zap
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { db, storage } from "../../../services/firebaseConfig";

type EventDoc = {
  id: string;
  title: string;
  description?: string;
  eventAt?: Timestamp;
  location?: { label?: string; lat?: number; lng?: number };
  wasteTypes?: string[];
  estimatedQuantity?: string;
  priority?: string;
  status?: "Pending" | "In-progress" | "Completed" | "open" | "in_progress" | "completed";
  assignedTo?: string;
  proofUrl?: string;
  proofImages?: string[];
  completedAt?: Timestamp;
  collectedWeights?: Record<string, string>;
  // Additional fields from org_events
  volunteersNeeded?: number;
  sponsorshipRequired?: boolean;
  organizerId?: string;
  organizerRole?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  imageUrl?: string;
  imageUrls?: string[];
  resourcesNeeded?: string;
  actualParticipants?: number;
  collectedWastes?: { type: string; weight: number }[];
  evidencePhotos?: string[];
};

function tsToDate(ts?: Timestamp) {
  try {
    if (!ts) return null;
    // @ts-ignore
    if (typeof ts.toDate === "function") return ts.toDate();
  } catch {}
  return null;
}

function formatDate(d?: Date | null) {
  if (!d) return undefined;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(d?: Date | null) {
  if (!d) return undefined;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// AI/ML Suggestions Modal Component
function AISuggestionsModal({ 
  visible, 
  onClose, 
  wasteTypes, 
  collectedWeights 
}: { 
  visible: boolean;
  onClose: () => void;
  wasteTypes?: string[];
  collectedWeights?: Record<string, string>;
}) {
  const [suggestions, setSuggestions] = useState<Array<{
    category: string;
    suggestion: string;
    tip: string;
  }>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!visible || !wasteTypes || wasteTypes.length === 0) {
      setSuggestions([]);
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate AI processing time
    setTimeout(() => {
      const newSuggestions: typeof suggestions = [];
      
      // Analyze waste types and generate suggestions
      wasteTypes.forEach(wasteType => {
        const lowerType = wasteType.toLowerCase();
        const weight = collectedWeights?.[wasteType] ? parseFloat(collectedWeights[wasteType]) : 0;
        
        // Plastic Bottles
        if (lowerType.includes('plastic') && lowerType.includes('bottle')) {
          newSuggestions.push({
            category: "Plastic Bottles",
            suggestion: "Recycle at nearest plastic recycling center",
            tip: "Rinse bottles thoroughly and remove caps before recycling. Crushing bottles saves 70% storage space."
          });
        }
        
        // Plastic Bags
        if (lowerType.includes('plastic') && lowerType.includes('bag')) {
          newSuggestions.push({
            category: "Plastic Bags",
            suggestion: "Sort and recycle at grocery store collection points",
            tip: "Sort bags separately before recycling. Clean, dry plastic bags can be recycled into composite lumber."
          });
        }
        
        // Fishing Gear
        if (lowerType.includes('fishing') || lowerType.includes('gear') || lowerType.includes('net')) {
          newSuggestions.push({
            category: "Fishing Gear",
            suggestion: "Special disposal required - Contact marine conservation center",
            tip: "Fishing nets and gear are extremely hazardous to marine life. Requires specialized processing to prevent ocean pollution."
          });
        }
        
        // Glass
        if (lowerType.includes('glass')) {
          newSuggestions.push({
            category: "Glass",
            suggestion: "Recycle at glass-specific facilities",
            tip: "Glass is 100% recyclable infinitely without quality loss. Sort by color (clear, green, brown) for optimal recycling."
          });
        }
        
        // Metal/Aluminum Cans
        if (lowerType.includes('can') || lowerType.includes('metal') || lowerType.includes('aluminum')) {
          newSuggestions.push({
            category: "Metal Cans",
            suggestion: "Recycle at metal recycling center",
            tip: "Rinse cans and flatten them to save space. Aluminum recycling saves 95% of energy compared to producing new aluminum."
          });
        }
        
        // Other/Mixed Waste
        if (lowerType.includes('other') || lowerType.includes('mixed')) {
          newSuggestions.push({
            category: "Mixed Waste",
            suggestion: "Sort and dispose at certified waste management facility",
            tip: "Always separate recyclables from general waste. Contact facility for specific sorting guidelines."
          });
        }
        
        // High volume warning
        if (weight > 50) {
          newSuggestions.push({
            category: "High Volume Collection",
            suggestion: "Consider bulk recycling service for efficiency",
            tip: "Large collections (over 50kg) qualify for pickup service. Contact Bulk Waste Collection Service for scheduling."
          });
        }
      });

      // Remove duplicates
      const uniqueSuggestions = newSuggestions.filter((suggestion, index, self) => 
        index === self.findIndex(s => s.category === suggestion.category)
      );
      
      setSuggestions(uniqueSuggestions);
      setIsAnalyzing(false);
    }, 1000); // Simulate AI processing time
  }, [visible, wasteTypes, collectedWeights]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-6 pt-12 pb-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="bg-purple-100 p-2 rounded-lg mr-3">
                <Brain size={24} color="#7c3aed" />
              </View>
              <View>
                <Text className="text-xl font-bold text-gray-900">AI Disposal Guide</Text>
                <Text className="text-sm text-gray-500">Smart eco-friendly recommendations</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="bg-gray-100 p-2 rounded-full"
            >
              <Text className="text-gray-600 text-lg font-bold">×</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 px-6 py-4">
          {isAnalyzing ? (
            <View className="py-16 items-center">
              <View className="bg-purple-50 p-6 rounded-full mb-4">
                <ActivityIndicator size="large" color="#7c3aed" />
              </View>
              <Text className="text-gray-700 text-lg font-semibold mb-2">Analyzing Waste Composition</Text>
              <Text className="text-gray-500 text-sm text-center">
                Our AI is analyzing your waste mix to provide optimal disposal recommendations...
              </Text>
            </View>
          ) : suggestions.length > 0 ? (
            <>
              <View className="mb-6">
                <Text className="text-gray-800 text-lg font-semibold mb-2">
                  🎯 Eco-Friendly Disposal Recommendations
                </Text>
                <Text className="text-gray-600 text-sm">
                  Based on your waste mix, here are {suggestions.length} optimized suggestion{suggestions.length !== 1 ? 's' : ''}:
                </Text>
              </View>

              <View className="space-y-4 mb-6">
                {suggestions.map((suggestion, index) => (
                  <View 
                    key={index} 
                    className="bg-white border-2 border-green-200 p-6 rounded-2xl shadow-md"
                  >
                    {/* Category */}
                    <View className="mb-4">
                      <Text className="text-xs font-bold text-gray-500 mb-1">CATEGORY</Text>
                      <Text className="text-xl font-bold text-gray-900">{suggestion.category}</Text>
                    </View>

                    {/* Suggestion */}
                    <View className="bg-emerald-50 p-4 rounded-xl mb-4 border-l-4 border-emerald-500">
                      <Text className="text-xs font-bold text-emerald-700 mb-2">SUGGESTION</Text>
                      <Text className="text-emerald-900 font-semibold leading-relaxed">
                        {suggestion.suggestion}
                      </Text>
                    </View>

                    {/* Tip */}
                    <View className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500">
                      <Text className="text-xs font-bold text-blue-700 mb-2">TIP</Text>
                      <Text className="text-blue-900 leading-relaxed">
                        {suggestion.tip}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <View className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 mb-6">
                <View className="flex-row items-start">
                  <Text className="text-blue-600 text-xl mr-3">💡</Text>
                  <View className="flex-1">
                    <Text className="text-blue-800 text-base font-semibold mb-2">
                      Environmental Impact
                    </Text>
                    <Text className="text-blue-700 text-sm leading-relaxed">
                      Following these suggestions helps maximize recycling rates and reduces environmental impact by up to 80%. 
                      You're making a real difference for our planet! 🌍
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View className="py-16 items-center">
              <View className="bg-gray-100 p-6 rounded-full mb-4">
                <Package size={32} color="#6b7280" />
              </View>
              <Text className="text-gray-700 text-lg font-semibold mb-2">
                No Specific Recommendations
              </Text>
              <Text className="text-gray-500 text-sm text-center">
                General waste disposal guidelines apply for this collection
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View className="bg-white px-6 py-4 border-t border-gray-200">
          <TouchableOpacity
            onPress={onClose}
            className="bg-purple-600 py-4 rounded-xl shadow-lg"
          >
            <Text className="text-white text-center font-semibold text-lg">
              Got it! Close Guide
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Enhanced StatusBadge with better colors and icons
function StatusBadge({ status }: { status: EventDoc["status"] }) {
  if (!status) return null;
  let bgColor = "", textColor = "", icon = null;
  switch (status) {
    case "Pending": 
      bgColor = "bg-amber-100"; 
      textColor = "text-amber-800"; 
      icon = <Clock size={12} color="#92400e" />;
      break;
    case "In-progress": 
      bgColor = "bg-blue-100"; 
      textColor = "text-blue-800"; 
      icon = <PlayCircle size={12} color="#1e40af" />;
      break;
    case "Completed": 
      bgColor = "bg-emerald-100"; 
      textColor = "text-emerald-800"; 
      icon = <CheckCircle2 size={12} color="#065f46" />;
      break;
  }
  return (
    <View className={`px-3 py-1.5 rounded-full ${bgColor} flex-row items-center`}>
      {icon}
      <Text className={`text-xs font-semibold ${textColor} ml-1`}>{status}</Text>
    </View>
  );
}

export default function WcHome() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid || "";
  const params = useLocalSearchParams();
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EventDoc | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'available'>('available');
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [collectedWeights, setCollectedWeights] = useState<Record<string, string>>({});
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [wasteStats, setWasteStats] = useState({
    totalWeight: 0,
    plasticBottles: 0,
    plasticBags: 0,
    fishingGear: 0,
    glass: 0,
    cans: 0,
    other: 0
  });
  const [searchQuery, setSearchQuery] = useState("");
  
  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <View 
          style={{
            backgroundColor: '#ffffff',
            padding: 32,
            borderRadius: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <ActivityIndicator size="large" color="#059669" />
          <Text className="text-gray-700 mt-4 font-semibold text-base">Loading...</Text>
        </View>
      </View>
    );
  }


  // 🔹 Calculate waste statistics from completed assignments
  const calculateWasteStats = (events: EventDoc[]) => {
    const completedEvents = events.filter(ev => ev.status === "Completed");
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
              // Handle other waste types
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

    return stats;
  };

  // 🔹 Fetch events (all events for available tab, assigned events for upcoming/completed)
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const all: EventDoc[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }));
        setEvents(all);
        
        // Calculate waste statistics from assigned completed events
        const assignedEvents = all.filter((ev) => ev.assignedTo === userId);
        const stats = calculateWasteStats(assignedEvents);
        setWasteStats(stats);
        
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [userId]);

  // 🔹 Group by date and assignment status
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Available: Events that are today or past (not completed)
  const availableCleanups = events.filter((ev) => {
    // Skip if already assigned to someone else
    if (ev.assignedTo && ev.assignedTo !== userId) return false;
    
    // Skip if completed
    if (ev.status === "Completed" || ev.status === "completed") return false;
    
    // Check if event date is today or in the past
    const date = tsToDate(ev.eventAt);
    if (!date) {
      // If no date, show it if status is "open" or assigned to user
      return ev.status === "open" || ev.assignedTo === userId;
    }
    
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    
    // Show if date is today or past
    if (d <= today) {
      return ev.status === "open" || ev.assignedTo === userId;
    }
    
    return false;
  });

  // Upcoming: Events assigned to this user that are in the future
  const upcomingCleanups = events.filter((ev) => {
    if (ev.assignedTo !== userId) return false;
    if (ev.status === "Completed" || ev.status === "completed") return false;
    
    const date = tsToDate(ev.eventAt);
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d > today; // future
  });

  // Completed: Events assigned to this user that are completed
  const completedCleanups = events.filter((ev) => {
    if (ev.assignedTo !== userId) return false;
    return ev.status === "Completed" || ev.status === "completed";
  });

  // Filter available cleanups based on search query
  const filteredAvailableCleanups = availableCleanups.filter((ev) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Search in title
    if (ev.title?.toLowerCase().includes(query)) return true;
    
    // Search in location
    if (ev.location?.label?.toLowerCase().includes(query)) return true;
    
    // Search in waste types
    if (ev.wasteTypes?.some(type => type.toLowerCase().includes(query))) return true;
    
    // Search in description
    if (ev.description?.toLowerCase().includes(query)) return true;
    
    return false;
  });

  // 🔹 Handle image picking
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Camera roll permissions are required to upload images");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setImageUris(prev => [...prev, uri]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  // 🔹 Handle taking photo with camera
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Camera permissions are required to take photos");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setImageUris(prev => [...prev, uri]);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  // 🔹 Remove image from list
  const removeImage = (index: number) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  // 🔹 Handle completion form submission
  async function handleComplete(ev: EventDoc) {
    try {
      setUploading(true);
      
      // Upload all images to Firebase Storage
      const uploadedUrls: string[] = [];
      for (const uri of imageUris) {
        try {
          // Convert image to blob
          const response = await fetch(uri);
          const blob = await response.blob();
          
          // Create unique filename
          const filename = `waste_collection/${ev.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
          const storageRef = ref(storage, filename);
          
          // Upload to Firebase Storage
          await uploadBytes(storageRef, blob);
          
          // Get download URL
          const downloadURL = await getDownloadURL(storageRef);
          uploadedUrls.push(downloadURL);
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          Alert.alert("Warning", "Some images failed to upload but assignment will be completed");
        }
      }
      
      // 🔹 Update event status to Completed in events collection
      await updateDoc(doc(db, "events", ev.id), {
        status: "Completed",
        completedAt: serverTimestamp(),
        collectedWeights: collectedWeights,
        proofImages: uploadedUrls,
      });
      
      // 🔹 Store collection details in new wasteCollections collection
      if (userId) {
        await addDoc(collection(db, "wasteCollections"), {
          eventId: ev.id,
          eventTitle: ev.title,
          eventDescription: ev.description || "",
          collectorId: userId,
          collectorEmail: user?.email || "",
          location: ev.location || {},
          collectedWeights: collectedWeights,
          proofImages: uploadedUrls,
          wasteTypes: ev.wasteTypes || [],
          status: "Completed",
          collectedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          completedAt: serverTimestamp(),
          // Additional metadata
          estimatedQuantity: ev.estimatedQuantity || "",
          priority: ev.priority || "",
          organizerId: ev.organizerId || "",
        });
      }
      
      Alert.alert("Success", "Waste collection recorded successfully ✅");
      setSelected(null);
      setCurrentStep(0);
      setShowCompletionForm(false);
      setCollectedWeights({});
      setImageUris([]);
      setImageUrls([]);
    } catch (error) {
      console.error("Error completing assignment:", error);
      Alert.alert("Error", "Failed to record waste collection: " + (error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  // 🔹 Handle completion button click
  function handleCompleteClick() {
    setShowCompletionForm(true);
  }

  const steps = [
    { title: "Collect Waste", icon: Truck, description: "Collect waste materials" },
    { title: "Confirm Completion", icon: CheckCircle, description: "Mark assignment as completed" },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {!selected ? (
        <>
          {/* Curved Header Background */}
          <View 
            style={{
              backgroundColor: '#059669',
              height: 180,
              borderBottomLeftRadius: 40,
              borderBottomRightRadius: 40,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            {/* Decorative circles */}
            <View style={{
              position: 'absolute',
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              top: -20,
              right: 30,
            }} />
            <View style={{
              position: 'absolute',
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              top: 80,
              left: 20,
            }} />
          </View>

          <ScrollView contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 80 }}>
            {/* Header */}
            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <View 
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    padding: 12,
                    borderRadius: 16,
                    marginRight: 12,
                  }}
                >
                  <Truck size={32} color="#ffffff" strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="text-3xl font-bold text-white" style={{ letterSpacing: 0.5 }}>Assignments</Text>
                  <Text className="text-emerald-50 text-base mt-1">Waste Collection Tasks</Text>
                </View>
              </View>
            </View>

            {loading ? (
              <View className="py-10 items-center">
                <View 
                  style={{
                    backgroundColor: '#ffffff',
                    padding: 32,
                    borderRadius: 24,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                >
                  <ActivityIndicator size="large" color="#059669" />
                  <Text className="text-gray-700 mt-4 font-semibold text-base">Loading assignments...</Text>
                </View>
              </View>
            ) : (
              <>
                {/* Search Bar */}
                {availableCleanups.length > 0 && (
                  <View 
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 16,
                      marginBottom: 20,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08,
                      shadowRadius: 8,
                      elevation: 3,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 4,
                    }}
                  >
                    <Search size={20} color="#9ca3af" strokeWidth={2.5} />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search by title, location, or waste type..."
                      placeholderTextColor="#9ca3af"
                      style={{
                        flex: 1,
                        fontSize: 16,
                        color: '#111827',
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        fontWeight: '600',
                      }}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setSearchQuery("")}
                        style={{
                          backgroundColor: '#f3f4f6',
                          padding: 6,
                          borderRadius: 999,
                        }}
                      >
                        <X size={16} color="#6b7280" strokeWidth={2.5} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Available Assignments */}
                {availableCleanups.length > 0 ? (
                  <View className="mb-8">
                    <View className="flex-row items-center mb-4">
                      <View style={{ backgroundColor: '#d1fae5', padding: 10, borderRadius: 12, marginRight: 12 }}>
                        <Trash2 size={22} color="#059669" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xl font-bold text-gray-900">Available Tasks</Text>
                        <Text className="text-gray-500 text-xs mt-1">
                          {searchQuery ? `${filteredAvailableCleanups.length} of ${availableCleanups.length}` : `${availableCleanups.length}`} assignment{(searchQuery ? filteredAvailableCleanups.length : availableCleanups.length) !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                      {filteredAvailableCleanups.length === 0 && searchQuery ? (
                        <View 
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: 20,
                            padding: 32,
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.08,
                            shadowRadius: 8,
                            elevation: 3,
                          }}
                        >
                          <View style={{ backgroundColor: '#f3f4f6', padding: 20, borderRadius: 999, marginBottom: 16 }}>
                            <Search size={40} color="#9ca3af" />
                          </View>
                          <Text className="text-gray-700 font-bold text-lg mb-2">No results found</Text>
                          <Text className="text-gray-500 text-sm text-center mb-4">
                            No assignments match "{searchQuery}"
                          </Text>
                          <TouchableOpacity
                            onPress={() => setSearchQuery("")}
                            style={{
                              backgroundColor: '#059669',
                              paddingVertical: 10,
                              paddingHorizontal: 20,
                              borderRadius: 12,
                            }}
                          >
                            <Text className="text-white font-bold">Clear Search</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        filteredAvailableCleanups.map((ev) => {
                          const d = tsToDate(ev.eventAt);
                          const dateStr = d ? `${formatDate(d)} • ${formatTime(d)}` : "No date";
                          return (
                          <TouchableOpacity
                            key={ev.id}
                            onPress={() => {
                              setSelected(ev);
                              setCurrentStep(0);
                            }}
                            style={{
                              marginBottom: 16,
                              backgroundColor: '#ffffff',
                              borderRadius: 20,
                              overflow: 'hidden',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.08,
                              shadowRadius: 8,
                              elevation: 3,
                              borderLeftWidth: 5,
                              borderLeftColor: '#10b981',
                            }}
                          >
                            {/* Event Image */}
                            {ev.imageUrl && (
                              <Image
                                source={{ uri: ev.imageUrl }}
                                style={{ width: '100%', height: 192 }}
                                resizeMode="cover"
                              />
                            )}
                            
                            <View style={{ padding: 16 }}>
                              {/* Title & Status */}
                              <View className="flex-row items-center justify-between mb-3">
                                <Text className="text-xl font-bold text-gray-900 flex-1 pr-2">
                                  {ev.title}
                                </Text>
                                {ev.assignedTo === userId && (
                                  <View style={{ backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                    <Text className="text-emerald-700 text-xs font-bold">✓ Assigned</Text>
                                  </View>
                                )}
                              </View>
                              
                              {/* Date & Location */}
                              <View style={{ backgroundColor: '#f9fafb', borderRadius: 14, padding: 12, marginBottom: 12 }}>
                                <View className="flex-row items-center mb-2">
                                  <View style={{ backgroundColor: '#dbeafe', padding: 6, borderRadius: 8, marginRight: 8 }}>
                                    <Clock size={16} color="#2563eb" />
                                  </View>
                                  <Text className="text-gray-700 text-sm font-semibold">{dateStr}</Text>
                                </View>
                                
                                {!!ev.location?.label && (
                                  <View className="flex-row items-center">
                                    <View style={{ backgroundColor: '#d1fae5', padding: 6, borderRadius: 8, marginRight: 8 }}>
                                      <MapPin size={16} color="#059669" />
                                    </View>
                                    <Text className="text-gray-700 text-sm font-semibold flex-1" numberOfLines={1}>
                                      {ev.location.label}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              
                              {/* Waste Types */}
                              {ev.wasteTypes && ev.wasteTypes.length > 0 && (
                                <View>
                                  <Text className="text-gray-500 text-xs font-bold mb-2">WASTE TYPES</Text>
                                  <View className="flex-row flex-wrap">
                                    {ev.wasteTypes.slice(0, 3).map((type, idx) => (
                                      <View key={idx} style={{ backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginRight: 8, marginBottom: 6, borderWidth: 1, borderColor: '#10b981' }}>
                                        <Text className="text-emerald-700 text-xs font-bold">{type}</Text>
                                      </View>
                                    ))}
                                    {ev.wasteTypes.length > 3 && (
                                      <View style={{ backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#3b82f6' }}>
                                        <Text className="text-blue-700 text-xs font-bold">+{ev.wasteTypes.length - 3}</Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                          );
                        })
                      )}
                </View>
              ) : (
                <View 
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 20,
                    padding: 32,
                    alignItems: 'center',
                    marginBottom: 24,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <View style={{ backgroundColor: '#f3f4f6', padding: 20, borderRadius: 999, marginBottom: 16 }}>
                    <CheckCircle size={40} color="#9ca3af" />
                  </View>
                  <Text className="text-gray-700 text-center font-bold text-lg mb-2">
                    All Caught Up!
                  </Text>
                  <Text className="text-gray-500 text-center text-sm">
                    No assignments available at the moment. New tasks will appear here when assigned.
                  </Text>
                </View>
              )}
            </>
          )}
          </ScrollView>
        </>
      ) : (
        // 🔹 Assignment Detail View (Steps)
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
          {/* Back Button & Header */}
          <View className="flex-row items-center mb-6">
            <TouchableOpacity 
              onPress={() => setSelected(null)}
              style={{
                backgroundColor: '#059669',
                padding: 10,
                borderRadius: 14,
                marginRight: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <ChevronLeft color="#ffffff" size={24} strokeWidth={3} />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900">
                Task Details
              </Text>
              <Text className="text-gray-600 text-sm font-medium">
                Complete the steps below
              </Text>
            </View>
          </View>

          <View 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              overflow: 'hidden',
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
              borderLeftWidth: 5,
              borderLeftColor: '#059669',
            }}
          >
            {/* Event Image */}
            {selected.imageUrl && (
              <Image
                source={{ uri: selected.imageUrl }}
                style={{ width: '100%', height: 192 }}
                resizeMode="cover"
              />
            )}
            
            <View style={{ padding: 20 }}>
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-gray-900 mb-3">
                    {selected.title}
                  </Text>
                  
                  <View className="flex-row items-center mb-3">
                    <View style={{ backgroundColor: '#d1fae5', padding: 8, borderRadius: 10, marginRight: 10 }}>
                      <MapPin size={18} color="#059669" />
                    </View>
                    <Text className="text-gray-700 font-semibold flex-1">{selected.location?.label}</Text>
                  </View>
                  
                  <View className="flex-row items-center mb-3">
                    <View style={{ backgroundColor: '#fef3c7', padding: 8, borderRadius: 10, marginRight: 10 }}>
                      <Calendar size={18} color="#d97706" />
                    </View>
                    <Text className="text-gray-700 font-semibold">
                      {formatDate(tsToDate(selected.eventAt))} •{" "}
                      {formatTime(tsToDate(selected.eventAt))}
                    </Text>
                  </View>
                  
                  {/* Waste Types */}
                  {!!selected.wasteTypes && selected.wasteTypes.length > 0 && (
                    <View className="mt-2">
                      <View className="flex-row items-center mb-2">
                        <View style={{ backgroundColor: '#d1fae5', padding: 6, borderRadius: 8, marginRight: 8 }}>
                          <Package size={18} color="#059669" />
                        </View>
                        <Text className="text-gray-700 font-bold">Waste Types:</Text>
                      </View>
                      <View className="flex-row flex-wrap">
                        {selected.wasteTypes.map((type, idx) => (
                          <View key={idx} style={{ backgroundColor: '#d1fae5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 8, marginBottom: 6, borderWidth: 1, borderColor: '#10b981' }}>
                            <Text className="text-emerald-700 text-sm font-bold">{type}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
                <View style={{ backgroundColor: '#d1fae5', padding: 12, borderRadius: 16 }}>
                  <Truck size={28} color="#059669" />
                </View>
              </View>
            </View>
          </View>

          {/* Steps */}
          <View 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 20,
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <View className="flex-row items-center mb-6">
              <View style={{ backgroundColor: '#ede9fe', padding: 10, borderRadius: 12, marginRight: 12 }}>
                <Zap size={22} color="#7c3aed" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900">Progress Tracker</Text>
                <Text className="text-gray-500 text-xs mt-1">Complete each step</Text>
              </View>
            </View>
            {steps.map((step, index) => (
              <View key={index} className="mb-6">
                <View className="flex-row items-start">
                  <View
                    className={`w-12 h-12 rounded-full items-center justify-center mr-4 shadow-sm ${
                      index < currentStep 
                        ? "bg-emerald-500" 
                        : index === currentStep 
                        ? "bg-blue-500" 
                        : "bg-gray-200"
                    }`}
                  >
                    <step.icon
                      color={index <= currentStep ? "white" : "#6b7280"}
                      size={22}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-lg font-bold mb-1 ${
                        index < currentStep 
                          ? "text-emerald-600" 
                          : index === currentStep 
                          ? "text-blue-600" 
                          : "text-gray-600"
                      }`}
                    >
                      {step.title}
                    </Text>
                    <Text className="text-gray-600 text-sm mb-2">
                      {step.description}
                    </Text>
                    <View className={`px-3 py-1 rounded-full self-start ${
                      index < currentStep 
                        ? "bg-emerald-100" 
                        : index === currentStep 
                        ? "bg-blue-100" 
                        : "bg-gray-100"
                    }`}>
                      <Text className={`text-xs font-semibold ${
                        index < currentStep 
                          ? "text-emerald-700" 
                          : index === currentStep 
                          ? "text-blue-700" 
                          : "text-gray-500"
                      }`}>
                        {index < currentStep
                          ? "✓ COMPLETED"
                          : index === currentStep
                          ? "● IN PROGRESS"
                          : "○ PENDING"}
                      </Text>
                    </View>
                  </View>
                </View>
                {index === currentStep && (
                  <View className="mt-4 ml-16">
                    <TouchableOpacity
                      disabled={uploading}
                      onPress={async () => {
                        if (index === 0) setCurrentStep(1);
                        else if (index === 1) handleCompleteClick();
                      }}
                      style={{
                        backgroundColor: index === 0 ? '#059669' : '#16a34a',
                        paddingVertical: 14,
                        paddingHorizontal: 24,
                        borderRadius: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 6,
                        elevation: 6,
                      }}
                    >
                      {uploading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <>
                          {index === 0 && <Truck size={20} color="white" strokeWidth={2.5} />}
                          {index === 1 && <CheckCircle size={20} color="white" strokeWidth={2.5} />}
                          <Text className="text-white font-bold ml-2 text-base">
                            {index === 0
                              ? "Mark Collected"
                              : "Complete Task"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {index < steps.length - 1 && (
                  <View className="ml-6 mt-2 mb-2">
                    <View className="w-0.5 h-6 bg-gray-200"></View>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Photos section removed */}

          {/* AI/ML Suggestions Button */}
          <View 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 20,
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
              borderLeftWidth: 5,
              borderLeftColor: '#8b5cf6',
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View style={{ backgroundColor: '#ede9fe', padding: 12, borderRadius: 14, marginRight: 12 }}>
                  <Brain size={24} color="#7c3aed" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">AI Disposal Guide</Text>
                  <Text className="text-sm text-gray-600">Smart eco recommendations</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowAISuggestions(true)}
                style={{
                  backgroundColor: '#7c3aed',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text className="text-white font-bold text-sm">View</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Completion Form */}
          {showCompletionForm && (
            <View 
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: 20,
                marginBottom: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
                borderLeftWidth: 5,
                borderLeftColor: '#16a34a',
              }}
            >
              <View className="flex-row items-center mb-6">
                <View style={{ backgroundColor: '#d1fae5', padding: 10, borderRadius: 12, marginRight: 12 }}>
                  <CheckCircle size={22} color="#16a34a" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900">Complete Task</Text>
                  <Text className="text-gray-500 text-xs mt-1">Enter collection details</Text>
                </View>
              </View>
              
              <Text className="text-gray-600 mb-4">
                Please enter the actual weight collected for each waste type (in kg):
              </Text>

              <View className="space-y-4">
                {selected?.wasteTypes && selected.wasteTypes.length > 0 ? (
                  selected.wasteTypes.map((wasteType, index) => (
                    <View key={index} style={{ marginBottom: 16 }}>
                      <Text className="text-gray-700 font-bold mb-2">{wasteType} (kg)</Text>
                      <TextInput
                        value={collectedWeights[wasteType] || ''}
                        onChangeText={(text) => setCollectedWeights(prev => ({ ...prev, [wasteType]: text }))}
                        placeholder="Enter weight in kg"
                        keyboardType="numeric"
                        style={{
                          borderWidth: 2,
                          borderColor: '#e5e7eb',
                          borderRadius: 12,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          backgroundColor: '#f9fafb',
                          fontSize: 16,
                          fontWeight: '600',
                          color: '#111827',
                        }}
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  ))
                ) : (
                  <View>
                    <Text className="text-gray-700 font-bold mb-2">Other Waste (kg)</Text>
                    <TextInput
                      value={collectedWeights['Other'] || ''}
                      onChangeText={(text) => setCollectedWeights(prev => ({ ...prev, 'Other': text }))}
                      placeholder="Enter weight in kg"
                      keyboardType="numeric"
                      style={{
                        borderWidth: 2,
                        borderColor: '#e5e7eb',
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        backgroundColor: '#f9fafb',
                        fontSize: 16,
                        fontWeight: '600',
                        color: '#111827',
                      }}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                )}
              </View>

              {/* Image Upload Section */}
              <View className="mt-6">
                <View className="flex-row items-center mb-3">
                  <View style={{ backgroundColor: '#dbeafe', padding: 8, borderRadius: 10, marginRight: 10 }}>
                    <ImageIcon size={20} color="#2563eb" />
                  </View>
                  <Text className="text-gray-700 font-bold">Upload Photos</Text>
                  <Text className="text-gray-500 text-xs ml-2">(Optional)</Text>
                </View>

                {/* Image Picker Buttons */}
                <View className="flex-row space-x-3 mb-4">
                  <TouchableOpacity
                    onPress={takePhoto}
                    style={{
                      flex: 1,
                      backgroundColor: '#dbeafe',
                      borderWidth: 2,
                      borderColor: '#3b82f6',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8,
                    }}
                  >
                    <Camera size={20} color="#2563eb" strokeWidth={2.5} />
                    <Text className="text-blue-700 font-bold ml-2">Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={pickImage}
                    style={{
                      flex: 1,
                      backgroundColor: '#ede9fe',
                      borderWidth: 2,
                      borderColor: '#8b5cf6',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ImageIcon size={20} color="#7c3aed" strokeWidth={2.5} />
                    <Text className="text-purple-700 font-bold ml-2">Choose</Text>
                  </TouchableOpacity>
                </View>

                {/* Display Selected Images */}
                {imageUris.length > 0 && (
                  <View className="space-y-2">
                    <Text className="text-gray-600 text-sm mb-2">
                      Selected Photos ({imageUris.length})
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                      <View className="flex-row space-x-3">
                        {imageUris.map((uri, index) => (
                          <View key={index} className="relative">
                            <Image
                              source={{ uri }}
                              className="w-24 h-24 rounded-xl"
                              resizeMode="cover"
                            />
                            <TouchableOpacity
                              onPress={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 shadow-lg"
                            >
                              <X size={14} color="white" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Form Actions */}
              <View className="flex-row space-x-3 mt-6">
                <TouchableOpacity
                  onPress={() => {
                    setShowCompletionForm(false);
                    setImageUris([]);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 24,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: '#d1d5db',
                    backgroundColor: '#ffffff',
                    marginRight: 8,
                  }}
                >
                  <Text className="text-gray-700 font-bold text-center text-base">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleComplete(selected)}
                  disabled={uploading}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 24,
                    borderRadius: 14,
                    backgroundColor: '#16a34a',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 6,
                  }}
                >
                  {uploading ? (
                    <View className="flex-row items-center justify-center">
                      <ActivityIndicator color="white" size="small" />
                      <Text className="text-white font-bold ml-2">Uploading...</Text>
                    </View>
                  ) : (
                    <Text className="text-white font-bold text-center text-base">Complete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* AI Suggestions Modal */}
      <AISuggestionsModal
        visible={showAISuggestions}
        onClose={() => setShowAISuggestions(false)}
        wasteTypes={selected?.wasteTypes}
        collectedWeights={collectedWeights}
      />
    </View>
  );
}