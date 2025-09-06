import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import React, { useRef, useState } from "react";
import { Animated, Pressable, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/services/firebaseConfig";

// Custom hook for press animations
function usePressScale(initial = 1) {
  const scale = useRef(new Animated.Value(initial)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return { scale, onPressIn, onPressOut };
}

function VolVolunteerProfile({ isTeam, teamName }: { isTeam?: boolean; teamName?: string }) {
  return (
    <View className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
      {/* Header */}
      <View className="bg-gradient-to-r from-blue-50 to-slate-50 p-6 pb-4">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
            <Ionicons name="person-outline" size={20} color="#3b82f6" />
          </View>
          <Text className="text-xl font-bold text-slate-800">Volunteer Profile</Text>
        </View>
      </View>

      {/* Content */}
      <View className="p-6">
        <View className="mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="people-outline" size={16} color="#3b82f6" />
            </View>
            <View>
              <Text className="text-slate-700 font-medium">Mode</Text>
              <Text className="text-slate-800 font-semibold">
                {isTeam ? "Team/Community" : "Individual"}
              </Text>
            </View>
          </View>
          
          {isTeam && teamName && (
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="business-outline" size={16} color="#3b82f6" />
              </View>
              <View>
                <Text className="text-slate-700 font-medium">Team</Text>
                <Text className="text-slate-800 font-semibold">{teamName}</Text>
              </View>
            </View>
          )}
        </View>

        <View className="pt-4 border-t border-blue-100">
          <Text className="text-slate-600 font-medium mb-3">Volunteer Benefits:</Text>
          <View className="space-y-2">
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
              <Text className="text-slate-700">Browse & join clean-up events</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
              <Text className="text-slate-700">Track your impact & earn badges</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
              <Text className="text-slate-700">Connect with local community</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function VolProfile() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;
  const completeBtnAnim = usePressScale();
  const accountBtnAnim = usePressScale();
  const logoutBtnAnim = usePressScale();
  const menuOpacity = useRef(new Animated.Value(0)).current;

  // Header animation
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerTranslate, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // Menu animation
  React.useEffect(() => {
    Animated.timing(menuOpacity, {
      toValue: showAccountMenu ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showAccountMenu]);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/(public)/auth/login");
  };

  const handleCompleteAccount = () => {
    console.log("[VolProfile] Complete account clicked");
  };

  const toggleAccountMenu = () => {
    setShowAccountMenu(!showAccountMenu);
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <Animated.View
        style={{ 
          opacity: headerOpacity, 
          transform: [{ translateY: headerTranslate }] 
        }}
        className="bg-gradient-to-r from-blue-600 to-slate-700"
      >
        <View className="px-6 pt-5 pb-1">
        </View>
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 mb-6">
          <View className="items-center">
            <View className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-slate-100 border-2 border-blue-200 shadow-md items-center justify-center mb-4">
              <Ionicons name="person" size={40} color="#3b82f6" />
            </View>
            <Text className="text-xl font-bold text-slate-800 mb-1">
              {user?.email?.split('@')[0] || 'Volunteer'}
            </Text>
            <Text className="text-slate-600 text-center">{user?.email}</Text>
            <View className="flex-row items-center mt-3 px-3 py-1.5 bg-blue-50 rounded-full">
              <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              <Text className="text-blue-700 font-medium text-sm">Active Volunteer</Text>
            </View>
          </View>
        </View>

        {/* Volunteer Profile */}
        <View className="mb-6">
          {profile ? (
            <VolVolunteerProfile isTeam={profile?.isTeam} teamName={(profile as any)?.teamName} />
          ) : (
            <View className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6">
              <View className="items-center py-4">
                <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
                  <Ionicons name="alert-circle-outline" size={32} color="#64748b" />
                </View>
                <Text className="text-slate-700 text-center">
                  No profile found. Please contact admin for assistance.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Badge Achievement Card */}
        <View className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden mb-6">
          <View className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 pb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-yellow-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="trophy" size={20} color="#f59e0b" />
              </View>
              <Text className="text-xl font-bold text-slate-800">Earn Your Badge</Text>
            </View>
          </View>

          <View className="p-6">
            <View className="flex-row items-start mb-4">
              <View className="w-12 h-12 bg-yellow-100 rounded-full items-center justify-center mr-4 mt-1">
                <Ionicons name="medal" size={24} color="#f59e0b" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-800 font-semibold mb-2">Golden Volunteer Badge</Text>
                <Text className="text-slate-600 leading-5">
                  Complete your account profile to unlock exclusive features and earn recognition in the community.
                </Text>
              </View>
            </View>

            <Animated.View style={{ transform: [{ scale: completeBtnAnim.scale }] }}>
              <TouchableOpacity
                onPress={handleCompleteAccount}
                onPressIn={completeBtnAnim.onPressIn}
                onPressOut={completeBtnAnim.onPressOut}
                className="bg-blue-600 rounded-xl py-4 items-center shadow-md"
              >
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text className="text-white font-bold ml-2 text-base">Complete Account</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Account Settings Card */}
        <View className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
          <Animated.View style={{ transform: [{ scale: accountBtnAnim.scale }] }}>
            <Pressable
              onPress={toggleAccountMenu}
              onPressIn={accountBtnAnim.onPressIn}
              onPressOut={accountBtnAnim.onPressOut}
              className="p-6 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="settings-outline" size={20} color="#64748b" />
                </View>
                <Text className="text-xl font-bold text-slate-800">Account Settings</Text>
              </View>
              <Animated.View
                style={{
                  transform: [{
                    rotate: showAccountMenu ? '180deg' : '0deg'
                  }]
                }}
              >
                <Ionicons name="chevron-down" size={24} color="#64748b" />
              </Animated.View>
            </Pressable>
          </Animated.View>

          {showAccountMenu && (
            <Animated.View
              style={{ opacity: menuOpacity }}
              className="px-6 pb-6"
            >
              <View className="pt-4 border-t border-slate-100">
                <Animated.View style={{ transform: [{ scale: logoutBtnAnim.scale }] }}>
                  <TouchableOpacity
                    onPress={handleLogout}
                    onPressIn={logoutBtnAnim.onPressIn}
                    onPressOut={logoutBtnAnim.onPressOut}
                    className="bg-red-500 rounded-xl py-4 items-center shadow-md"
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="log-out-outline" size={20} color="white" />
                      <Text className="text-white font-bold ml-2 text-base">Sign Out</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}