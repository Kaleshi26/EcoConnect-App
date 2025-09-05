import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from "expo-router";
import { Text, View } from 'react-native';
import { useAuth } from "../../../contexts/AuthContext";

export default function WasteCollectorTabsLayout() {
  const { user, loading, profile } = useAuth();

  if (loading) return <Text>Loading...</Text>; // Show loading indicator until data is ready
  if (!user) return <Redirect href="/(public)/auth/login" />;
  if (profile?.role !== "wasteCollector") return <Redirect href="/(app)/(tabs)" />;

  // Example notificationsCount
  const notificationsCount = 5;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen 
        name="wc_home" 
        options={{
          title: "Home", 
          tabBarIcon: ({ focused }) => (
            <View className="relative">
              <MaterialCommunityIcons 
                name="home" 
                size={24} 
                color={focused ? 'blue' : 'black'} 
              />
              {notificationsCount > 0 && (
                <View className="absolute top-[-5px] right-[-10px] bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">
                  <Text className="text-white text-xs">{notificationsCount}</Text>
                </View>
              )}
            </View>
          ),
        }} 
      />
    </Tabs>
  );
}
