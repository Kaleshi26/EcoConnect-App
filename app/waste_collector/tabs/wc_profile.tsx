import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { auth, db } from "../../../services/firebaseConfig";

function WasteCollectorProfile({ assignedTasks }: { assignedTasks?: string[] }) {
  return (
    <View className="w-full mb-6">
      <Text className="text-xl font-semibold text-primary mb-2">
        Waste Collector Profile
      </Text>
      <Text className="text-lg mb-2 text-secondary">Assigned Tasks:</Text>
      {assignedTasks && assignedTasks.length > 0 ? (
        <View className="space-y-2">
          {assignedTasks.map((task, index) => (
            <Text key={index} className="text-base text-gray-700">
              - {task}
            </Text>
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

  // Editable profile fields
  const [name, setName] = useState((profile as any)?.name || "");
  const [phone, setPhone] = useState((profile as any)?.phone || "");
  const [skills, setSkills] = useState((profile as any)?.skills || "");

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/(public)/auth/login");
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, "waste_collectors", user.uid);
      await updateDoc(userRef, {
        name,
        phone,
        skills,
        updatedAt: new Date(),
      });
      Alert.alert("✅ Success", "Profile updated successfully!");
    } catch (error) {
      console.error(error);
      Alert.alert("❌ Error", "Failed to update profile.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View className="items-center mb-8">
        <Text className="text-3xl font-bold text-custom-blue">
          Waste Collector Profile
        </Text>
        <Text className="text-lg mt-2 text-custom-gray">{user?.email}</Text>
      </View>

      {/* Display Profile & Tasks */}
      <View className="w-full mb-8">
        {profile ? (
          <WasteCollectorProfile assignedTasks={(profile as any).assignedTasks} />
        ) : (
          <Text className="text-base text-gray-700">
            No profile found. Please contact admin.
          </Text>
        )}
      </View>

      {/* Editable Profile Fields */}
      <View className="mb-8">
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter full name"
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Skills</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={skills}
          onChangeText={setSkills}
          placeholder="E.g., Plastic sorting, eco-disposal"
          multiline
        />

        <TouchableOpacity
          onPress={handleUpdateProfile}
          style={styles.updateButton}
        >
          <Text className="text-white text-center font-semibold">
            Update Profile
          </Text>
        </TouchableOpacity>
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
    backgroundColor: "#f8f9fa",
  },
  label: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 5,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  updateButton: {
    backgroundColor: "#4CAF50", // green
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  logoutContainer: {
    marginTop: 20,
    width: "100%",
  },
  logoutButton: {
    backgroundColor: "#f44336", // red
    paddingVertical: 12,
    borderRadius: 8,
  },
});
