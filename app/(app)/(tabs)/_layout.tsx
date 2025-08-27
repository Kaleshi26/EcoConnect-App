import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../../contexts/AuthContext";

export default function TabsLayout() {
  const { user, loading, profile } = useAuth();

  if (loading) return null;
  // if not logged in → go to public login
  if (!user) return <Redirect href="/(public)/auth/login" />;

  // Redirect to volunteer-specific default tab if role is volunteer
  if (profile?.role === "volunteer") return <Redirect href="/volunteer/tabs/vol_home" />;
  // Redirect to waste collector-specific default tab if role is wasteCollector
  if (profile?.role === "wasteCollector") return <Redirect href="/waste_collector/tabs/wc_home" />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}