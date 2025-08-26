import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "../../../services/firebaseConfig";

const ROLES = ["volunteer", "organizer", "sponsor", "wasteCollector", "researcher"] as const;
type Role = typeof ROLES[number];

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("volunteer");
  const [isTeam, setIsTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignup = async () => {
    try {
      // 1. Create auth account
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;

      // 2. Save user profile in Firestore
      await setDoc(doc(db, "users", uid), {
        email: email.trim(),
        role,
        isTeam: role === "volunteer" ? isTeam : false,
        teamName: role === "volunteer" && isTeam ? teamName.trim() : "",
        createdAt: serverTimestamp(),
      });

      // 3. Redirect by role
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
      <Text className="text-2xl font-bold mb-6 text-custom-blue">Sign Up</Text>
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

      {/* Role Selection */}
      <View className="w-full flex-row flex-wrap mb-4">
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRole(r)}
            className={`px-3 py-2 mr-2 mb-2 border rounded-xl ${role === r ? "bg-custom-blue" : "bg-white"}`}
          >
            <Text className={role === r ? "text-white" : "text-black"}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Volunteer Extra Input */}
      {role === "volunteer" && (
        <View className="w-full mb-4">
          <View className="flex-row mb-3">
            <TouchableOpacity
              onPress={() => setIsTeam(false)}
              className={`px-3 py-2 mr-2 border rounded-xl ${!isTeam ? "bg-custom-green" : "bg-white"}`}
            >
              <Text className={!isTeam ? "text-white" : "text-black"}>Individual</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsTeam(true)}
              className={`px-3 py-2 border rounded-xl ${isTeam ? "bg-custom-green" : "bg-white"}`}
            >
              <Text className={isTeam ? "text-white" : "text-black"}>Team</Text>
            </TouchableOpacity>
          </View>

          {isTeam && (
            <TextInput
              className="w-full border border-gray-300 rounded-lg p-3 bg-white"
              placeholder="Team / Community Name"
              value={teamName}
              onChangeText={setTeamName}
            />
          )}
        </View>
      )}

      <TouchableOpacity onPress={handleSignup} className="bg-custom-green w-full py-3 rounded-xl">
        <Text className="text-white text-center font-semibold">Create Account</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/auth/login")} className="mt-4">
        <Text className="text-custom-blue text-center">Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}
