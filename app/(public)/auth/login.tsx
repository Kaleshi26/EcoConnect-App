import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth } from "../../../services/firebaseConfig";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/(app)/(tabs)");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-light-100 px-6">
      <Text className="text-2xl font-bold mb-6 text-custom-blue">Login</Text>
      {error ? <Text className="text-red-500 mb-4">{error}</Text> : null}
      <TextInput
        className="w-full border border-gray-300 rounded-lg p-3 mb-4 bg-white"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="w-full border border-gray-300 rounded-lg p-3 mb-4 bg-white"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity
        onPress={handleLogin}
        className="bg-custom-blue w-full py-3 rounded-xl"
      >
        <Text className="text-white text-center font-semibold">Login</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/auth/signup")} className="mt-4">
        <Text className="text-custom-blue">Don’t have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}
