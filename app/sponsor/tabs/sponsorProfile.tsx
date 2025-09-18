import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { auth } from "../../../services/firebaseConfig";

export default function SponsorProfileSummary() {
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
        {profile ? (
          <>
            <Text className="text-xl font-semibold mb-2">Sponsor Profile</Text>
            <Text className="mb-1">Company: {(profile as any)?.companyName}</Text>
            <Text className="mb-1">Contact: {(profile as any)?.contactPerson}</Text>
            <Text className="mb-1">Email: {(profile as any)?.email}</Text>
            <Text className="mb-1">Phone: {(profile as any)?.phone}</Text>
            <Text className="mb-2">Description: {(profile as any)?.description}</Text>

            <Text>- Receive event updates</Text>
            <Text>- Track sponsorship impact</Text>
            <Text>- Access reports & certificates</Text>
          </>
        ) : (
          <Text>No profile found. Please contact admin.</Text>
        )}
      </View>

      <TouchableOpacity
        onPress={handleLogout}
        className="bg-custom-red w-full py-3 rounded-xl"
      >
        <Text className="text-white text-center font-semibold">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
