import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../../contexts/AuthContext";

export default function SponsorTabsLayout() {
  const { user, loading, profile } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/(public)/auth/login" />;

  // Only allow sponsors here
  if (profile?.role !== "sponsor") {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarActiveTintColor: "#4FB7B3",
      tabBarInactiveTintColor: "#666",
      tabBarStyle: { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb" },
    }}>
      <Tabs.Screen 
        name="sponsorDashboard" 
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="sponsorEvents" 
        options={{
          title: "Events",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="sponsorReports" 
        options={{
          title: "Reports",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="sponsorProfile" 
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="EventDetails" 
        options={{ title: "Event Details", href: null }} 
      />
      <Tabs.Screen 
        name="SponsorForm" 
        options={{ title: "Sponsor Form", href: null }} 
      />
      <Tabs.Screen 
        name="SponsorConfirmation" 
        options={{ title: "Confirmation", href: null }} 
      />
    </Tabs>
  );
}