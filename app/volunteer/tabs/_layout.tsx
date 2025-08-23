import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../../contexts/AuthContext";

export default function VolTabsLayout() {
  const { user, loading, profile } = useAuth();

  if (loading) return null;
  // if not logged in → go to public login
  if (!user) return <Redirect href="/(public)/auth/login" />;
  // if not volunteer → go to general tabs layout
  if (profile?.role !== "volunteer") return <Redirect href="/(app)/(tabs)" />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="vol_home" options={{ title: "Home" }} />
      <Tabs.Screen name="vol_event" options={{ title: "Event" }} />
      <Tabs.Screen name="vol_notification" options={{ title: "Notification" }} />
      <Tabs.Screen name="vol_profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}