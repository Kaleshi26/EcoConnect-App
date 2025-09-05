import React from 'react';
import { ScrollView, Text, View } from 'react-native';

const Analytics = () => {
  return (
    <ScrollView className="flex-1 bg-gray-100 p-5">
      {/* Header Section */}
      <View className="mb-6 text-center">
        <Text className="text-3xl font-bold text-blue-600">Analytics Dashboard</Text>
      </View>

      {/* Performance Overview Section */}
      <View className="bg-white p-6 mb-6 rounded-lg shadow-md">
        <Text className="text-xl font-semibold text-gray-800 mb-4">Performance Overview</Text>
        <Text className="text-lg text-gray-600">Key performance data and insights will be displayed here.</Text>
      </View>

      {/* Metrics Section */}
      <View className="bg-white p-6 mb-6 rounded-lg shadow-md">
        <Text className="text-xl font-semibold text-gray-800 mb-4">Metrics</Text>
        <Text className="text-lg text-gray-700">- Total Waste Collected: 1200kg</Text>
        <Text className="text-lg text-gray-700">- Active Volunteers: 45</Text>
        <Text className="text-lg text-gray-700">- Events Completed: 8</Text>
      </View>

      {/* Upcoming Features Section */}
      <View className="bg-white p-6 rounded-lg shadow-md">
        <Text className="text-xl font-semibold text-gray-800 mb-4">Upcoming Features</Text>
        <Text className="text-lg text-gray-600">Charts, graphs, and additional analytics will be integrated soon for better data visualization.</Text>
      </View>
    </ScrollView>
  );
};

export default Analytics;
