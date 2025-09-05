import { Redirect, Tabs } from "expo-router";
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
      <Tabs.Screen name="wc_home" options={{ title: "Home" }} />
      <Tabs.Screen name="wc_route_navigation" options={{ title: "Route Navigation" }} />
      <Tabs.Screen name="wc_analytics" options={{ title: "Analytics" }} />
      <Tabs.Screen name="wc_profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}















