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
    <View className="flex-1 bg-gray-50">
      {/* Curved Header Background */}
      <View 
        style={{
          backgroundColor: '#059669',
          height: 280,
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
          top: 180,
          left: 20,
        }} />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 100 }}>
        {/* Header Title */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-white" style={{ letterSpacing: 0.5 }}>Profile</Text>
          <Text className="text-emerald-50 text-base mt-1">Your account information</Text>
        </View>

        {/* Profile Card */}
        <View 
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
            alignItems: 'center',
          }}
        >
          <View style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: '#d1fae5',
            borderWidth: 4,
            borderColor: '#10b981',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <User color="#059669" size={48} strokeWidth={2.5} />
          </View>
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            {user?.email?.split("@")[0] || "Waste Collector"}
          </Text>
          <Text className="text-gray-600 mb-3 text-base">{user?.email}</Text>
          <View style={{ backgroundColor: '#d1fae5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#10b981' }}>
            <Text className="text-emerald-700 font-bold text-sm">♻️ Waste Collector</Text>
          </View>
        </View>

        {/* Role overview */}
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
          }}
        >
          <View style={{ padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <View className="flex-row items-center">
              <View style={{ backgroundColor: '#ede9fe', padding: 10, borderRadius: 12, marginRight: 12 }}>
                <Truck size={22} color="#7c3aed" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900">Your Role</Text>
                <Text className="text-gray-500 text-xs mt-1">Responsibilities</Text>
              </View>
            </View>
          </View>
          <View style={{ padding: 20 }}>
            <View className="flex-row items-center mb-4">
              <View style={{ backgroundColor: '#d1fae5', padding: 8, borderRadius: 10, marginRight: 12 }}>
                <MapPin size={20} color="#059669" />
              </View>
              <Text className="text-slate-700 font-semibold flex-1">Navigate to assigned locations</Text>
            </View>
            <View className="flex-row items-center mb-4">
              <View style={{ backgroundColor: '#dbeafe', padding: 8, borderRadius: 10, marginRight: 12 }}>
                <Truck size={20} color="#2563eb" />
              </View>
              <Text className="text-slate-700 font-semibold flex-1">Collect and transport waste safely</Text>
            </View>
            <View className="flex-row items-center">
              <View style={{ backgroundColor: '#d1fae5', padding: 8, borderRadius: 10, marginRight: 12 }}>
                <CheckCircle size={20} color="#059669" />
              </View>
              <Text className="text-slate-700 font-semibold flex-1">Upload disposal proof and mark completion</Text>
            </View>
          </View>
        </View>

        {/* Collection Statistics */}
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
          <View className="flex-row items-center mb-5">
            <View style={{ backgroundColor: '#d1fae5', padding: 10, borderRadius: 12, marginRight: 12 }}>
              <History size={22} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">Collection Stats</Text>
              <Text className="text-gray-500 text-xs mt-1">Your achievements</Text>
            </View>
          </View>
          <View className="flex-row justify-around">
            <View className="items-center">
              <View style={{ backgroundColor: '#dbeafe', padding: 14, borderRadius: 999, marginBottom: 8 }}>
                <Package size={28} color="#2563eb" />
              </View>
              <Text className="text-3xl font-bold text-gray-900">{totalCollections}</Text>
              <Text className="text-sm text-gray-600 font-semibold mt-1">Collections</Text>
            </View>
            <View className="items-center">
              <View style={{ backgroundColor: '#d1fae5', padding: 14, borderRadius: 999, marginBottom: 8 }}>
                <Weight size={28} color="#059669" />
              </View>
              <Text className="text-3xl font-bold text-gray-900">{totalWeight.toFixed(1)}</Text>
              <Text className="text-sm text-gray-600 font-semibold mt-1">Total kg</Text>
            </View>
          </View>
        </View>

        {/* Assignment History */}
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
          }}
        >
          <TouchableOpacity
            onPress={() => setShowHistory(!showHistory)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#f3f4f6',
            }}
          >
            <View className="flex-row items-center flex-1">
              <View style={{ backgroundColor: '#dbeafe', padding: 10, borderRadius: 12, marginRight: 12 }}>
                <History size={22} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900">History</Text>
                <Text className="text-gray-500 text-xs mt-1">{wasteCollections.length} assignment{wasteCollections.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>
            {showHistory ? (
              <ChevronUp size={24} color="#059669" strokeWidth={2.5} />
            ) : (
              <ChevronDown size={24} color="#059669" strokeWidth={2.5} />
            )}
          </TouchableOpacity>

          {showHistory && (
            <View style={{ padding: 20, paddingTop: 16 }}>
              {loading ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="large" color="#059669" />
                  <Text className="text-gray-700 mt-3 font-semibold">Loading history...</Text>
                </View>
              ) : wasteCollections.length === 0 ? (
                <View className="py-8 items-center">
                  <View style={{ backgroundColor: '#f3f4f6', padding: 20, borderRadius: 999, marginBottom: 12 }}>
                    <Package size={40} color="#9ca3af" />
                  </View>
                  <Text className="text-gray-700 font-bold text-lg">No collections yet</Text>
                  <Text className="text-gray-500 text-sm mt-2 text-center">Complete assignments to see your history</Text>
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
                        style={{
                          borderWidth: 2,
                          borderColor: '#e5e7eb',
                          borderRadius: 16,
                          overflow: 'hidden',
                          marginBottom: 12,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => toggleItemExpanded(collection.id)}
                          style={{
                            backgroundColor: '#f9fafb',
                            padding: 16,
                          }}
                        >
                          <View className="flex-row items-start justify-between mb-2">
                            <View className="flex-1">
                              <Text className="text-base font-bold text-gray-900 mb-2">
                                {collection.eventTitle}
                              </Text>
                              <View className="flex-row items-center mb-2">
                                <View style={{ backgroundColor: '#fef3c7', padding: 6, borderRadius: 8, marginRight: 8 }}>
                                  <Calendar size={16} color="#d97706" />
                                </View>
                                <Text className="text-sm text-gray-700 font-semibold">
                                  {formatDate(completedDate)} • {formatTime(completedDate)}
                                </Text>
                              </View>
                              {collection.location?.label && (
                                <View className="flex-row items-center">
                                  <View style={{ backgroundColor: '#d1fae5', padding: 6, borderRadius: 8, marginRight: 8 }}>
                                    <MapPin size={16} color="#059669" />
                                  </View>
                                  <Text className="text-sm text-gray-700 font-semibold">
                                    {collection.location.label}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <View className="items-end ml-3">
                              <View style={{ backgroundColor: '#d1fae5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#10b981' }}>
                                <Text className="text-emerald-700 font-bold text-sm">
                                  {totalWasteWeight.toFixed(1)} kg
                                </Text>
                              </View>
                              {isExpanded ? (
                                <ChevronUp size={22} color="#059669" strokeWidth={2.5} />
                              ) : (
                                <ChevronDown size={22} color="#059669" strokeWidth={2.5} />
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
                                  style={{
                                    backgroundColor: '#dbeafe',
                                    borderWidth: 2,
                                    borderColor: '#3b82f6',
                                    padding: 12,
                                    borderRadius: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <ImageIcon size={20} color="#2563eb" strokeWidth={2.5} />
                                  <Text className="text-blue-700 font-bold ml-2">
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
          <TouchableOpacity onPress={handleTerms} className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View style={{ backgroundColor: '#ede9fe', padding: 10, borderRadius: 12, marginRight: 12 }}>
                <FileText size={22} color="#7c3aed" />
              </View>
              <Text className="text-gray-900 font-bold text-base">Terms & Conditions</Text>
            </View>
            <ChevronRight size={22} color="#059669" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Account actions */}
        <View 
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <TouchableOpacity 
            onPress={handleLogout}
            style={{
              backgroundColor: '#ef4444',
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 6,
            }}
          >
            <View className="flex-row items-center">
              <LogOut size={22} color="#ffffff" strokeWidth={2.5} />
              <Text className="text-white font-bold text-base ml-2">Sign Out</Text>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
          <View className="flex-1 relative">
            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setShowImageModal(false)}
              style={{
                position: 'absolute',
                top: 48,
                right: 24,
                zIndex: 10,
                backgroundColor: '#059669',
                padding: 12,
                borderRadius: 999,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Text className="text-white font-bold text-xl">✕</Text>
            </TouchableOpacity>

            {/* Image Gallery */}
            <ScrollView
              contentContainerStyle={{ padding: 20, paddingTop: 100, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              <View className="space-y-4">
                {selectedImages.map((imageUrl, index) => (
                  <View key={index} className="mb-6">
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: '100%', height: 384, borderRadius: 16 }}
                      resizeMode="contain"
                    />
                    <View style={{ backgroundColor: 'rgba(5, 150, 105, 0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 8, alignSelf: 'flex-start' }}>
                      <Text className="text-white font-bold">
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
