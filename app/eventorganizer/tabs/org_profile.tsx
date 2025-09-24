// app/eventorganizer/tabs/org_profile.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { auth } from "../../../services/firebaseConfig";

function OrganizerProfileDetails({ orgName }: { orgName?: string }) {
  return (
    <View className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <Text className="text-xl font-semibold mb-3 text-gray-900">
        Organizer Profile
      </Text>
      {orgName && (
        <View className="flex-row items-center mb-2">
          <Ionicons name="business-outline" size={18} color="#2563eb" />
          <Text className="ml-2 text-gray-700">Organization: {orgName}</Text>
        </View>
      )}
      <View className="flex-row items-center mb-2">
        <Ionicons name="calendar-outline" size={18} color="#2563eb" />
        <Text className="ml-2 text-gray-700">Create & manage clean-up events</Text>
      </View>
      <View className="flex-row items-center mb-2">
        <Ionicons name="people-outline" size={18} color="#2563eb" />
        <Text className="ml-2 text-gray-700">Track volunteer participation</Text>
      </View>
      <View className="flex-row items-center">
        <Ionicons name="bar-chart-outline" size={18} color="#2563eb" />
        <Text className="ml-2 text-gray-700">View impact analytics</Text>
      </View>
    </View>
  );
}

export default function OrgProfile() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/(public)/auth/login");
  };

  return (
    <View className="flex-1 bg-gray-50 px-6 py-8">
      {/* Header */}
      <View className="items-center mb-8">
        {/* Profile avatar */}
        <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center mb-4">
          <Ionicons name="person-circle-outline" size={80} color="#2563eb" />
        </View>
        <Text className="text-2xl font-bold text-gray-900">Profile</Text>
        <Text className="text-lg text-gray-600 mt-1">{user?.email}</Text>
      </View>

      {/* Profile Details */}
      <View className="mb-10">
        {profile ? (
          <OrganizerProfileDetails orgName={(profile as any)?.orgName} />
        ) : (
          <Text className="text-center text-gray-500">
            No profile found. Please contact admin.
          </Text>
        )}
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        onPress={handleLogout}
        className="bg-red-500 w-full py-4 rounded-xl shadow-md"
      >
        <Text className="text-white text-center font-semibold text-base">
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
}
