import { Text, View } from "react-native";
import { useAuth } from "../../../contexts/AuthContext";

export default function VolHome() {
  const { profile } = useAuth();
  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <Text className="text-2xl font-bold text-custom-blue">This is volunteer home page</Text>
      {profile && (
        <Text className="mt-2">
          Logged in as: {profile.email} ({profile.role}{profile.isTeam ? " • team" : ""})
        </Text>
      )}
    </View>
  );
}