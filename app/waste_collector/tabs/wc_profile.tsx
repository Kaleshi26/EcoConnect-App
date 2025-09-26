import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { CheckCircle, FileText, History, LogOut, MapPin, Truck, User } from "lucide-react-native";
import React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { auth } from "../../../services/firebaseConfig";

export default function WcProfile() {
  const { user } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace("/(public)/auth/login");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to sign out");
    }
  }

  function handleAssignmentHistory() {
    Alert.alert("Coming Soon", "Assignment history feature will be available soon!");
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

        {/* Assignment history */}
        <View className="bg-white rounded-2xl shadow border border-slate-100 p-6 mb-6">
          <TouchableOpacity onPress={handleAssignmentHistory} className="flex-row items-center">
            <History size={20} color="#16a34a" />
            <Text className="ml-3 text-slate-800 font-medium text-base">Assignment History</Text>
          </TouchableOpacity>
        </View>

        {/* Terms & Conditions */}
        <View className="bg-white rounded-2xl shadow border border-slate-100 p-6 mb-6">
          <TouchableOpacity onPress={handleTerms} className="flex-row items-center">
            <FileText size={20} color="#16a34a" />
            <Text className="ml-3 text-slate-800 font-medium text-base">Terms & Conditions</Text>
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
    </View>
  );
}
