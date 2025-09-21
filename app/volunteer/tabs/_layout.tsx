import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

export default function VolTabsLayout() {
  const { user, loading, profile } = useAuth();

  if (loading) return null;
  // if not logged in → go to public login
  if (!user) return <Redirect href="/(public)/auth/login" />;
  // if not volunteer → go to general tabs layout
  if (profile?.role !== "volunteer") return <Redirect href="/(app)/(tabs)" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3b82f6", // Blue color to match your app's theme
        tabBarInactiveTintColor: "#64748b", // Slate color for inactive tabs
        tabBarStyle: {
          backgroundColor: "#ffffff", // White background for tab bar
          borderTopColor: "#e2e8f0", // Light border for tab bar
          borderTopWidth: 1,
          height: 60, // Adjust height for better appearance
          paddingBottom: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="vol_home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vol_event"
        options={{
          title: "Event",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vol_notification"
        options={{
          title: "Notification",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "notifications" : "notifications-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vol_profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}