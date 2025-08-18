import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function Landing() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <Text className="text-3xl font-bold mb-8 text-custom-blue">EcoConnect 🌱</Text>

      <TouchableOpacity
        onPress={() => router.push("/auth/login")}
        className="bg-custom-blue px-6 py-3 rounded-2xl mb-3 w-full"
      >
        <Text className="text-white text-center text-lg font-semibold">Login</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/auth/signup")}
        className="border border-custom-blue px-6 py-3 rounded-2xl w-full"
      >
        <Text className="text-custom-blue text-center text-lg font-semibold">Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}
