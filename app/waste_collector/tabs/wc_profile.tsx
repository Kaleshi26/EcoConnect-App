import * as Notifications from 'expo-notifications';
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { Bell, BellOff, CheckCircle, ChevronRight, Clock, FileText, History, LogOut, MapPin, Settings, Truck, User } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Modal, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { useNotifications } from "../../../contexts/NotificationContext";
import { auth } from "../../../services/firebaseConfig";
import * as NotificationService from "../../../services/notificationService";

export default function WcProfile() {
  const { user } = useAuth();
  const router = useRouter();
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const { 
    notificationsEnabled, 
    remindersEnabled, 
    scheduledCount,
    setNotificationsEnabled,
    setRemindersEnabled,
    refreshScheduledCount
  } = useNotifications();
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  // Initialize notification listeners
  useEffect(() => {
    async function setupNotifications() {
      try {
        const token = await NotificationService.registerForPushNotificationsAsync();
        if (token && user?.uid) {
          await NotificationService.savePushToken(user.uid, token);
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    }

    setupNotifications();

    // Handle notification received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification tapped
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      
      // Navigate based on notification type
      if (data.screen === 'wc_assignment') {
        router.push('/waste_collector/tabs/wc_assignment');
      } else if (data.screen === 'wc_analytics') {
        router.push('/waste_collector/tabs/wc_analytics');
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.uid]);

  // Refresh scheduled count when modal opens
  useEffect(() => {
    if (showNotificationSettings) {
      refreshScheduledCount();
    }
  }, [showNotificationSettings]);

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

        {/* Notification Settings Card */}
        <View className="bg-white rounded-2xl shadow border border-slate-100 p-6 mb-6">
          <TouchableOpacity 
            onPress={() => setShowNotificationSettings(true)} 
            className="flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              {notificationsEnabled ? (
                <Bell size={20} color="#2563eb" />
              ) : (
                <BellOff size={20} color="#9ca3af" />
              )}
              <View className="ml-3 flex-1">
                <Text className="text-slate-800 font-medium text-base">Notifications</Text>
                <Text className="text-slate-500 text-xs mt-0.5">
                  {scheduledCount} scheduled reminder{scheduledCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Assignment history */}
        <View className="bg-white rounded-2xl shadow border border-slate-100 p-6 mb-6">
          <TouchableOpacity onPress={handleAssignmentHistory} className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <History size={20} color="#16a34a" />
              <Text className="ml-3 text-slate-800 font-medium text-base">Assignment History</Text>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>
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

      {/* Notification Settings Modal */}
      <Modal
        visible={showNotificationSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotificationSettings(false)}
      >
        <View className="flex-1 bg-slate-50">
          {/* Header */}
          <View className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 pt-12 pb-6 shadow-lg">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="bg-white/20 p-3 rounded-xl mr-3">
                  <Settings size={24} color="white" />
                </View>
                <View>
                  <Text className="text-white text-2xl font-bold">Notification Settings</Text>
                  <Text className="text-blue-100 text-sm">Manage alerts & reminders</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowNotificationSettings(false)}
                className="bg-white/20 p-2 rounded-full"
              >
                <Text className="text-white font-bold text-lg">×</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Settings Content */}
          <ScrollView className="flex-1 px-6 py-6">
            {/* Main Notifications Toggle */}
            <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <Bell size={20} color="#2563eb" />
                    <Text className="text-lg font-bold text-gray-900 ml-2">Push Notifications</Text>
                  </View>
                  <Text className="text-gray-600 text-sm">
                    Receive notifications about assignment updates
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={(value) => setNotificationsEnabled(value)}
                  trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                  thumbColor={notificationsEnabled ? '#2563eb' : '#f3f4f6'}
                />
              </View>
            </View>

            {/* Reminders Toggle */}
            <View className={`bg-white rounded-2xl p-5 mb-4 shadow-sm ${!notificationsEnabled && 'opacity-50'}`}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <Clock size={20} color="#d97706" />
                    <Text className="text-lg font-bold text-gray-900 ml-2">Assignment Reminders</Text>
                  </View>
                  <Text className="text-gray-600 text-sm">
                    Get reminded 24h and 1h before scheduled assignments
                  </Text>
                </View>
                <Switch
                  value={remindersEnabled}
                  onValueChange={setRemindersEnabled}
                  disabled={!notificationsEnabled}
                  trackColor={{ false: '#d1d5db', true: '#fcd34d' }}
                  thumbColor={remindersEnabled ? '#d97706' : '#f3f4f6'}
                />
              </View>
            </View>

            {/* Scheduled Notifications Count */}
            {scheduledCount > 0 && (
              <View className="bg-green-50 rounded-2xl p-5 mb-4 border border-green-200">
                <View className="flex-row items-center mb-2">
                  <Clock size={18} color="#059669" />
                  <Text className="text-green-900 font-bold text-base ml-2">Active Reminders</Text>
                </View>
                <Text className="text-green-800 text-sm">
                  You have {scheduledCount} reminder{scheduledCount !== 1 ? 's' : ''} scheduled for upcoming assignments.
                </Text>
              </View>
            )}

            {/* Notification Types Info */}
            <View className="bg-blue-50 rounded-2xl p-5 mb-4 border border-blue-200">
              <Text className="text-blue-900 font-bold text-base mb-3">📬 You'll receive notifications for:</Text>
              <View className="space-y-2">
                <View className="flex-row items-start mb-2">
                  <Text className="text-blue-700 mr-2">•</Text>
                  <Text className="text-blue-800 text-sm flex-1">New assignments assigned to you</Text>
                </View>
                <View className="flex-row items-start mb-2">
                  <Text className="text-blue-700 mr-2">•</Text>
                  <Text className="text-blue-800 text-sm flex-1">Assignment reminders (24h & 1h before)</Text>
                </View>
                <View className="flex-row items-start mb-2">
                  <Text className="text-blue-700 mr-2">•</Text>
                  <Text className="text-blue-800 text-sm flex-1">Assignment completion confirmations</Text>
                </View>
                <View className="flex-row items-start">
                  <Text className="text-blue-700 mr-2">•</Text>
                  <Text className="text-blue-800 text-sm flex-1">Achievement unlocks and milestones</Text>
                </View>
              </View>
            </View>

            {/* Clear All Button */}
            <TouchableOpacity
              onPress={async () => {
                Alert.alert(
                  'Clear All Notifications',
                  'Are you sure you want to clear all pending notifications?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: async () => {
                        await NotificationService.clearAllNotifications();
                        await refreshScheduledCount();
                        Alert.alert('Success', 'All notifications cleared');
                      }
                    }
                  ]
                );
              }}
              className="bg-red-50 border border-red-200 rounded-2xl p-4 items-center mb-4"
            >
              <Text className="text-red-600 font-semibold">Clear All Pending Notifications</Text>
            </TouchableOpacity>

            {/* Info Text */}
            <View className="bg-gray-100 rounded-xl p-4">
              <Text className="text-gray-600 text-xs text-center">
                Notifications help you stay on top of your waste collection assignments. 
                You can customize your preferences here at any time.
              </Text>
            </View>
          </ScrollView>

          {/* Close Button */}
          <View className="bg-white px-6 py-4 border-t border-gray-200">
            <TouchableOpacity
              onPress={() => setShowNotificationSettings(false)}
              className="bg-blue-600 py-4 rounded-xl shadow-lg"
            >
              <Text className="text-white text-center font-semibold text-lg">
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
