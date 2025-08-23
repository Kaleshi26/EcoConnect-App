import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { auth } from "../../../services/firebaseConfig";

function VolVolunteerProfile({ isTeam, teamName }: { isTeam?: boolean; teamName?: string }) {
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

export default function VolProfile() {
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
        {profile && (
          <VolVolunteerProfile isTeam={profile?.isTeam} teamName={(profile as any)?.teamName} />
        )}
        {!profile && <Text>No profile found. Please contact admin.</Text>}
      </View>

      <TouchableOpacity onPress={handleLogout} className="bg-custom-red w-full py-3 rounded-xl">
        <Text className="text-white text-center font-semibold">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}