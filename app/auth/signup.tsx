// app/auth/signup.tsx
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "../../services/firebaseConfig";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("volunteer"); // default role
  const [isTeam, setIsTeam] = useState(false); // for volunteers
  const router = useRouter();

  const handleSignup = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email,
        role,
        isTeam: role === "volunteer" ? isTeam : false,
        createdAt: new Date(),
      });

      router.replace("/tabs/profile"); // ✅ TypeScript safe
    } catch (error: any) {
      Alert.alert("Signup Error", error.message);
      console.error(error);
    }
  };

  return (
    <View className="flex-1 justify-center items-center p-4 bg-white">
      <Text className="text-2xl font-bold mb-6">Sign Up</Text>

      {/* Email & Password */}
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

      {/* Role Selection */}
      <View className="flex-row mb-4 flex-wrap">
        {["volunteer", "organizer", "sponsor", "wasteCollector"].map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRole(r)}
            className={`px-3 py-2 mr-2 mb-2 border rounded ${
              role === r ? "bg-blue-500" : "bg-white"
            }`}
          >
            <Text className={`${role === r ? "text-white" : "text-black"}`}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Individual / Team choice only for volunteers */}
      {role === "volunteer" && (
        <View className="flex-row mb-4">
          <TouchableOpacity
            onPress={() => setIsTeam(false)}
            className={`px-3 py-2 mr-2 border rounded ${!isTeam ? "bg-green-500" : "bg-white"}`}
          >
            <Text className={!isTeam ? "text-white" : "text-black"}>Individual</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsTeam(true)}
            className={`px-3 py-2 border rounded ${isTeam ? "bg-green-500" : "bg-white"}`}
          >
            <Text className={isTeam ? "text-white" : "text-black"}>Team</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Signup Button */}
      <TouchableOpacity
        onPress={handleSignup}
        className="bg-blue-500 w-full p-3 rounded"
      >
        <Text className="text-white text-center">Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}
