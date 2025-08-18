import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../../contexts/AuthContext";

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  // if not logged in → go to public login
  if (!user) return <Redirect href="/(public)/auth/login" />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
