// app/eventorganizer/tabs/org_analytics.tsx
import { Text, View } from "react-native";

export default function OrgAnalytics() {
  return (
    <View className="flex-1 items-center justify-center bg-light-100 px-6">
      <Text className="text-2xl font-bold mb-4 text-custom-blue">Analytics</Text>
      <Text className="text-lg">Impact and participation statistics will appear here.</Text>
    </View>
  );
}
