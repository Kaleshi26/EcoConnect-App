// app/eventorganizer/tabs/_layout.tsx
import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../../contexts/AuthContext";

export default function OrgTabsLayout() {
  const { user, loading, profile } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/(public)/auth/login" />;
  if (profile?.role !== "eventorganizer") return <Redirect href="/(app)/(tabs)" />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="org_events" options={{ title: "Events" }} />
      <Tabs.Screen name="org_notifications" options={{ title: "Notifications" }} />
      <Tabs.Screen name="org_analytics" options={{ title: "Analytics" }} />
      <Tabs.Screen name="org_profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
