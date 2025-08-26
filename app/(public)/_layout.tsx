// app/(public)/_layout.tsx
import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";

export default function PublicLayout() {
  const { user, profile, loading } = useAuth();

  if (loading) return null;

  if (user && profile) {
    if (profile.role === "sponsor") return <Redirect href="/sponsor/(tabs)/sponsorDashboard" />;
    return <Redirect href="/(app)/(tabs)" />; // volunteers default
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
