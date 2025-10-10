// app/eventorganizer/tabs/org_profile.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { auth, db } from "../../../services/firebaseConfig";

// Types from your new UI
type EventDoc = {
  id: string;
  title: string;
  eventAt?: any;
  status: string;
  volunteersNeeded?: number;
  actualParticipants?: number;
  collectedWastes?: { type: string; weight: number }[];
};

type ProfileStats = {
  totalEvents: number;
  completedEvents: number;
  totalParticipants: number;
  totalWasteCollected: number;
  upcomingEvents: number;
};

export default function OrgProfile() {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  // States and data logic from your new UI
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  // --- THIS IS YOUR ORIGINAL, WORKING LOGOUT LOGIC ---
  // --- IT WILL NOT BE CHANGED ---
  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/(public)/auth/login");
  };

  const stats: ProfileStats = useMemo(() => {
    const completedEvents = events.filter(e => e.status === "completed");
    const upcomingEvents = events.filter(e => e.status === "open");
    const totalParticipants = completedEvents.reduce((sum, event) => sum + (event.actualParticipants || 0), 0);
    const totalWasteCollected = completedEvents.reduce((sum, event) => sum + (event.collectedWastes?.reduce((wasteSum, waste) => wasteSum + waste.weight, 0) || 0), 0);
    return {
      totalEvents: events.length,
      completedEvents: completedEvents.length,
      totalParticipants,
      totalWasteCollected,
      upcomingEvents: upcomingEvents.length
    };
  }, [events]);

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };
    setLoading(true);
    const q = query(collection(db, "events"), where("organizerId", "==", user.uid), orderBy("eventAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const allEvents: EventDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setEvents(allEvents);
      setLoading(false);
      setRefreshing(false);
    }, (err) => {
      console.error("[OrgProfile] snapshot error:", err);
      setLoading(false);
      setRefreshing(false);
    });
    return () => unsub();
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    // Let useEffect handle the refresh, but reset the spinner after a timeout
    setTimeout(() => setRefreshing(false), 1500);
  };

  // Helper UI components from your new version
  const StatCard = ({ title, value, subtitle, icon, color = "blue" }: { title: string; value: string | number; subtitle?: string; icon: string; color?: "blue" | "green" | "purple" | "orange"; }) => (
    <View className={`rounded-2xl p-4 bg-${color}-500 shadow-lg`}>
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="text-white/80 text-xs font-medium">{title}</Text>
          <Text className="text-white text-lg font-bold mt-1">{value}</Text>
          {subtitle && <Text className="text-white/70 text-xs mt-1">{subtitle}</Text>}
        </View>
        <View className="bg-white/20 p-2 rounded-xl">
          <Ionicons name={icon as any} size={20} color="white" />
        </View>
      </View>
    </View>
  );

  const MenuItem = ({ icon, title, subtitle, onPress, showArrow = true, rightElement }: { icon: string; title: string; subtitle?: string; onPress?: () => void; showArrow?: boolean; rightElement?: React.ReactNode; }) => (
    <Pressable onPress={onPress} className="flex-row items-center justify-between py-4 px-2 border-b border-gray-100 active:bg-gray-50">
      <View className="flex-row items-center flex-1">
        <View className="bg-blue-100 p-3 rounded-2xl mr-4">
          <Ionicons name={icon as any} size={20} color="#3b82f6" />
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 font-semibold text-base">{title}</Text>
          {subtitle && <Text className="text-gray-500 text-sm mt-1">{subtitle}</Text>}
        </View>
      </View>
      {rightElement || (showArrow && <Ionicons name="chevron-forward" size={20} color="#9ca3af" />)}
    </Pressable>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gradient-to-br from-blue-50 to-purple-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-600 mt-4 text-lg font-medium">Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <View className="px-6 pt-12 pb-8 bg-indigo-600 shadow-2xl">
        <View className="flex-row items-center">
          <View className="bg-white/20 p-4 rounded-3xl mr-4 border-2 border-white/30">
            <Ionicons name="person" size={32} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">{profile?.orgName || profile?.displayName || "Organizer"}</Text>
            <Text className="text-blue-100 font-medium mt-1">{user?.email}</Text>
            <Text className="text-blue-200 text-sm mt-1">Member since {new Date(user?.metadata.creationTime || Date.now()).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        

        <View className="px-6 space-y-6">
          <View className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
            <View className="p-4 border-b border-gray-100"><Text className="text-lg font-bold text-gray-900">Account Settings</Text></View>
            <MenuItem icon="person-outline" title="Edit Profile" subtitle="Update your organization details" onPress={() => Alert.alert("Edit Profile", "Profile editing feature coming soon!")} />
            <MenuItem icon="business-outline" title="Organization Info" subtitle={profile?.orgName || "Add organization name"} onPress={() => Alert.alert("Organization Info", "Organization management coming soon!")} />
            <MenuItem icon="shield-checkmark-outline" title="Privacy & Security" subtitle="Manage your account security" onPress={() => Alert.alert("Privacy & Security", "Security settings coming soon!")} />
          </View>

          <View className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
            <View className="p-4 border-b border-gray-100"><Text className="text-lg font-bold text-gray-900">Notifications</Text></View>
            <MenuItem icon="notifications-outline" title="Push Notifications" subtitle="Receive updates about your events" showArrow={false} rightElement={<Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: '#e5e7eb', true: '#a5b4fc' }} thumbColor={notifications ? '#4f46e5' : '#9ca3af'} />} />
            <MenuItem icon="mail-outline" title="Email Updates" subtitle="Get weekly impact reports" showArrow={false} rightElement={<Switch value={emailUpdates} onValueChange={setEmailUpdates} trackColor={{ false: '#e5e7eb', true: '#a5b4fc' }} thumbColor={emailUpdates ? '#4f46e5' : '#9ca3af'} />} />
          </View>
          
          <View className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
             <View className="p-4 border-b border-gray-100"><Text className="text-lg font-bold text-gray-900">Support & Resources</Text></View>
             <MenuItem icon="help-circle-outline" title="Help & Support" subtitle="Get help with the app" onPress={() => Alert.alert("Help & Support", "Support center coming soon!")} />
             <MenuItem icon="document-text-outline" title="Resources" subtitle="Event planning guides and tips" onPress={() => Alert.alert("Resources", "Resource library coming soon!")} />
             <MenuItem icon="star-outline" title="Rate Our App" subtitle="Share your feedback" onPress={() => Alert.alert("Rate App", "Thank you for your feedback!")} />
          </View>

          <View className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
            <View className="p-4 border-b border-gray-100"><Text className="text-lg font-bold text-gray-900">About</Text></View>
            <MenuItem icon="information-circle-outline" title="About EcoConnect" subtitle="Learn more about our mission" onPress={() => Alert.alert("About EcoConnect", "Making the world cleaner, one event at a time! 🌍")} />
            <MenuItem icon="document-outline" title="Terms of Service" onPress={() => Alert.alert("Terms of Service", "Terms and conditions content")} />
            <MenuItem icon="lock-closed-outline" title="Privacy Policy" onPress={() => Alert.alert("Privacy Policy", "Privacy policy content")} />
            <Text className="text-gray-500 text-xs text-center p-4">EcoConnect v1.0.0 • Making the world cleaner 🌊</Text>
          </View>

          <Pressable onPress={handleLogout} className="bg-red-500 rounded-2xl py-4 items-center shadow-xl active:opacity-80">
            <View className="flex-row items-center">
              <Ionicons name="log-out-outline" size={20} color="white" />
              <Text className="text-white font-bold text-lg ml-2">Logout</Text>
            </View>
          </Pressable>

          <View className="bg-green-600 rounded-3xl p-6 shadow-xl">
            <Text className="text-white text-lg font-bold text-center mb-2">🌍 Making a Difference</Text>
            <Text className="text-white/90 text-center text-sm">You've organized {stats.totalEvents} events and helped remove {stats.totalWasteCollected} kg of waste from our environment. Thank you for your dedication to a cleaner planet! 🌟</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}