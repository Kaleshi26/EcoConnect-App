import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function Landing() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-3xl font-bold text-custom-blue mb-6">
        EcoConnect 🌱
      </Text>

      <TouchableOpacity
        className="bg-custom-blue px-6 py-3 rounded-2xl mb-3"
        onPress={() => router.push("/auth/login")}
      >
        <Text className="text-white text-lg font-semibold">Login</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="border border-custom-blue px-6 py-3 rounded-2xl"
        onPress={() => router.push("/auth/signup")}
      >
        <Text className="text-custom-blue text-lg font-semibold">Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}
