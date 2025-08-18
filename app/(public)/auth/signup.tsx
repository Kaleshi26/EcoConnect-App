import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "../../../services/firebaseConfig";

const ROLES = ["volunteer", "organizer", "sponsor", "wasteCollector", "researcher"] as const;
type Role = typeof ROLES[number];

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("volunteer");
  const [isTeam, setIsTeam] = useState(false);

  const handleSignup = async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;

      await setDoc(doc(db, "users", uid), {
        email: email.trim(),
        role,
        isTeam: role === "volunteer" ? isTeam : false,
        createdAt: serverTimestamp(),
      });

      // go to app tabs (profile tab available at /profile)
      router.replace("/profile" as const);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Signup Error", e.message ?? "Something went wrong");
    }
  };

  return (
    <View className="flex-1 justify-center p-6 bg-white">
      <Text className="text-2xl font-bold mb-6 text-center">Create Account</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        className="border w-full p-3 rounded mb-3"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        className="border w-full p-3 rounded mb-4"
        secureTextEntry
      />

      <Text className="mb-2 font-semibold">Choose Role</Text>
      <View className="flex-row flex-wrap mb-4">
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRole(r)}
            className={`px-3 py-2 mr-2 mb-2 border rounded ${role === r ? "bg-blue-500" : "bg-white"}`}
          >
            <Text className={role === r ? "text-white" : "text-black"}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {role === "volunteer" && (
        <>
          <Text className="mb-2 font-semibold">Volunteer Type</Text>
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
        </>
      )}

      <TouchableOpacity onPress={handleSignup} className="bg-blue-500 w-full p-3 rounded">
        <Text className="text-white text-center font-semibold">Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}
