// app/index.tsx
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function Index() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-white p-4">
      <Text className="text-2xl font-bold text-custom-blue mb-8">Welcome</Text>

      <TouchableOpacity
        onPress={() => router.push("/auth/signup")}
        className="bg-blue-500 w-full p-3 rounded mb-4"
      >
        <Text className="text-white text-center text-lg">Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/auth/login")}
        className="bg-green-500 w-full p-3 rounded"
      >
        <Text className="text-white text-center text-lg">Login</Text>
      </TouchableOpacity>
    </View>
  );
}
