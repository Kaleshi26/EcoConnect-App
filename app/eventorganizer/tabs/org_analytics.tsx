// app/eventorganizer/tabs/org_analytics.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, View } from "react-native";

export default function OrgAnalytics() {
  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      {/* Header */}
      <View className="items-center mb-6 mt-6">
        <Ionicons name="bar-chart-outline" size={32} color="#2563eb" />
        <Text className="text-2xl font-bold text-gray-900 mt-2">Analytics</Text>
        <Text className="text-gray-500 text-center mt-1">
          Impact and participation statistics
        </Text>
      </View>

      {/* Section 1: Event Summary */}
      <View className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Event Summary
        </Text>
        <Text className="text-gray-700">• Total Events Organized: 12</Text>
        <Text className="text-gray-700">• Active Volunteers: 320</Text>
        <Text className="text-gray-700">• Sponsors Engaged: 5</Text>
      </View>

      {/* Section 2: Waste Collected */}
      <View className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Waste Collected
        </Text>
        <Text className="text-gray-700">• Plastic Bottles: 4,200</Text>
        <Text className="text-gray-700">• Plastic Bags: 1,900</Text>
        <Text className="text-gray-700">• Fishing Gear: 650</Text>
        <Text className="text-gray-700">• Glass & Cans: 1,100</Text>
        <Text className="text-gray-700">• Other: 700</Text>
      </View>

      {/* Section 3: Impact */}
      <View className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Impact Overview
        </Text>
        <Text className="text-gray-700">• Total Waste Removed: 8.5 tons</Text>
        <Text className="text-gray-700">• Beaches Covered: 6</Text>
        <Text className="text-gray-700">• Average Volunteers per Event: 27</Text>
      </View>

      {/* Section 4: Engagement */}
      <View className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Volunteer Engagement
        </Text>
        <Text className="text-gray-700">• Returning Volunteers: 65%</Text>
        <Text className="text-gray-700">• New Sign-ups Last Month: 45</Text>
        <Text className="text-gray-700">• Top Contributing Team: Ocean Savers</Text>
      </View>

      {/* Footer */}
      <View className="items-center mt-8">
        <Text className="text-gray-400 text-sm">
          Updated in real-time after each event
        </Text>
      </View>
    </ScrollView>
  );
}
