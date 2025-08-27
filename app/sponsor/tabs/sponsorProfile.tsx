import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export default function SponsorProfile() {
  const [companyName, setCompanyName] = useState("BlueWave Industries");
  const [contactPerson, setContactPerson] = useState("Rajesh Kumar");
  const [email, setEmail] = useState("rajesh@bluewave.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [description, setDescription] = useState("Leading technology company committed to sustainability.");

  return (
    <View className="flex-1 bg-white p-6">
      {/* Profile Header */}
      <View className="items-center mb-6">
        
        <Text className="text-2xl font-bold text-custom-blue">Sponsor Profile</Text>
      </View>

      {/* Form */}
      <View className="mb-4">
        <Text className="font-semibold mb-1">Company Name</Text>
        <TextInput
          value={companyName}
          onChangeText={setCompanyName}
          className="border border-gray-300 rounded-lg p-3"
        />
      </View>

      <View className="mb-4">
        <Text className="font-semibold mb-1">Contact Person</Text>
        <TextInput
          value={contactPerson}
          onChangeText={setContactPerson}
          className="border border-gray-300 rounded-lg p-3"
        />
      </View>

      <View className="mb-4">
        <Text className="font-semibold mb-1">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          className="border border-gray-300 rounded-lg p-3"
        />
      </View>

      <View className="mb-4">
        <Text className="font-semibold mb-1">Phone</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          className="border border-gray-300 rounded-lg p-3"
        />
      </View>

      <View className="mb-4">
        <Text className="font-semibold mb-1">Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          className="border border-gray-300 rounded-lg p-3 h-20"
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity className="bg-custom-blue py-3 rounded-xl">
        <Text className="text-white text-center font-semibold">Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
}
