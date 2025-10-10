import { useCurrency } from '@/contexts/CurrencyContext';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
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
  industry?: string;
  employeeCount?: string;
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

interface Badge {
  id: number;
  name: string;
  icon: string;
  color: string;
  earned: boolean;
  description: string;
}

interface SponsorshipDoc {
  id: string;
  eventId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
}

export default function SponsorProfileSummary() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sponsorProfile, setSponsorProfile] = useState<SponsorProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [sponsorshipStats, setSponsorshipStats] = useState({
    totalSponsored: 0,
    eventsSupported: 0
  });
  const { formatCurrency } = useCurrency();
  // Field configurations
  const fieldLabels: { [key: string]: string } = {
    companyName: "Company Name",
    contactPerson: "Contact Person",
    phone: "Phone Number",
    website: "Website",
    description: "Company Description",
    billingAddress: "Billing Address",
    gstin: "GSTIN",
    pan: "PAN Number",
    industry: "Industry Type",
    employeeCount: "Company Size"
  };

  const fieldPlaceholders: { [key: string]: string } = {
    companyName: "Enter your company's legal name",
    contactPerson: "Enter the primary contact person's name",
    phone: "Enter company phone number with country code",
    website: "https://www.yourcompany.com",
    description: "Describe your company's business and values...",
    billingAddress: "Enter complete billing address for invoices",
    gstin: "23ABCDE1234F1Z5 (12-digit GSTIN)",
    pan: "ABCDE1234F (10-digit PAN)",
    industry: "Select your main industry",
    employeeCount: "Select number of employees"
  };

  const industryOptions = [
    "Technology & IT Services",
    "Manufacturing & Production",
    "Retail & E-commerce",
    "Healthcare & Pharmaceuticals",
    "Banking & Financial Services",
    "Education & Training",
    "Energy & Utilities",
    "Transportation & Logistics",
    "Construction & Real Estate",
    "Hospitality & Tourism",
    "Food & Beverage",
    "Media & Entertainment",
    "Telecommunications",
    "Automotive",
    "Agriculture & Farming",
    "Environmental Services",
    "Other"
  ];

  const employeeCountOptions = [
    "1-10 employees (Startup)",
    "11-50 employees (Small Business)",
    "51-200 employees (Growing Company)",
    "201-500 employees (Medium Enterprise)",
    "501-1000 employees (Large Company)",
    "1000+ employees (Corporate)"
  ];

  // Helper function to safely get field descriptions
  const getFieldDescription = (field: string | null): string => {
    if (!field) return "Enter information for this field";
    
    const descriptions: { [key: string]: string } = {
      gstin: "Goods and Services Tax Identification Number - 15 characters including numbers and letters",
      pan: "Permanent Account Number - 10 character alphanumeric code issued by Income Tax Department",
      billingAddress: "Complete address where you want to receive invoices and legal documents",
      industry: "Primary business sector your company operates in",
      employeeCount: "Total number of people employed in your organization"
    };
    return descriptions[field] || `Enter your ${fieldLabels[field]?.toLowerCase()}`;
  };

  // Helper function to safely get placeholder
  const getFieldPlaceholder = (field: string | null): string => {
    if (!field) return "Enter information";
    return fieldPlaceholders[field] || `Enter ${fieldLabels[field]?.toLowerCase()}`;
  };

  // Helper function to safely get field label
  const getFieldLabel = (field: string | null): string => {
    if (!field) return "Field";
    return fieldLabels[field] || field;
  };

  // Fetch sponsor profile data and sponsorship statistics
  useEffect(() => {
    const fetchSponsorData = async () => {
      if (!user) return;

      try {
        setLoadingProfile(true);
        
        // Fetch user profile
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        let profileData: SponsorProfile;
        if (userDoc.exists()) {
          const userData = userDoc.data();
          profileData = {
            companyName: userData.companyName || "",
            contactPerson: userData.contactPerson || "",
            email: userData.email || user.email || "",
            phone: userData.phone || "",
            website: userData.website || "",
            description: userData.description || "",
            totalSponsored: userData.totalSponsored || 0,
            eventsSupported: userData.eventsSupported || 0,
            createdAt: userData.createdAt || null,
            billingAddress: userData.billingAddress || "",
            gstin: userData.gstin || "",
            pan: userData.pan || "",
            industry: userData.industry || "",
            employeeCount: userData.employeeCount || "",
            paymentMethods: userData.paymentMethods || { cards: [] }
          };
        } else {
          // Create initial profile structure if doesn't exist
          profileData = {
            companyName: "",
            contactPerson: "",
            email: user.email || "",
            phone: "",
            website: "",
            description: "",
            totalSponsored: 0,
            eventsSupported: 0,
            createdAt: new Date(),
            billingAddress: "",
            gstin: "",
            pan: "",
            industry: "",
            employeeCount: "",
            paymentMethods: { cards: [] }
          };
        }
        setSponsorProfile(profileData);

        // Fetch real sponsorship statistics
        await fetchSponsorshipStats(user.uid);
        
      } catch (error) {
        console.error("Error fetching sponsor profile:", error);
        Alert.alert("Error", "Failed to load profile data");
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchSponsorData();
  }, [user]);

  // Fetch real sponsorship statistics from Firestore
  const fetchSponsorshipStats = async (userId: string) => {
    try {
      const sponsorshipsQuery = query(
        collection(db, "sponsorships"), 
        where("sponsorId", "==", userId)
      );
      
      const sponsorshipsSnap = await getDocs(sponsorshipsQuery);
      const sponsorshipData: SponsorshipDoc[] = sponsorshipsSnap.docs.map((d) => ({ 
        id: d.id, 
        ...(d.data() as any) 
      }));

      // Calculate real statistics
      const totalSponsored = sponsorshipData
        .filter(s => s.status === 'approved' || s.status === 'completed')
        .reduce((sum, sponsorship) => sum + sponsorship.amount, 0);

      const uniqueEvents = new Set(
        sponsorshipData
          .filter(s => s.status === 'approved' || s.status === 'completed')
          .map(s => s.eventId)
      ).size;

      setSponsorshipStats({
        totalSponsored,
        eventsSupported: uniqueEvents
      });

      // Update the profile in Firestore with real statistics
      await updateDoc(doc(db, "users", userId), {
        totalSponsored,
        eventsSupported: uniqueEvents,
        updatedAt: new Date()
      });

    } catch (error) {
      console.error("Error fetching sponsorship stats:", error);
    }
  };

  // Form state for editing
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    phone: "",
    website: "",
    description: "",
    billingAddress: "",
    gstin: "",
    pan: "",
    industry: "",
    employeeCount: ""
  });

  // Update form data when profile changes
  useEffect(() => {
    if (sponsorProfile) {
      setFormData({
        companyName: sponsorProfile.companyName || "",
        contactPerson: sponsorProfile.contactPerson || "",
        phone: sponsorProfile.phone || "",
        website: sponsorProfile.website || "",
        description: sponsorProfile.description || "",
        billingAddress: sponsorProfile.billingAddress || "",
        gstin: sponsorProfile.gstin || "",
        pan: sponsorProfile.pan || "",
        industry: sponsorProfile.industry || "",
        employeeCount: sponsorProfile.employeeCount || ""
      });
    }
  }, [sponsorProfile]);


