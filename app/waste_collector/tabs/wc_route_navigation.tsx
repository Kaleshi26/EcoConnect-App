import React from 'react';
import { ScrollView, Text, View } from 'react-native';

const RouteNavigation = () => {
  return (
    <ScrollView className="flex-1 bg-gray-100 p-5">
      {/* Header Section */}
      <View className="mb-6 text-center">
        <Text className="text-3xl font-bold text-blue-600">Route Navigation</Text>
      </View>

      {/* Route Info Section */}
      <View className="bg-white p-6 mb-6 rounded-lg shadow-md">
        <Text className="text-xl font-semibold text-gray-800 mb-4">Navigation Details</Text>
        <Text className="text-lg text-gray-600 mb-2">
          Maps and navigation will be displayed here.
        </Text>
        <Text className="text-lg text-gray-600">
          Future updates will include interactive maps powered by Google Maps API or other similar services.
        </Text>
      </View>

      {/* Placeholder for Map */}
      <View className="bg-gray-300 p-6 rounded-lg mb-6">
        <Text className="text-center text-gray-700 text-lg">Map will appear here (Google Maps or other service).</Text>
      </View>
    </ScrollView>
  );
};

export default RouteNavigation;
