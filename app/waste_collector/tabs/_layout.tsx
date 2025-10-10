import { Redirect, Tabs } from "expo-router";
import { BarChart3, ClipboardList, Home, Navigation, User } from "lucide-react-native";
import { useAuth } from "../../../contexts/AuthContext";

export default function WasteCollectorTabsLayout() {
  const { user, loading, profile } = useAuth();

  if (loading) return null;
  // if not logged in → go to public login
  if (!user) return <Redirect href="/(public)/auth/login" />;
  // if not waste collector → go to general tabs layout
  if (profile?.role !== "wasteCollector") return <Redirect href="/(app)/(tabs)" />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen 
        name="wc_home" 
        options={{ 
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }} 
      />
      <Tabs.Screen 
        name="wc_assignment" 
        options={{ 
          title: "Assignments",
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />
        }} 
      />
      <Tabs.Screen 
        name="wc_route_navigation" 
        options={{ 
          title: "Navigation",
          tabBarIcon: ({ color, size }) => <Navigation color={color} size={size} />
        }} 
      />
      <Tabs.Screen 
        name="wc_analytics" 
        options={{ 
          title: "Analytics",
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />
        }} 
      />
      <Tabs.Screen 
        name="wc_profile" 
        options={{ 
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />
        }} 
      />
    </Tabs>
  );
}