const handleLogout = async () => {
  Alert.alert(
    "Confirm Logout",
    "Are you sure you want to logout?",
    [
      {
        text: "Cancel",
        style: "cancel"
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            // Clear any cached data first
            if (Platform.OS === 'web') {
              // Clear localStorage and sessionStorage
              localStorage.clear();
              sessionStorage.clear();
              
              // Clear any Firebase auth persistence
              await auth.signOut();
              
              // Force complete reload
              window.location.href = '/auth/login';
            } else {
              // Native logout
              await signOut(auth);
              router.replace("/(public)/auth/login");
            }
          } catch (error: any) {
            console.error("Logout error:", error);
            
            // Even if signOut fails, try to redirect anyway
            if (Platform.OS === 'web') {
              window.location.href = '/auth/login';
            } else {
              router.replace("/(public)/auth/login");
            }
          }
        }
      }
    ]
  );
};
  const openEditModal = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
    setEditModalVisible(true);
  };

  const handleSave = async (value?: string) => {
    if (!user || !editingField) return;

    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      const valueToSave = value !== undefined ? value : editValue;
      const updateData = { [editingField]: valueToSave };
      
      await updateDoc(userDocRef, updateData);
      
      // Update local state
      setFormData(prev => ({ ...prev, [editingField]: valueToSave }));
      setSponsorProfile(prev => prev ? { ...prev, [editingField]: valueToSave } : null);
      
      Alert.alert("Success", "Profile updated successfully!");
      setEditModalVisible(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle selection from list (for industry and employeeCount)
  const handleSelectOption = async (option: string) => {
    if (!editingField) return;
    
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", user!.uid);
      const updateData = { [editingField]: option };
      
      await updateDoc(userDocRef, updateData);
      
      // Update local state
      setFormData(prev => ({ ...prev, [editingField]: option }));
      setSponsorProfile(prev => prev ? { ...prev, [editingField]: option } : null);
      
      setEditModalVisible(false);
      // Don't show alert for selection to make it faster
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSponsorshipStats = async () => {
    if (user) {
      await fetchSponsorshipStats(user.uid);
    }
  };

  if (loadingProfile) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text className="text-teal-700 mt-4 font-medium">Loading your profile...</Text>
      </View>
    );
  }

  // Use real sponsorship statistics
  const totalSponsored = sponsorshipStats.totalSponsored;
  const eventsSupported = sponsorshipStats.eventsSupported;
  const memberSince = sponsorProfile?.createdAt 
    ? new Date(sponsorProfile.createdAt.seconds * 1000).getFullYear() 
    : new Date().getFullYear();

  // Badges based on real sponsorship activity
  const badges: Badge[] = [
    {
      id: 1,
      name: "First Sponsor",
      icon: "trophy",
      color: "#FFD700",
      earned: totalSponsored > 0,
      description: "Complete your first sponsorship"
    },
    {
      id: 2,
      name: "Eco Champion",
      icon: "leaf",
      color: "#14B8A6",
      earned: totalSponsored >= 50000,
      description: "Sponsor LKR 50,000 or more"
    },
    {
      id: 3,
      name: "Community Hero",
      icon: "people",
      color: "#8B5CF6",
      earned: eventsSupported >= 3,
      description: "Support 3 or more events"
    },
    {
      id: 4,
      name: "Sustained Supporter",
      icon: "repeat",
      color: "#F59E0B",
      earned: eventsSupported >= 10,
      description: "Support 10+ events"
    },
    {
      id: 5,
      name: "Platinum Sponsor",
      icon: "diamond",
      color: "#E5E7EB",
      earned: totalSponsored >= 200000,
      description: "Sponsor LKR 200,000 or more"
    },
    {
      id: 6,
      name: "Profile Complete",
      icon: "checkmark-circle",
      color: "#10B981",
      earned: !!(formData.companyName && formData.contactPerson && formData.phone && formData.industry),
      description: "Complete your company profile"
    }
  ];

  const earnedBadges = badges.filter(badge => badge.earned);
  const lockedBadges = badges.filter(badge => !badge.earned);

  return (
    <>
      <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
<View className="bg-white p-6 border-b border-gray-200">
  <View className="items-center mb-4">
    <View className="w-24 h-24 bg-teal-100 rounded-full items-center justify-center mb-4 border-4 border-white shadow-lg">
      <Ionicons name="business" size={48} color="#14B8A6" />
    </View>
    <Text className="text-2xl font-bold text-teal-700 text-center">
      {formData.companyName || "Your Company Name"}
    </Text>
    <Text className="text-gray-600 text-center mt-1">{user?.email}</Text>
    {formData.industry && (
      <Text className="text-teal-500 font-medium mt-1">{formData.industry}</Text>
    )}
  </View>

  {/* Quick Stats */}
  <View className="flex-row justify-around mb-4 bg-teal-50 rounded-2xl p-4">
    <View className="items-center">
      <Text className="text-2xl font-bold text-teal-700">{formatCurrency(totalSponsored)}</Text>
      <Text className="text-gray-600 text-xs">Total Sponsored</Text>
    </View>
    <View className="items-center">
      <Text className="text-2xl font-bold text-teal-700">{eventsSupported}</Text>
      <Text className="text-gray-600 text-xs">Events Supported</Text>
    </View>
    <View className="items-center">
      <Text className="text-2xl font-bold text-teal-700">{memberSince}</Text>
      <Text className="text-gray-600 text-xs">Member Since</Text>
    </View>
  </View>

  {/* Action Buttons - UPDATED */}
  <View className="flex-row space-x-3">
    <TouchableOpacity 
      onPress={() => openEditModal("companyName", formData.companyName)}
      className="flex-1 bg-teal-500 p-4 rounded-2xl flex-row items-center justify-center shadow-lg"
    >
      <Ionicons name="create-outline" size={20} color="white" />
      <Text className="text-white font-semibold ml-2 text-lg">Edit Profile</Text>
    </TouchableOpacity>
    
    {/* Settings Button - ADD THIS */}
    <TouchableOpacity 
      onPress={() => router.push('/sponsor/tabs/settings')}
      className="bg-teal-100 p-4 rounded-2xl flex-row items-center justify-center"
    >
      <Ionicons name="settings-outline" size={20} color="#14B8A6" />
    </TouchableOpacity>

    <TouchableOpacity 
      onPress={refreshSponsorshipStats}
      className="bg-teal-100 p-4 rounded-2xl flex-row items-center justify-center"
    >
      <Ionicons name="refresh" size={20} color="#14B8A6" />
    </TouchableOpacity>
  </View>
</View>

        {/* Company Information Section */}
        <View className="bg-white p-6 mt-4 mx-4 rounded-2xl shadow-sm">
          <Text className="text-xl font-bold text-teal-700 mb-4">Company Information</Text>
          
          <View className="space-y-3">
            <TouchableOpacity 
              onPress={() => openEditModal("companyName", formData.companyName)}
              className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <Ionicons name="business" size={20} color="#14B8A6" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-700 font-medium">Company Name</Text>
                <Text className="text-gray-600 mt-1">
                  {formData.companyName || "Not specified - Tap to add your company's legal name"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => openEditModal("contactPerson", formData.contactPerson)}
              className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <Ionicons name="person" size={20} color="#14B8A6" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-700 font-medium">Contact Person</Text>
                <Text className="text-gray-600 mt-1">
                  {formData.contactPerson || "Not specified - Tap to add primary contact"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => openEditModal("phone", formData.phone)}
              className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <Ionicons name="call" size={20} color="#14B8A6" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-700 font-medium">Phone Number</Text>
                <Text className="text-gray-600 mt-1">
                  {formData.phone || "Not provided - Tap to add business phone"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => openEditModal("industry", formData.industry)}
              className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <Ionicons name="construct" size={20} color="#14B8A6" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-700 font-medium">Industry Type</Text>
                <Text className="text-gray-600 mt-1">
                  {formData.industry || "Not specified - Tap to select your industry"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => openEditModal("employeeCount", formData.employeeCount)}
              className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <Ionicons name="people" size={20} color="#14B8A6" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-700 font-medium">Company Size</Text>
                <Text className="text-gray-600 mt-1">
                  {formData.employeeCount || "Not specified - Tap to select employee count"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => openEditModal("website", formData.website)}
              className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <Ionicons name="globe" size={20} color="#14B8A6" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-700 font-medium">Website</Text>
                <Text className="text-gray-600 mt-1">
                  {formData.website || "Not provided - Tap to add company website"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => openEditModal("description", formData.description)}
              className="p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <Text className="text-gray-700 font-medium mb-2">About Company</Text>
              <View className="flex-row justify-between items-start">
                <Text className="text-gray-600 flex-1 mr-2">
                  {formData.description || "No description provided. Tap to add about your company's mission and values."}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Business & Tax Information Section */}
        <View className="bg-white p-6 mt-4 mx-4 rounded-2xl shadow-sm">
          <Text className="text-xl font-bold text-teal-700 mb-4">Business & Tax Information</Text>
          
          <View className="space-y-3">
            <TouchableOpacity 
              onPress={() => openEditModal("gstin", formData.gstin)}
              className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <Ionicons name="document-text" size={20} color="#14B8A6" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-700 font-medium">GSTIN Number</Text>
                <Text className="text-gray-600 mt-1">
                  {formData.gstin || "Not provided - Tap to add 15-digit GSTIN"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => openEditModal("pan", formData.pan)}
              className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <Ionicons name="card" size={20} color="#14B8A6" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-700 font-medium">PAN Number</Text>
                <Text className="text-gray-600 mt-1">
                  {formData.pan || "Not provided - Tap to add 10-digit PAN"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => openEditModal("billingAddress", formData.billingAddress)}
              className="p-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <Text className="text-gray-700 font-medium mb-2">Billing Address</Text>
              <View className="flex-row justify-between items-start">
                <Text className="text-gray-600 flex-1 mr-2">
                  {formData.billingAddress || "No billing address provided. Tap to add complete address for invoices and legal documents."}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        

        {/* Badges & Achievements Section */}
        <View className="bg-white p-6 mt-4 mx-4 rounded-2xl shadow-sm">
          <Text className="text-xl font-bold text-teal-700 mb-4">Achievements & Badges</Text>
          
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-700 mb-3">Earned Badges ({earnedBadges.length})</Text>
            {earnedBadges.length > 0 ? (
              <View className="flex-row flex-wrap justify-start -mx-2">
                {earnedBadges.map((badge) => (
                  <View key={badge.id} className="w-1/3 p-2">
                    <View className="items-center bg-teal-50 rounded-xl p-4 border border-teal-100">
                      <View 
                        className="w-12 h-12 rounded-full items-center justify-center mb-2"
                        style={{ backgroundColor: `${badge.color}20` }}
                      >
                        <Ionicons name={badge.icon as any} size={24} color={badge.color} />
                      </View>
                      <Text className="text-xs text-gray-700 text-center font-semibold">{badge.name}</Text>
                      <Text className="text-xs text-gray-500 text-center mt-1">{badge.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-gray-50 rounded-xl p-6 items-center border border-gray-200">
                <Ionicons name="trophy-outline" size={48} color="#9CA3AF" />
                <Text className="text-gray-600 text-center mt-3 font-medium">No badges earned yet</Text>
                <Text className="text-gray-500 text-center mt-1 text-sm">
                  Complete sponsorships to earn badges!
                </Text>
              </View>
            )}
          </View>

          {lockedBadges.length > 0 && (
            <View>
              <Text className="text-lg font-semibold text-gray-700 mb-3">Available Badges</Text>
              <View className="space-y-2">
                {lockedBadges.map((badge) => (
                  <View key={badge.id} className="flex-row items-center p-3 bg-gray-50 rounded-xl border border-gray-200 opacity-60">
                    <View 
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: `${badge.color}20` }}
                    >
                      <Ionicons name={badge.icon as any} size={20} color={badge.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-700 font-medium">{badge.name}</Text>
                      <Text className="text-gray-500 text-xs">{badge.description}</Text>
                    </View>
                    <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
       

        {/* Logout Button */}
        <View className="p-6 mx-4 mb-8">
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-50 p-4 rounded-2xl border border-red-200 flex-row items-center justify-center shadow-sm"
          >
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text className="text-red-700 font-semibold ml-2 text-lg">Logout</Text>
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
          <View className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80%]">
            <Text className="text-xl font-bold text-teal-700 mb-2">
              Edit {getFieldLabel(editingField)}
            </Text>
            
            <Text className="text-gray-600 text-sm mb-4">
              {getFieldDescription(editingField)}
            </Text>
            
            {editingField === 'industry' ? (
              <View className="max-h-64">
                <ScrollView 
                  showsVerticalScrollIndicator={true}
                  className="border border-gray-300 rounded-xl"
                >
                  {industryOptions.map((industry) => (
                    <TouchableOpacity
                      key={industry}
                      onPress={() => handleSelectOption(industry)}
                      className="p-4 border-b border-gray-200 active:bg-teal-50"
                      disabled={isLoading}
                    >
                      <Text className="text-gray-700 text-lg">{industry}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {isLoading && (
                  <View className="absolute inset-0 bg-white bg-opacity-70 justify-center items-center">
                    <ActivityIndicator size="small" color="#14B8A6" />
                  </View>
                )}
              </View>
            ) : editingField === 'employeeCount' ? (
              <View className="max-h-64">
                <ScrollView 
                  showsVerticalScrollIndicator={true}
                  className="border border-gray-300 rounded-xl"
                >
                  {employeeCountOptions.map((size) => (
                    <TouchableOpacity
                      key={size}
                      onPress={() => handleSelectOption(size)}
                      className="p-4 border-b border-gray-200 active:bg-teal-50"
                      disabled={isLoading}
                    >
                      <Text className="text-gray-700 text-lg">{size}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {isLoading && (
                  <View className="absolute inset-0 bg-white bg-opacity-70 justify-center items-center">
                    <ActivityIndicator size="small" color="#14B8A6" />
                  </View>
                )}
              </View>
            ) : editingField === 'description' || editingField === 'billingAddress' ? (
              <TextInput
                className="border border-gray-300 rounded-xl p-4 mb-4 h-32 text-gray-700 text-lg"
                placeholder={getFieldPlaceholder(editingField)}
                value={editValue}
                onChangeText={setEditValue}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <TextInput
                className="border border-gray-300 rounded-xl p-4 mb-4 text-gray-700 text-lg"
                placeholder={getFieldPlaceholder(editingField)}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType={
                  editingField === 'phone' ? 'phone-pad' : 
                  editingField === 'website' ? 'url' : 'default'
                }
                autoCapitalize={editingField === 'website' ? 'none' : 'words'}
                placeholderTextColor="#9CA3AF"
              />
            )}

            {/* Show Save/Cancel buttons only for text input fields */}
            {(editingField !== 'industry' && editingField !== 'employeeCount') && (
              <View className="flex-row space-x-3">
                <Pressable
                  onPress={() => setEditModalVisible(false)}
                  className="flex-1 bg-gray-300 rounded-xl py-4 items-center"
                  disabled={isLoading}
                >
                  <Text className="text-gray-700 font-semibold text-lg">Cancel</Text>
                </Pressable>
                
                <Pressable
                  onPress={() => handleSave()}
                  className="flex-1 bg-teal-500 rounded-xl py-4 items-center"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold text-lg">Save</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* For selection fields, show close button */}
            {(editingField === 'industry' || editingField === 'employeeCount') && (
              <Pressable
                onPress={() => setEditModalVisible(false)}
                className="bg-gray-300 rounded-xl py-4 items-center mt-4"
                disabled={isLoading}
              >
                <Text className="text-gray-700 font-semibold text-lg">Close</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}