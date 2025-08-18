import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { auth } from "../../../services/firebaseConfig";

function VolunteerProfile({ isTeam, teamName }: { isTeam?: boolean; teamName?: string }) {
  return (
    <View className="w-full">
      <Text className="text-xl font-semibold mb-2">Volunteer Profile</Text>
      <Text className="mb-2">Mode: {isTeam ? "Team/Community" : "Individual"}</Text>
      {isTeam && teamName ? <Text className="mb-2">Team: {teamName}</Text> : null}
      <Text>- Browse & join clean-ups</Text>
      <Text>- Track your impact & badges</Text>
    </View>
  );
}

function OrganizerProfile() {
  return (
    <View className="w-full">
      <Text className="text-xl font-semibold mb-2">Organizer Profile</Text>
      <Text>- Create & manage events</Text>
      <Text>- Publish QR codes, track attendance</Text>
    </View>
  );
}

function SponsorProfile() {
  return (
    <View className="w-full">
      <Text className="text-xl font-semibold mb-2">Sponsor Profile</Text>
      <Text>- Browse events to support</Text>
      <Text>- See impact reports & recognition</Text>
    </View>
  );
}

function WasteCollectorProfile() {
  return (
    <View className="w-full">
      <Text className="text-xl font-semibold mb-2">Waste Collector Profile</Text>
      <Text>- See pickups needed & schedule</Text>
      <Text>- Confirm disposal with reports</Text>
    </View>
  );
}

function ResearcherProfile() {
  return (
    <View className="w-full">
      <Text className="text-xl font-semibold mb-2">Researcher Profile</Text>
      <Text>- Access anonymized event/waste datasets</Text>
      <Text>- Share insights with organizers</Text>
    </View>
  );
}

export default function Profile() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/(public)/auth/login");
  };

  return (
    <View className="flex-1 justify-center items-center bg-light-100 px-6">
      <Text className="text-2xl font-bold mb-4 text-custom-blue">Profile</Text>
      <Text className="text-lg mb-6">{user?.email}</Text>

      <View className="w-full mb-10">
        {profile?.role === "volunteer" && (
          <VolunteerProfile isTeam={profile?.isTeam} teamName={(profile as any)?.teamName} />
        )}
        {profile?.role === "organizer" && <OrganizerProfile />}
        {profile?.role === "sponsor" && <SponsorProfile />}
        {profile?.role === "wasteCollector" && <WasteCollectorProfile />}
        {profile?.role === "researcher" && <ResearcherProfile />}

        {!profile?.role && <Text>No role found. Please contact admin.</Text>}
      </View>

      <TouchableOpacity onPress={handleLogout} className="bg-custom-red w-full py-3 rounded-xl">
        <Text className="text-white text-center font-semibold">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
