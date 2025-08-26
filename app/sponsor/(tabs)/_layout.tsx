import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../../contexts/AuthContext";

export default function SponsorTabsLayout() {
  const { user, profile, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Redirect href="/(public)/auth/login" />;

  // Only allow sponsors to enter this layout
  if (profile?.role !== "sponsor") {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="sponsorDashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="sponsorEvents" options={{ title: "Events" }} />
      <Tabs.Screen name="sponsorReports" options={{ title: "Reports" }} />
      <Tabs.Screen name="sponsorProfile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
