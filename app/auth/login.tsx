import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth } from "../../services/firebaseConfig";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);

      // ✅ Fixed route
      router.replace("/(tabs)/profile");
    } catch (error: any) {
      Alert.alert("Login Error", error.message);
      console.error(error);
    }
  };

  return (
    <View className="flex-1 justify-center items-center p-4 bg-white">
      <Text className="text-2xl font-bold mb-6">Login</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        className="border w-full p-3 rounded mb-3"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="border w-full p-3 rounded mb-3"
      />

      <TouchableOpacity
        onPress={handleLogin}
        className="bg-green-500 w-full p-3 rounded"
      >
        <Text className="text-white text-center">Login</Text>
      </TouchableOpacity>
    </View>
  );
}
