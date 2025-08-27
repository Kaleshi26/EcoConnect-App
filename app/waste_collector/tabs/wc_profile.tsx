import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { auth } from "../../../services/firebaseConfig";

function WasteCollectorProfile({ assignedTasks }: { assignedTasks?: string[] }) {
  return (
    <View className="w-full">
      <Text className="text-xl font-semibold text-primary mb-2">Waste Collector Profile</Text>
      <Text className="text-lg mb-2 text-secondary">Assigned Tasks:</Text>
      {assignedTasks && assignedTasks.length > 0 ? (
        <View className="space-y-2">
          {assignedTasks.map((task, index) => (
            <Text key={index} className="text-base text-gray-700">- {task}</Text>
          ))}
        </View>
      ) : (
        <Text className="text-base text-gray-700">No tasks assigned yet.</Text>
      )}
    </View>
  );
}

export default function WasteCollectorProfileScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/(public)/auth/login");
  };

  return (
    <ScrollView style={styles.container}>
      <View className="items-center mb-8">
        <Text className="text-3xl font-bold text-custom-blue">Waste Collector Profile</Text>
        <Text className="text-lg mt-2 text-custom-gray">{user?.email}</Text>
      </View>

      {/* Displaying Waste Collector Profile Information */}
      <View className="w-full mb-8">
        {profile ? (
          <WasteCollectorProfile assignedTasks={(profile as any).assignedTasks} />
        ) : (
          <Text className="text-base text-gray-700">No profile found. Please contact admin.</Text>
        )}
      </View>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text className="text-white text-center font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa", // light background
  },
  logoutContainer: {
    marginTop: 20,
    width: '100%',
  },
  logoutButton: {
    backgroundColor: "#f44336", // Red color for logout button
    paddingVertical: 12,
    borderRadius: 8,
  },
});
