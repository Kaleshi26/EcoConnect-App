import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { auth } from "../../services/firebaseConfig";

export default function Profile() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // 🔹 Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
      } else {
        setUserEmail(null);
        router.replace("/auth/login"); // if logged out, go back to login
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔹 Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Logout error:", error.message);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-white p-4">
      <Text className="text-2xl font-bold mb-6">Profile</Text>

      {userEmail && (
        <Text className="text-lg mb-4">Welcome, {userEmail}</Text>
      )}

      <TouchableOpacity
        onPress={handleLogout}
        className="bg-red-500 w-full p-3 rounded"
      >
        <Text className="text-white text-center">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
