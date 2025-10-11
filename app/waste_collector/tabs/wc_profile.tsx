import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, query, Timestamp, where } from "firebase/firestore";
import { Calendar, CheckCircle, ChevronDown, ChevronRight, ChevronUp, FileText, History, Image as ImageIcon, LogOut, MapPin, Package, Truck, User, Weight } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { auth, db } from "../../../services/firebaseConfig";

type WasteCollection = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDescription: string;
  collectorId: string;
  collectorEmail: string;
  location?: { label?: string; lat?: number; lng?: number };
  collectedWeights: Record<string, string>;
  proofImages: string[];
  wasteTypes: string[];
  status: string;
  collectedAt?: Timestamp;
  createdAt?: Timestamp;
  completedAt?: Timestamp;
  estimatedQuantity?: string;
  priority?: string;
  organizerId?: string;
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
  if (!d) return "N/A";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(d?: Date | null) {
  if (!d) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function WcProfile() {
  const { user } = useAuth();
  const router = useRouter();
  const [wasteCollections, setWasteCollections] = useState<WasteCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);

  // Fetch waste collections
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Query without orderBy to avoid index requirement
    // We'll sort on the client side instead
    const q = query(
      collection(db, "wasteCollections"),
      where("collectorId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let collections: WasteCollection[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<WasteCollection, "id">),
        }));
        
        // Sort by completedAt on the client side (newest first)
        collections = collections.sort((a, b) => {
          const dateA = tsToDate(a.completedAt)?.getTime() || 0;
          const dateB = tsToDate(b.completedAt)?.getTime() || 0;
          return dateB - dateA; // Descending order (newest first)
        });
        
        setWasteCollections(collections);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching waste collections:", error);
        Alert.alert(
          "Index Required",
          "Please create the Firebase index to enable sorting. Check the console for the link."
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Calculate total stats
  const totalCollections = wasteCollections.length;
  const totalWeight = wasteCollections.reduce((sum, collection) => {
    const weights = Object.values(collection.collectedWeights || {});
    const collectionTotal = weights.reduce((s, w) => s + (parseFloat(w) || 0), 0);
    return sum + collectionTotal;
  }, 0);

  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace("/(public)/auth/login");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to sign out");
    }
  }

  function toggleItemExpanded(id: string) {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  }

  function handleViewImages(images: string[]) {
    setSelectedImages(images);
    setShowImageModal(true);
  }

  function handleTerms() {
    Alert.alert("Coming Soon", "Terms & Conditions will be available soon!");
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Header card */}
        <View className="bg-white rounded-2xl shadow border border-slate-100 p-6 mb-6 items-center">
          <View className="w-24 h-24 rounded-full bg-green-50 border border-green-200 items-center justify-center mb-4">
            <User color="#16a34a" size={40} />
          </View>
          <Text className="text-xl font-bold text-slate-800 mb-1">
            {user?.email?.split("@")[0] || "Waste Collector"}
          </Text>
          <Text className="text-slate-600 mb-2">{user?.email}</Text>
          <View className="px-3 py-1.5 bg-green-50 rounded-full">
            <Text className="text-green-700 font-medium text-sm">Waste Collector</Text>
          </View>
        </View>

        {/* Role overview */}
        <View className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden mb-6">
          <View className="p-6 pb-4 border-b border-slate-100">
            <Text className="text-xl font-bold text-slate-800">Your Role</Text>
          </View>
          <View className="p-6">
            <View className="flex-row items-center mb-4">
              <MapPin size={18} color="#16a34a" />
              <Text className="ml-2 text-slate-700">Navigate to assigned locations</Text>
            </View>
            <View className="flex-row items-center mb-4">
              <Truck size={18} color="#16a34a" />
              <Text className="ml-2 text-slate-700">Collect and transport waste safely</Text>
            </View>
            <View className="flex-row items-center">
              <CheckCircle size={18} color="#16a34a" />
              <Text className="ml-2 text-slate-700">Upload disposal proof and mark completion</Text>
            </View>
          </View>
        </View>

        {/* Collection Statistics */}
        <View className="bg-white rounded-2xl shadow border border-slate-100 p-6 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="bg-green-100 p-2 rounded-lg mr-3">
              <History size={20} color="#16a34a" />
            </View>
            <Text className="text-xl font-bold text-slate-800">Collection Stats</Text>
          </View>
          <View className="flex-row justify-around">
            <View className="items-center">
              <View className="bg-blue-50 p-3 rounded-full mb-2">
                <Package size={24} color="#2563eb" />
              </View>
              <Text className="text-2xl font-bold text-slate-800">{totalCollections}</Text>
              <Text className="text-sm text-slate-600">Collections</Text>
            </View>
            <View className="items-center">
              <View className="bg-green-50 p-3 rounded-full mb-2">
                <Weight size={24} color="#16a34a" />
              </View>
              <Text className="text-2xl font-bold text-slate-800">{totalWeight.toFixed(1)}</Text>
              <Text className="text-sm text-slate-600">Total kg</Text>
            </View>
          </View>
        </View>

        {/* Assignment History */}
        <View className="bg-white rounded-2xl shadow border border-slate-100 mb-6 overflow-hidden">
          <TouchableOpacity
            onPress={() => setShowHistory(!showHistory)}
            className="flex-row items-center justify-between p-6 border-b border-slate-100"
          >
            <View className="flex-row items-center flex-1">
              <View className="bg-blue-100 p-2 rounded-lg mr-3">
                <History size={20} color="#2563eb" />
              </View>
              <Text className="text-xl font-bold text-slate-800">Assignment History</Text>
            </View>
            {showHistory ? (
              <ChevronUp size={20} color="#64748b" />
            ) : (
              <ChevronDown size={20} color="#64748b" />
            )}
          </TouchableOpacity>

          {showHistory && (
            <View className="p-6 pt-4">
              {loading ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="large" color="#16a34a" />
                  <Text className="text-slate-600 mt-3">Loading history...</Text>
                </View>
              ) : wasteCollections.length === 0 ? (
                <View className="py-8 items-center">
                  <View className="bg-slate-100 p-4 rounded-full mb-3">
                    <Package size={32} color="#64748b" />
                  </View>
                  <Text className="text-slate-600 font-medium">No collections yet</Text>
                  <Text className="text-slate-500 text-sm mt-1">Complete assignments to see your history</Text>
                </View>
              ) : (
                <View className="space-y-4">
                  {wasteCollections.map((collection) => {
                    const isExpanded = expandedItems.has(collection.id);
                    const completedDate = tsToDate(collection.completedAt);
                    const totalWasteWeight = Object.values(collection.collectedWeights || {}).reduce(
                      (sum, weight) => sum + (parseFloat(weight) || 0),
                      0
                    );

                    return (
                      <View
                        key={collection.id}
                        className="border border-slate-200 rounded-xl overflow-hidden"
                      >
                        <TouchableOpacity
                          onPress={() => toggleItemExpanded(collection.id)}
                          className="bg-slate-50 p-4"
                        >
                          <View className="flex-row items-start justify-between mb-2">
                            <View className="flex-1">
                              <Text className="text-base font-bold text-slate-800 mb-1">
                                {collection.eventTitle}
                              </Text>
                              <View className="flex-row items-center mb-1">
                                <Calendar size={14} color="#64748b" />
                                <Text className="text-sm text-slate-600 ml-2">
                                  {formatDate(completedDate)} • {formatTime(completedDate)}
                                </Text>
                              </View>
                              {collection.location?.label && (
                                <View className="flex-row items-center">
                                  <MapPin size={14} color="#64748b" />
                                  <Text className="text-sm text-slate-600 ml-2">
                                    {collection.location.label}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <View className="items-end ml-3">
                              <View className="bg-green-100 px-3 py-1.5 rounded-full mb-2">
                                <Text className="text-green-700 font-bold text-sm">
                                  {totalWasteWeight.toFixed(1)} kg
                                </Text>
                              </View>
                              {isExpanded ? (
                                <ChevronUp size={20} color="#64748b" />
                              ) : (
                                <ChevronDown size={20} color="#64748b" />
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>

                        {isExpanded && (
                          <View className="bg-white p-4 border-t border-slate-200">
                            {/* Description */}
                            {collection.eventDescription && (
                              <View className="mb-4">
                                <Text className="text-sm font-semibold text-slate-700 mb-1">
                                  Description
                                </Text>
                                <Text className="text-sm text-slate-600">
                                  {collection.eventDescription}
                                </Text>
                              </View>
                            )}

                            {/* Waste Types */}
                            {collection.wasteTypes && collection.wasteTypes.length > 0 && (
                              <View className="mb-4">
                                <Text className="text-sm font-semibold text-slate-700 mb-2">
                                  Waste Types
                                </Text>
                                <View className="flex-row flex-wrap">
                                  {collection.wasteTypes.map((type, idx) => (
                                    <View
                                      key={idx}
                                      className="bg-emerald-50 px-3 py-1.5 rounded-full mr-2 mb-2 border border-emerald-200"
                                    >
                                      <Text className="text-emerald-700 text-xs font-medium">
                                        {type}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            )}

                            {/* Collected Weights */}
                            {Object.keys(collection.collectedWeights || {}).length > 0 && (
                              <View className="mb-4">
                                <Text className="text-sm font-semibold text-slate-700 mb-2">
                                  Collected Amounts
                                </Text>
                                <View className="bg-slate-50 rounded-lg p-3">
                                  {Object.entries(collection.collectedWeights).map(
                                    ([type, weight], idx) => (
                                      <View
                                        key={idx}
                                        className="flex-row justify-between items-center py-2 border-b border-slate-200 last:border-b-0"
                                      >
                                        <Text className="text-slate-700 flex-1">{type}</Text>
                                        <Text className="text-slate-900 font-bold">
                                          {weight} kg
                                        </Text>
                                      </View>
                                    )
                                  )}
                                </View>
                              </View>
                            )}

                            {/* Proof Images */}
                            {collection.proofImages && collection.proofImages.length > 0 && (
                              <View className="mb-2">
                                <Text className="text-sm font-semibold text-slate-700 mb-2">
                                  Proof Images ({collection.proofImages.length})
                                </Text>
                                <TouchableOpacity
                                  onPress={() => handleViewImages(collection.proofImages)}
                                  className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex-row items-center justify-center"
                                >
                                  <ImageIcon size={18} color="#2563eb" />
                                  <Text className="text-blue-700 font-semibold ml-2">
                                    View Images
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Terms & Conditions */}
        <View className="bg-white rounded-2xl shadow border border-slate-100 p-6 mb-6">
          <TouchableOpacity onPress={handleTerms} className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <FileText size={20} color="#16a34a" />
              <Text className="ml-3 text-slate-800 font-medium text-base">Terms & Conditions</Text>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Account actions */}
        <View className="bg-white rounded-2xl shadow border border-slate-100 p-6">
          <TouchableOpacity onPress={handleLogout} className="bg-red-500 rounded-xl py-4 items-center">
            <View className="flex-row items-center">
              <LogOut size={18} color="#ffffff" />
              <Text className="text-white font-semibold text-base ml-2">Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowImageModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-90">
          <View className="flex-1 relative">
            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setShowImageModal(false)}
              className="absolute top-12 right-6 z-10 bg-white bg-opacity-90 p-3 rounded-full shadow-lg"
            >
              <Text className="text-slate-800 font-bold text-lg">✕</Text>
            </TouchableOpacity>

            {/* Image Gallery */}
            <ScrollView
              contentContainerStyle={{ padding: 20, paddingTop: 80, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              <View className="space-y-4">
                {selectedImages.map((imageUrl, index) => (
                  <View key={index} className="mb-6">
                    <Image
                      source={{ uri: imageUrl }}
                      className="w-full h-96 rounded-xl"
                      resizeMode="contain"
                    />
                    <View className="bg-white bg-opacity-80 px-3 py-2 rounded-lg mt-2 self-start">
                      <Text className="text-slate-800 font-semibold">
                        Image {index + 1} of {selectedImages.length}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
