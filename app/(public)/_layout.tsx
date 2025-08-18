import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";

export default function PublicLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  // if already logged in → go into the app tabs
  if (user) return <Redirect href="/(app)/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
