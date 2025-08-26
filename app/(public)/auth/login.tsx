import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "../../../services/firebaseConfig";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      // 1. Sign in
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

      // 2. Get user profile with role
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (!snap.exists()) {
        setError("User profile not found.");
        return;
      }

      const data = snap.data();
      const role = data?.role || "volunteer";

      // 3. Redirect based on role
      if (role === "sponsor") {
       router.push("/sponsor/(tabs)/sponsorDashboard")

      } else {
        router.replace("/(app)/(tabs)");
      }
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
