import { Text, View } from "react-native";

export default function OrgEvents() {
  return (
    <View className="flex-1 items-center justify-center bg-light-100 px-6">
      <Text className="text-2xl font-bold mb-4 text-custom-blue">Manage Events</Text>
      <Text className="text-lg">Here you can create and manage clean-up events.</Text>
    </View>
  );
}
