// app/eventorganizer/tabs/org_volunteers.tsx
import { ScrollView, Text, View } from "react-native";

export default function OrgVolunteers() {
  return (
    <ScrollView className="flex-1 bg-light-100 px-6 py-8">
      <Text className="text-2xl font-bold mb-4 text-custom-blue">Volunteers</Text>
      <Text className="text-lg text-gray-700 mb-6">
        Here you can manage volunteer registrations, attendance, and participation for each event.
      </Text>

      <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <Text className="text-gray-800 font-semibold mb-2">Upcoming Event: Beach Cleanup - Negombo</Text>
        <Text className="text-gray-600">Total Volunteers: 25</Text>
        <Text className="text-gray-600">Checked-In: 18</Text>
        <Text className="text-gray-600">Pending Approvals: 3</Text>
      </View>

      <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mt-4">
        <Text className="text-gray-800 font-semibold mb-2">Past Event: Crow Island Cleanup</Text>
        <Text className="text-gray-600">Total Volunteers: 40</Text>
        <Text className="text-gray-600">Completed: 38</Text>
      </View>
    </ScrollView>
  );
}
