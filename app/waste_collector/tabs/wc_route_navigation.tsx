import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const RouteNavigation = () => {
  const params = useLocalSearchParams();
  const destLabel = typeof params.destLabel === 'string' ? decodeURIComponent(params.destLabel) : '';
  const eventId = typeof params.eventId === 'string' ? params.eventId : '';
  const lat = typeof params.destLat === 'string' ? Number(params.destLat) : undefined;
  const lng = typeof params.destLng === 'string' ? Number(params.destLng) : undefined;

  const mapsUrl = useMemo(() => {
    if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    if (destLabel) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destLabel)}`;
    }
    return undefined;
  }, [lat, lng, destLabel]);
  return (
    <ScrollView className="flex-1 bg-gray-100 p-5">
      {/* Header Section */}
      <View className="mb-6 text-center">
        <Text className="text-3xl font-bold text-blue-600">Route Navigation</Text>
      </View>

      {/* Route Info Section */}
      <View className="bg-white p-6 mb-6 rounded-lg shadow-md">
        <Text className="text-xl font-semibold text-gray-800 mb-4">Navigation Details</Text>
        <Text className="text-lg text-gray-600 mb-2">Destination: {destLabel || '—'}</Text>
        <Text className="text-lg text-gray-600 mb-2">Event ID: {eventId || '—'}</Text>
        <Text className="text-lg text-gray-600">Maps and navigation will be displayed here.</Text>
        {!!mapsUrl && (
          <TouchableOpacity onPress={() => Linking.openURL(mapsUrl)} className="mt-4 bg-blue-600 rounded-lg px-4 py-2">
            <Text className="text-white text-center font-medium">Open in Google Maps</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Placeholder for Map */}
      <View className="bg-gray-300 p-6 rounded-lg mb-6">
        <Text className="text-center text-gray-700 text-lg">Map will appear here (Google Maps or other service).</Text>
      </View>
    </ScrollView>
  );
};

export default RouteNavigation;
