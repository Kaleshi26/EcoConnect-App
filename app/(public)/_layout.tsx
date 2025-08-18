import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";

export default function PublicLayout() {
  const { user, loading } = useAuth();

  if (loading) return null; // splash/loader if you want
  if (user) return <Redirect href="/profile" />; // already logged in → go to app

  return <Stack screenOptions={{ headerShown: false }} />;
}
