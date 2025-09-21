import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { auth, db } from "../../../services/firebaseConfig";

interface SponsorProfile {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  website?: string;
  description?: string;
  totalSponsored: number;
  eventsSupported: number;
  createdAt: any;
  billingAddress?: string;
  gstin?: string;
  pan?: string;
  paymentMethods?: {
    cards?: {
      id: string;
      last4: string;
      brand: string;
      expMonth: number;
      expYear: number;
      isDefault: boolean;
    }[];
  };
}

export default function SponsorProfileSummary() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Safe type casting with fallback values
  const sponsorProfile = (profile ? { ...profile } as unknown as SponsorProfile : {
    companyName: "",
    contactPerson: "",
    email: user?.email || "",
    phone: "",
    totalSponsored: 0,
    eventsSupported: 0,
    createdAt: null
  });

  // Form state for editing
  const [formData, setFormData] = useState({
    companyName: sponsorProfile.companyName || "",
    contactPerson: sponsorProfile.contactPerson || "",
    phone: sponsorProfile.phone || "",
    website: sponsorProfile.website || "",
    description: sponsorProfile.description || "",
    billingAddress: sponsorProfile.billingAddress || "",
    gstin: sponsorProfile.gstin || "",
    pan: sponsorProfile.pan || ""
  });

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      const sponsorData = profile as unknown as SponsorProfile;
      setFormData({
        companyName: sponsorData.companyName || "",
        contactPerson: sponsorData.contactPerson || "",
        phone: sponsorData.phone || "",
        website: sponsorData.website || "",
        description: sponsorData.description || "",
        billingAddress: sponsorData.billingAddress || "",
        gstin: sponsorData.gstin || "",
        pan: sponsorData.pan || ""
      });
    }
  }, [profile]);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          onPress: async () => {
            try {
              await signOut(auth);
              // Use replace to prevent going back to the profile page
              router.replace("/(public)/auth/login");
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          }, 
          style: "destructive" 
        }
      ]
    );
  };

  const openEditModal = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    if (!user || !editingField) return;

    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      const updateData = { [editingField]: editValue };
      
      await updateDoc(userDocRef, updateData);
      
      // Update local state
      setFormData(prev => ({ ...prev, [editingField]: editValue }));
      
      // Fetch the updated document to ensure we have latest data
      const updatedDoc = await getDoc(userDocRef);
      if (updatedDoc.exists()) {
        // You can update local state with the fresh data if needed
        const updatedData = updatedDoc.data();
        console.log("Profile updated successfully:", updatedData);
      }
      
      Alert.alert("Success", "Profile updated successfully!");
      setEditModalVisible(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const totalSponsored = sponsorProfile.totalSponsored || 0;
  const eventsSupported = sponsorProfile.eventsSupported || 0;
  const memberSince = sponsorProfile.createdAt ? new Date(sponsorProfile.createdAt.seconds * 1000).getFullYear() : new Date().getFullYear();

  // Sample credit card data - in a real app, this would come from your backend
  const paymentMethods = sponsorProfile.paymentMethods || {
    cards: [
      {
        id: "1",
        last4: "4242",
        brand: "Visa",
        expMonth: 12,
        expYear: 2025,
        isDefault: true
      },
      {
        id: "2",
        last4: "5689",
        brand: "Mastercard",
        expMonth: 6,
        expYear: 2024,
        isDefault: false
      }
    ]
  };

  // Badges based on sponsorship activity
  const badges = [
    {
      id: 1,
      name: "First Sponsor",
      icon: "trophy",
      color: "#FFD700",
      earned: totalSponsored > 0
    },
    {
      id: 2,
      name: "Eco Champion",
      icon: "leaf",
      color: "#4FB7B3",
      earned: totalSponsored >= 50000
    },
    {
      id: 3,
      name: "Community Hero",
      icon: "people",
      color: "#FF6B6B",
      earned: eventsSupported >= 5
    },
    {
      id: 4,
      name: "Sustained Supporter",
      icon: "repeat",
      color: "#9C27B0",
      earned: memberSince < new Date().getFullYear()
    }
  ];

  const earnedBadges = badges.filter(badge => badge.earned);

  const fieldLabels: { [key: string]: string } = {
    companyName: "Company Name",
    contactPerson: "Contact Person",
    phone: "Phone Number",
    website: "Website",
    description: "Description",
    billingAddress: "Billing Address",
    gstin: "GSTIN",
    pan: "PAN"
  };

  return (
    <>
      <ScrollView className="flex-1 bg-slate-50">
        {/* Header Section */}
        <View className="bg-white p-6 border-b border-gray-200">
          <View className="items-center mb-4">
            <View className="w-24 h-24 bg-teal-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="business" size={48} color="#4FB7B3" />
            </View>
            <Text className="text-2xl font-bold text-teal-700">{formData.companyName || "Sponsor"}</Text>
            <Text className="text-gray-600">{user?.email}</Text>
          </View>

          {/* Quick Stats */}
          <View className="flex-row justify-around mb-4">
            <View className="items-center">
              <Text className="text-2xl font-bold text-teal-700">LKR. {totalSponsored.toLocaleString()}</Text>
              <Text className="text-gray-600 text-sm">Total Sponsored</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-teal-700">{eventsSupported}</Text>
              <Text className="text-gray-600 text-sm">Events Supported</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-teal-700">{memberSince}</Text>
              <Text className="text-gray-600 text-sm">Member Since</Text>
            </View>
          </View>

          <TouchableOpacity 
            onPress={() => openEditModal("companyName", formData.companyName)}
            className="bg-teal-600 p-3 rounded-lg flex-row items-center justify-center mt-2"
          >
            <Ionicons name="create-outline" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Details Section */}
        <View className="bg-white p-6 mt-4">
          <Text className="text-xl font-bold text-teal-700 mb-4">Company Information</Text>
          
          <View className="space-y-3">
            <TouchableOpacity 
              onPress={() => openEditModal("companyName", formData.companyName)}
              className="flex-row items-center p-3 bg-gray-50 rounded-lg"
            >
              <Ionicons name="business" size={20} color="#4FB7B3" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-700">
                  <Text className="font-semibold">Company:</Text> {formData.companyName || "Not specified"}
                </Text>
              </View>
              <Ionicons name="create-outline" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => openEditModal("contactPerson", formData.contactPerson)}
              className="flex-row items-center p-3 bg-gray-50 rounded-lg"
            >
              <Ionicons name="person" size={20} color="#4FB7B3" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-700">
                  <Text className="font-semibold">Contact:</Text> {formData.contactPerson || "Not specified"}
                </Text>
              </View>
              <Ionicons name="create-outline" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => openEditModal("phone", formData.phone)}
              className="flex-row items-center p-3 bg-gray-50 rounded-lg"
            >
              <Ionicons name="call" size={20} color="#4FB7B3" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-700">
                  <Text className="font-semibold">Phone:</Text> {formData.phone || "Not provided"}
                </Text>
              </View>
              <Ionicons name="create-outline" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => openEditModal("website", formData.website)}
              className="flex-row items-center p-3 bg-gray-50 rounded-lg"
            >
              <Ionicons name="globe" size={20} color="#4FB7B3" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-700">
                  <Text className="font-semibold">Website:</Text> {formData.website || "Not provided"}
                </Text>
              </View>
              <Ionicons name="create-outline" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => openEditModal("description", formData.description)}
              className="p-3 bg-gray-50 rounded-lg"
            >
              <Text className="font-semibold text-gray-700 mb-1">About:</Text>
              <View className="flex-row justify-between items-start">
                <Text className="text-gray-600 flex-1 mr-2">
                  {formData.description || "No description provided. Click to add."}
                </Text>
                <Ionicons name="create-outline" size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Information Section */}
        <View className="bg-white p-6 mt-4">
          <TouchableOpacity 
            onPress={() => setShowPaymentDetails(!showPaymentDetails)}
            className="flex-row justify-between items-center mb-4"
          >
            <Text className="text-xl font-bold text-teal-700">Payment Information</Text>
            <Ionicons 
              name={showPaymentDetails ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#4FB7B3" 
            />
          </TouchableOpacity>

          {showPaymentDetails && (
            <View className="space-y-4">
              {/* Credit/Debit Cards */}
              <View className="bg-gray-50 p-4 rounded-lg">
                <Text className="font-semibold text-gray-700 mb-3">Payment Methods</Text>
                {paymentMethods.cards && paymentMethods.cards.length > 0 ? (
                  paymentMethods.cards.map((card) => (
                    <View key={card.id} className="flex-row items-center justify-between mb-3 p-3 bg-white rounded-lg border border-gray-200">
                      <View className="flex-row items-center">
                        <Ionicons 
                          name={card.brand.toLowerCase() === 'visa' ? 'card' : 'card-outline'} 
                          size={24} 
                          color="#4FB7B3" 
                          className="mr-3"
                        />
                        <View>
                          <Text className="font-medium text-gray-700">
                            {card.brand} •••• {card.last4}
                          </Text>
                          <Text className="text-gray-500 text-sm">
                            Expires {card.expMonth}/{card.expYear}
                            {card.isDefault && (
                              <Text className="text-teal-600 ml-2">Default</Text>
                            )}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity>
                        <Ionicons name="pencil-outline" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text className="text-gray-600">No payment methods added</Text>
                )}
                
                <TouchableOpacity className="mt-3 flex-row items-center justify-center bg-teal-50 p-3 rounded-lg border border-teal-100">
                  <Ionicons name="add-circle" size={20} color="#4FB7B3" />
                  <Text className="text-teal-700 font-medium ml-2">Add Payment Method</Text>
                </TouchableOpacity>
              </View>

              {/* Billing Information */}
              <TouchableOpacity 
                onPress={() => openEditModal("billingAddress", formData.billingAddress)}
                className="bg-gray-50 p-4 rounded-lg"
              >
                <Text className="font-semibold text-gray-700 mb-2">Billing Address</Text>
                <View className="flex-row justify-between items-start">
                  <Text className="text-gray-600 flex-1 mr-2">
                    {formData.billingAddress || "No billing address provided. Click to add."}
                  </Text>
                  <Ionicons name="create-outline" size={18} color="#9CA3AF" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => openEditModal("gstin", formData.gstin)}
                className="bg-gray-50 p-4 rounded-lg"
              >
                <Text className="font-semibold text-gray-700 mb-2">GSTIN</Text>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">{formData.gstin || "Not provided"}</Text>
                  <Ionicons name="create-outline" size={18} color="#9CA3AF" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => openEditModal("pan", formData.pan)}
                className="bg-gray-50 p-4 rounded-lg"
              >
                <Text className="font-semibold text-gray-700 mb-2">PAN</Text>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">{formData.pan || "Not provided"}</Text>
                  <Ionicons name="create-outline" size={18} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Badges & Achievements Section */}
        <View className="bg-white p-6 mt-4">
          <Text className="text-xl font-bold text-teal-700 mb-4">Achievements & Badges</Text>
          
          {earnedBadges.length > 0 ? (
            <View className="flex-row flex-wrap justify-around">
              {earnedBadges.map((badge) => (
                <View key={badge.id} className="items-center m-2 w-20">
                  <View 
                    className="w-16 h-16 rounded-full items-center justify-center mb-2"
                    style={{ backgroundColor: `${badge.color}20` }}
                  >
                    <Ionicons name={badge.icon as any} size={24} color={badge.color} />
                  </View>
                  <Text className="text-xs text-gray-700 text-center font-medium">{badge.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-gray-600 text-center">Complete your first sponsorship to earn badges!</Text>
          )}
        </View>

        {/* Logout Button */}
        <View className="p-6">
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-100 p-4 rounded-xl border border-red-200 flex-row items-center justify-center"
          >
            <Ionicons name="log-out" size={20} color="#DC2626" />
            <Text className="text-red-700 font-semibold ml-2">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <Text className="text-xl font-bold text-teal-700 mb-4">
              Edit {editingField ? fieldLabels[editingField] : 'Field'}
            </Text>
            
            {editingField === 'description' || editingField === 'billingAddress' ? (
              <TextInput
                className="border border-gray-300 rounded-lg p-4 mb-4 h-32 text-gray-700"
                placeholder={`Enter ${editingField ? fieldLabels[editingField] : 'information'}`}
                value={editValue}
                onChangeText={setEditValue}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            ) : (
              <TextInput
                className="border border-gray-300 rounded-lg p-4 mb-4 text-gray-700"
                placeholder={`Enter ${editingField ? fieldLabels[editingField] : 'information'}`}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType={
                  editingField === 'phone' ? 'phone-pad' : 
                  editingField === 'website' ? 'url' : 'default'
                }
              />
            )}

            <View className="flex-row space-x-3">
              <Pressable
                onPress={() => setEditModalVisible(false)}
                className="flex-1 bg-gray-300 rounded-lg py-3 items-center"
                disabled={isLoading}
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </Pressable>
              
              <Pressable
                onPress={handleSave}
                className="flex-1 bg-teal-600 rounded-lg py-3 items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold">Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}