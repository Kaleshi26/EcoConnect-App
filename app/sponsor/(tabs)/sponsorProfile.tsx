import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Avatar, Card, Switch } from "react-native-paper";
import { useAuth } from "../../../contexts/AuthContext";
import { auth } from "../../../services/firebaseConfig";

export default function SponsorProfile() {
  const { user } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState({
    eventUpdates: true,
    impactReports: true,
    certificates: true,
    newsletter: false,
  });

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/(public)/auth/login");
  };

  return (
    <ScrollView className="flex-1 bg-white px-4 py-6">
      {/* Header */}
      <View className="items-center mb-6">
        <Avatar.Text size={72} label="SP" />
        <Text className="text-xl font-bold mt-3 text-custom-blue">Sponsor Profile</Text>
        <Text className="text-base text-gray-600">{user?.email}</Text>
      </View>

      {/* Profile Info */}
      <Card className="mb-4">
        <Card.Title title="Company Info" />
        <Card.Content>
          <Text>- Company: BlueWave Industries</Text>
          <Text>- Contact: Rajesh Kumar</Text>
          <Text>- Phone: +91 98765 43210</Text>
          <Text>- Description: Leading technology company committed to sustainability.</Text>
        </Card.Content>
      </Card>

      {/* Notifications */}
      <Card className="mb-4">
        <Card.Title title="Notifications" />
        <Card.Content>
          {Object.keys(notifications).map((key) => (
            <View key={key} className="flex-row justify-between items-center py-2">
              <Text className="capitalize">{key}</Text>
              <Switch
                value={notifications[key as keyof typeof notifications]}
                onValueChange={(val) =>
                  setNotifications({ ...notifications, [key]: val })
                }
              />
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Logout */}
      <TouchableOpacity
        onPress={handleLogout}
        className="bg-custom-red w-full py-3 rounded-xl mt-6"
      >
        <Text className="text-white text-center font-semibold">Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
