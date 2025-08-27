import { Text, View } from "react-native";

export default function OrgNotifications() {
  return (
    <View className="flex-1 items-center justify-center bg-light-100 px-6">
      <Text className="text-2xl font-bold mb-4 text-custom-blue">Organizer Notifications</Text>
      <Text className="text-lg">You’ll see volunteer sign-ups and updates here.</Text>
    </View>
  );
}
