import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import React, { useState } from "react";
import { ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../contexts/AuthContext";
import { auth } from "../../../services/firebaseConfig";


// Define TypeScript interfaces for our data structures
interface ProfileData {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  description: string;
}

interface Notifications {
  eventUpdates: boolean;
  impactReports: boolean;
  certificates: boolean;
  newsletter: boolean;
  email: boolean;
  sms: boolean;
}

// Define props interfaces for our components
interface ProfileSectionProps {
  profileData: ProfileData;
  setProfileData: React.Dispatch<React.SetStateAction<ProfileData>>;
}

interface NotificationsSectionProps {
  notifications: Notifications;
  setNotifications: React.Dispatch<React.SetStateAction<Notifications>>;
}

export default function SponsorProfile() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("profile");
  
  const [profileData, setProfileData] = useState<ProfileData>({
    companyName: "BlueWave Industries",
    contactPerson: "Rajesh Kumar",
    email: "rajesh@bluewave.com",
    phone: "+91 98765 43210",
    description: "Leading technology company committed to environmental sustainability.",
  });

  const [notifications, setNotifications] = useState<Notifications>({
    eventUpdates: true,
    impactReports: true,
    certificates: true,
    newsletter: false,
    email: true,
    sms: true,
  });

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/(public)/auth/login");
  };

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-light-100 px-6">
        <Text className="text-2xl font-bold mb-4 text-custom-blue">Profile</Text>
        <Text className="text-lg mb-6">{user?.email}</Text>
        <Text>No profile found. Please contact admin.</Text>
        <TouchableOpacity onPress={handleLogout} className="bg-custom-red w-full py-3 rounded-xl mt-4">
          <Text className="text-white text-center font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const menuItems = [
    { id: "profile", title: "Profile", icon: "account" },
    { id: "notifications", title: "Notifications", icon: "bell" },
    { id: "payment", title: "Payment", icon: "credit-card" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-light-100">
      {/* Header with menu */}
      <View className="p-4 bg-white">
        <Text className="text-xl font-bold text-primary">Settings</Text>
        <Text className="text-sm text-muted-foreground">Manage your account</Text>
        
        {/* Menu selector */}
        <View className="flex-row justify-around mt-4 border-b border-gray-200">
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setActiveSection(item.id)}
              className={`pb-3 px-4 ${activeSection === item.id ? "border-b-2 border-custom-blue" : ""}`}
            >
              <View className="flex-row items-center">
                <MaterialCommunityIcons 
                  name={item.icon as any} 
                  size={16} 
                  color={activeSection === item.id ? "#1e88e5" : "#64748b"} 
                />
                <Text 
                  className={`ml-2 ${activeSection === item.id ? "text-custom-blue font-semibold" : "text-gray-500"}`}
                >
                  {item.title}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content area */}
      <ScrollView className="flex-1 p-4">
        {activeSection === "profile" && (
          <ProfileSection profileData={profileData} setProfileData={setProfileData} />
        )}
        {activeSection === "notifications" && (
          <NotificationsSection notifications={notifications} setNotifications={setNotifications} />
        )}
        {activeSection === "payment" && <PaymentSection />}
      </ScrollView>

      {/* Logout button */}
      <View className="p-6 bg-light-100">
        <TouchableOpacity onPress={handleLogout} className="bg-custom-red w-full py-3 rounded-xl">
          <Text className="text-white text-center font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Profile Section Component
