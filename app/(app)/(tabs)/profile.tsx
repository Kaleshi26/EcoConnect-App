import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../../contexts/AuthContext";

function VolunteerView({ isTeam }: { isTeam?: boolean }) {
  return (
    <View className="mt-4">
      <Text className="text-lg font-semibold">Volunteer Profile</Text>
      <Text className="mt-1">Type: {isTeam ? "Team" : "Individual"}</Text>
      {/* add volunteer-specific UI here */}
    </View>
  );
}

function OrganizerView() {
  return (
    <View className="mt-4">
      <Text className="text-lg font-semibold">Organizer Profile</Text>
      {/* organizer-specific UI */}
    </View>
  );
}

function SponsorView() {
  return (
    <View className="mt-4">
      <Text className="text-lg font-semibold">Sponsor Profile</Text>
      {/* sponsor-specific UI */}
    </View>
  );
}

function WasteCollectorView() {
  return (
    <View className="mt-4">
      <Text className="text-lg font-semibold">Waste Collector Profile</Text>
      {/* waste collector-specific UI */}
    </View>
  );
}

function ResearcherView() {
  return (
    <View className="mt-4">
      <Text className="text-lg font-semibold">Researcher Profile</Text>
      {/* research-specific UI */}
    </View>
  );
}

export default function ProfileTab() {
  const { user, profile, logout } = useAuth();

  return (
    <View className="flex-1 bg-white p-6">
      <Text className="text-2xl font-bold text-custom-blue">My Profile</Text>

      {profile && (
        <>
          <Text className="mt-3">Email: {profile.email}</Text>
          <Text>Role: {profile.role}</Text>
          {profile.role === "volunteer" && <VolunteerView isTeam={profile.isTeam} />}
          {profile.role === "organizer" && <OrganizerView />}
          {profile.role === "sponsor" && <SponsorView />}
          {profile.role === "wasteCollector" && <WasteCollectorView />}
          {profile.role === "researcher" && <ResearcherView />}
        </>
      )}

      <TouchableOpacity
        className="mt-8 bg-red-500 px-4 py-3 rounded"
        onPress={logout}
      >
        <Text className="text-white text-center font-semibold">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
