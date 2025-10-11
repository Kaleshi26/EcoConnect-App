import CurrencySelector from '@/components/CurrencySelector';
import NotificationSettings from '@/components/NotificationSettings';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SponsorSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/sponsor/tabs/sponsorProfile');
    }
  };

  const SettingsSection = ({ title, icon, children }: any) => (
    <View className="bg-white rounded-2xl p-6 mb-4 shadow-sm border border-gray-200">
      <View className="flex-row items-center mb-4">
        <Ionicons name={icon} size={24} color="#14B8A6" />
        <Text className="text-xl font-bold text-teal-700 ml-3">{title}</Text>
      </View>
      {children}
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View 
        className="bg-teal-500 pt-4 px-4 border-b border-gray-200"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </Pressable>
          
          <Text className="text-lg font-semibold text-white">Settings</Text>
          
          <View className="w-10" />
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ 
          padding: 16,
          paddingBottom: 40
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification Settings */}
        <SettingsSection title="Notifications" icon="notifications">
          <NotificationSettings />
        </SettingsSection>

        {/* Currency Preferences */}
        <SettingsSection title="Currency Preferences" icon="cash">
          <CurrencySelector />
        </SettingsSection>

        {/* More sections can be added later */}
        <View className="bg-white rounded-2xl p-6 mb-4 shadow-sm border border-gray-200">
          <View className="flex-row items-center mb-4">
            <Ionicons name="construct" size={24} color="#14B8A6" />
            <Text className="text-xl font-bold text-teal-700 ml-3">More Settings Coming Soon</Text>
          </View>
          <Text className="text-gray-600">
            Language, theme, and security settings will be added in future updates.
          </Text>
        </View>

        {/* Support Section */}
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <View className="flex-row items-center mb-4">
            <Ionicons name="help-circle" size={24} color="#14B8A6" />
            <Text className="text-xl font-bold text-teal-700 ml-3">Support</Text>
          </View>
          
          <View className="space-y-3">
            <Pressable className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="help-buoy" size={20} color="#6B7280" />
                <Text className="text-gray-700 ml-3">Help Center</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>

            <Pressable className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="mail" size={20} color="#6B7280" />
                <Text className="text-gray-700 ml-3">Contact Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>

            <Pressable className="flex-row items-center justify-between py-3">
              <View className="flex-row items-center">
                <Ionicons name="document-text" size={20} color="#6B7280" />
                <Text className="text-gray-700 ml-3">Terms & Privacy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}