function ProfileSection({ profileData, setProfileData }: ProfileSectionProps) {
  return (
    <View className="space-y-4">
      <View className="bg-white rounded-lg shadow-md p-4 ocean-shadow">
        <View className="flex-row items-center space-x-2 mb-4">
          <MaterialCommunityIcons name="account" size={16} color="black" />
          <Text className="text-base font-bold">Profile Information</Text>
        </View>
        <View className="flex-row items-center space-x-4 mb-4">
          <View className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 justify-center items-center">
            <MaterialCommunityIcons name="image" size={24} color="gray" />
          </View>
          <View className="space-y-2">
            <Text className="text-sm font-medium">Company Logo</Text>
            <TouchableOpacity className="border border-gray-300 rounded-md px-2 py-1 flex-row items-center">
              <MaterialCommunityIcons name="upload" size={12} color="black" className="mr-2" />
              <Text className="text-xs">Upload</Text>
            </TouchableOpacity>
            <Text className="text-xs text-muted-foreground">PNG, JPG up to 2MB</Text>
          </View>
        </View>
        <View className="space-y-3">
          <View className="space-y-1">
            <Text className="text-sm">Company Name</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2"
              value={profileData.companyName}
              onChangeText={(text) => setProfileData({ ...profileData, companyName: text })}
            />
          </View>
          <View className="space-y-1">
            <Text className="text-sm">Contact Person</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2"
              value={profileData.contactPerson}
              onChangeText={(text) => setProfileData({ ...profileData, contactPerson: text })}
            />
          </View>
          <View className="space-y-1">
            <Text className="text-sm">Email Address</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2"
              value={profileData.email}
              onChangeText={(text) => setProfileData({ ...profileData, email: text })}
              keyboardType="email-address"
            />
          </View>
          <View className="space-y-1">
            <Text className="text-sm">Phone Number</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2"
              value={profileData.phone}
              onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
              keyboardType="phone-pad"
            />
          </View>
          <View className="space-y-1">
            <Text className="text-sm">Company Description</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2 h-20"
              value={profileData.description}
              onChangeText={(text) => setProfileData({ ...profileData, description: text })}
              multiline
            />
          </View>
        </View>
        <TouchableOpacity className="w-full ocean-gradient py-3 rounded-md mt-4">
          <Text className="text-white text-center font-semibold">Save Changes</Text>
        </TouchableOpacity>
      </View>
      <View className="bg-white rounded-lg shadow-md p-4 ocean-shadow">
        <Text className="text-base font-bold mb-4">Account Status</Text>
        <View className="flex-row justify-around">
          <View className="items-center">
            <View className="bg-green-100 px-2 py-1 rounded-full mb-1">
              <Text className="text-green-800 text-xs">Verified</Text>
            </View>
            <Text className="text-xs text-muted-foreground">Status</Text>
          </View>
          <View className="items-center">
            <View className="bg-yellow-100 px-2 py-1 rounded-full mb-1">
              <Text className="text-yellow-800 text-xs">Gold</Text>
            </View>
            <Text className="text-xs text-muted-foreground">Level</Text>
          </View>
          <View className="items-center">
            <View className="bg-blue-100 px-2 py-1 rounded-full mb-1">
              <Text className="text-blue-800 text-xs">2024</Text>
            </View>
            <Text className="text-xs text-muted-foreground">Member</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// Notifications Section Component
function NotificationsSection({ notifications, setNotifications }: NotificationsSectionProps) {
  return (
    <View className="space-y-4">
      <View className="bg-white rounded-lg shadow-md p-4 ocean-shadow">
        <View className="flex-row items-center space-x-2 mb-4">
          <MaterialCommunityIcons name="bell" size={16} color="black" />
          <Text className="text-base font-bold">Notification Preferences</Text>
        </View>
        <View className="space-y-4">
          <Text className="text-sm font-medium">What to receive</Text>
          <View className="space-y-3">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-sm font-medium">Event Updates</Text>
                <Text className="text-xs text-muted-foreground">New cleanup events</Text>
              </View>
              <Switch
                value={notifications.eventUpdates}
                onValueChange={(value) => setNotifications({ ...notifications, eventUpdates: value })}
              />
            </View>
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-sm font-medium">Impact Reports</Text>
                <Text className="text-xs text-muted-foreground">Monthly summaries</Text>
              </View>
              <Switch
                value={notifications.impactReports}
                onValueChange={(value) => setNotifications({ ...notifications, impactReports: value })}
              />
            </View>
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-sm font-medium">Certificates</Text>
                <Text className="text-xs text-muted-foreground">Achievement badges</Text>
              </View>
              <Switch
                value={notifications.certificates}
                onValueChange={(value) => setNotifications({ ...notifications, certificates: value })}
              />
            </View>
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-sm font-medium">Newsletter</Text>
                <Text className="text-xs text-muted-foreground">Weekly updates</Text>
              </View>
              <Switch
                value={notifications.newsletter}
                onValueChange={(value) => setNotifications({ ...notifications, newsletter: value })}
              />
            </View>
          </View>
        </View>
        <View className="space-y-4 mt-4">
          <Text className="text-sm font-medium">How to receive</Text>
          <View className="space-y-3">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-sm font-medium">Email</Text>
                <Text className="text-xs text-muted-foreground">Via email notifications</Text>
              </View>
              <Switch
                value={notifications.email}
                onValueChange={(value) => setNotifications({ ...notifications, email: value })}
              />
            </View>
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-sm font-medium">SMS</Text>
                <Text className="text-xs text-muted-foreground">Urgent updates only</Text>
              </View>
              <Switch
                value={notifications.sms}
                onValueChange={(value) => setNotifications({ ...notifications, sms: value })}
              />
            </View>
          </View>
        </View>
        <TouchableOpacity className="w-full ocean-gradient py-3 rounded-md mt-4">
          <Text className="text-white text-center font-semibold">Save Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Payment Section Component
function PaymentSection() {
  return (
    <View className="space-y-4">
      <View className="bg-white rounded-lg shadow-md p-4 ocean-shadow">
        <View className="flex-row items-center space-x-2 mb-4">
          <MaterialCommunityIcons name="credit-card" size={16} color="black" />
          <Text className="text-base font-bold">Payment Methods</Text>
        </View>
        <View className="space-y-3">
          <Text className="text-sm font-medium">Saved Cards</Text>
          <View className="space-y-2">
            <View className="flex-row justify-between items-center p-3 border border-gray-300 rounded-lg">
              <View className="flex-row items-center space-x-3">
                <View className="w-8 h-6 bg-blue-600 rounded justify-center items-center">
                  <Text className="text-white text-xs font-bold">V</Text>
                </View>
                <View>
                  <Text className="text-sm font-medium">•••• 4567</Text>
                  <Text className="text-xs text-muted-foreground">Expires 12/26</Text>
                </View>
                <View className="bg-green-100 px-2 py-1 rounded-full">
                  <Text className="text-green-800 text-xs">Primary</Text>
                </View>
              </View>
              <TouchableOpacity className="border border-gray-300 rounded-md p-1">
                <MaterialCommunityIcons name="pencil" size={12} color="black" />
              </TouchableOpacity>
            </View>
            <View className="flex-row justify-between items-center p-3 border border-gray-300 rounded-lg">
              <View className="flex-row items-center space-x-3">
                <View className="w-8 h-6 bg-red-500 rounded justify-center items-center">
                  <Text className="text-white text-xs font-bold">M</Text>
                </View>
                <View>
                  <Text className="text-sm font-medium">•••• 8901</Text>
                  <Text className="text-xs text-muted-foreground">Expires 08/25</Text>
                </View>
              </View>
              <TouchableOpacity className="border border-gray-300 rounded-md p-1">
                <MaterialCommunityIcons name="pencil" size={12} color="black" />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity className="w-full border border-gray-300 py-3 rounded-md">
            <Text className="text-center text-sm">Add New Card</Text>
          </TouchableOpacity>
        </View>
        <View className="space-y-3 mt-4">
          <Text className="text-sm font-medium">Billing Information</Text>
          <View className="space-y-2">
            <View className="space-y-1">
              <Text className="text-sm">Billing Name</Text>
              <TextInput className="border border-gray-300 rounded-md p-2" value="BlueWave Industries" />
            </View>
            <View className="space-y-1">
              <Text className="text-sm">GST Number</Text>
              <TextInput className="border border-gray-300 rounded-md p-2" value="29ABCDE1234F1Z5" />
            </View>
            <View className="space-y-1">
              <Text className="text-sm">Billing Address</Text>
              <TextInput
                className="border border-gray-300 rounded-md p-2 h-16"
                value="Tech Park, Bangalore, Karnataka - 560001"
                multiline
              />
            </View>
          </View>
        </View>
        <TouchableOpacity className="w-full ocean-gradient py-3 rounded-md mt-4">
          <Text className="text-white text-center font-semibold">Update Billing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}