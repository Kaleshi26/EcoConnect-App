// app/sponsor/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../../contexts/AuthContext";
import { CurrencyProvider } from "../../../contexts/CurrencyContext";
import { NotificationProvider } from '../../../contexts/NotificationContext';

export default function SponsorTabsLayout() {
  const { user, loading, profile } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/(public)/auth/login" />;

  // Only allow sponsors here
  if (profile?.role !== "sponsor") {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <CurrencyProvider> 
      <NotificationProvider> 
        <Tabs screenOptions={{ 
          headerShown: false,
          tabBarActiveTintColor: "#FFFFFF", // White for active items
          tabBarInactiveTintColor: "#E5E5E5", // Light gray for inactive
          tabBarStyle: { 
            backgroundColor: "#14B8A6", // Same teal as your header
            borderTopWidth: 1          },
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
              title: "Impact",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="trending-up-outline" size={size} color={color} />
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
          <Tabs.Screen 
            name="settings" 
            options={{ title: "Settings", href: null }} 
          />
        </Tabs>
      </NotificationProvider>
    </CurrencyProvider>
  );
}