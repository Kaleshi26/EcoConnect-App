// app/eventorganizer/tabs/org_reports.tsx
import { Text, View } from "react-native";

export default function OrgReports() {
  return (
    <View className="flex-1 bg-light-100 px-6 justify-center items-center">
      <Text className="text-2xl font-bold mb-4 text-custom-blue">Reports</Text>
      <Text className="text-lg text-gray-700 text-center">
        Download or view event performance reports and cleanup summaries here.
      </Text>
      <Text className="mt-4 text-gray-500 text-center">
        (Coming soon: PDF exports, impact cards, and participation metrics.)
      </Text>
    </View>
  );
}
