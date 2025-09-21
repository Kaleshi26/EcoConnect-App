import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, doc, getDoc, increment, Timestamp, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";

type EventDoc = {
  id: string;
  title: string;
  description: string;
  location?: { label?: string };
  currentFunding?: number;
  fundingGoal?: number;
};

export default function SponsorForm() {
  const { user } = useAuth();
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState("25000");
  const [customAmount, setCustomAmount] = useState("");
  const [fundingPurpose, setFundingPurpose] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [message, setMessage] = useState("");
  const [showCompanyName, setShowCompanyName] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const fundingPurposes = [
    "Waste collection logistics",
    "Volunteer refreshments",
    "Awareness campaigns",
    "Equipment (gloves, bags, etc.)",
    "Transportation",
    "Other",
  ];

  const amountSuggestions = [
    { value: "5000", label: "LKR 5,000" },
    { value: "10000", label: "LKR 10,000" },
    { value: "25000", label: "LKR 25,000" },
    { value: "50000", label: "LKR 50,000" },
    { value: "custom", label: "Custom Amount" },
  ];

  const getFinalAmount = () => {
    if (selectedAmount === "custom") {
      return parseInt(customAmount) || 0;
    }
    return parseInt(selectedAmount);
  };

  const handleConfirm = async () => {
    if (!user || !eventId) {
      Alert.alert("Error", "User not authenticated or event not found");
      return;
    }
    
    const amount = getFinalAmount();
    
    if (!fundingPurpose || amount <= 0 || (selectedAmount === "custom" && !customAmount)) {
      Alert.alert("Error", "Please fill all required fields with valid values.");
      return;
    }

    setSubmitting(true);

    try {
      // Create the pledge document
      await addDoc(collection(db, "pledges"), {
        userId: user.uid,
        eventId: eventId as string,
        type: "monetary",
        amount: amount,
        purpose: fundingPurpose,
        paymentMethod,
        message,
        showCompanyName,
        isAnonymous,
        status: "pending",
        createdAt: Timestamp.now(),
        userName: user.displayName || user.email,
        userEmail: user.email,
      });

      // Update the event's current funding
      if (event?.currentFunding !== undefined) {
        const eventRef = doc(db, "events", eventId as string);
        await updateDoc(eventRef, {
          currentFunding: increment(amount)
        });
      }

      setSubmitting(false);
      
      // Navigate to confirmation screen
      router.push({
        pathname: "/sponsor/tabs/SponsorConfirmation",
        params: { 
          eventId: eventId as string,
          amount: amount.toString(),
          eventName: event?.title || "Event"
        }
      });

    } catch (error) {
      console.error("Error creating pledge:", error);
      setSubmitting(false);
      Alert.alert("Error", "Failed to submit sponsorship. Please try again.");
    }
  };

  useEffect(() => {
    if (!eventId) return;
    
    const fetchEvent = async () => {
      try {
        const docRef = doc(db, "events", eventId as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEvent({ id: docSnap.id, ...(docSnap.data() as any) });
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching event:", error);
        setLoading(false);
      }
    };
    
    fetchEvent();
  }, [eventId]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4FB7B3" />
        <Text className="text-teal-700 mt-4 font-medium">Loading...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <Text className="text-2xl font-bold text-teal-700">Event Not Found</Text>
        <Pressable onPress={() => router.back()} className="mt-4 bg-teal-600 px-6 py-3 rounded-lg">
          <Text className="text-white font-bold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const finalAmount = getFinalAmount();

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      <View className="flex-row items-center mb-4">
        <Pressable onPress={() => router.back()} className="mr-2">
          <Ionicons name="arrow-back" size={24} color="#4FB7B3" />
        </Pressable>
        <Text className="text-xl font-bold text-teal-700">Sponsor Event</Text>
      </View>

      <View className="space-y-6">
        <View className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
          <Text className="text-lg font-bold text-teal-700 mb-2">{event.title}</Text>
          <View className="flex-row items-center">
            <Ionicons name="location-outline" size={16} color="#4FB7B3" />
            <Text className="text-gray-600 ml-2">{event.location?.label || "TBA"}</Text>
          </View>
          {event.currentFunding !== undefined && event.fundingGoal !== undefined && (
            <View className="mt-2">
              <Text className="text-sm text-gray-600">
                Current Funding: LKR {event.currentFunding.toLocaleString()} / LKR {event.fundingGoal.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        <View className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
          <Text className="text-lg font-bold text-teal-700 mb-2">Enter Amount *</Text>
          <Picker
            selectedValue={selectedAmount}
            onValueChange={(value) => setSelectedAmount(value)}
            style={{ height: 50, marginBottom: 10 }}
          >
            {amountSuggestions.map((amount) => (
              <Picker.Item key={amount.value} label={amount.label} value={amount.value} />
            ))}
          </Picker>
          {selectedAmount === "custom" && (
            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-4"
              placeholder="Enter custom amount (LKR)"
              keyboardType="numeric"
              value={customAmount}
              onChangeText={setCustomAmount}
            />
          )}
        </View>

        <View className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
          <Text className="text-lg font-bold text-teal-700 mb-2">Select Funding Purpose *</Text>
          <Picker
            selectedValue={fundingPurpose}
            onValueChange={(value) => setFundingPurpose(value)}
            style={{ height: 50, marginBottom: 10 }}
          >
            <Picker.Item label="Choose how funds will be used" value="" />
            {fundingPurposes.map((purpose) => (
              <Picker.Item key={purpose} label={purpose} value={purpose} />
            ))}
          </Picker>
        </View>

        <View className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
          <Text className="text-lg font-bold text-teal-700 mb-2">Payment Method *</Text>
          <Picker
            selectedValue={paymentMethod}
            onValueChange={(value) => setPaymentMethod(value)}
            style={{ height: 50, marginBottom: 10 }}
          >
            <Picker.Item label="Credit/Debit Card" value="card" />
            <Picker.Item label="PayPal" value="paypal" />
            <Picker.Item label="Bank Transfer" value="bank" />
          </Picker>
        </View>

        <View className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
          <Text className="text-lg font-bold text-teal-700 mb-2">Message to Organizer (Optional)</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 mb-4"
            placeholder="e.g., Happy to support your initiative..."
            multiline
            numberOfLines={3}
            value={message}
            onChangeText={setMessage}
          />
        </View>

        <View className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
          <Text className="text-lg font-bold text-teal-700 mb-2">Privacy Settings</Text>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 flex-row items-center">
              <Ionicons name="business-outline" size={16} color="#4FB7B3" />
              <Text className="text-gray-600 ml-2 flex-1">Allow my company name/logo to be displayed</Text>
            </View>
            <Switch
              value={showCompanyName}
              onValueChange={setShowCompanyName}
              trackColor={{ false: "#ccc", true: "#4FB7B3" }}
            />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center">
              <Ionicons name="eye-off-outline" size={16} color="#4FB7B3" />
              <Text className="text-gray-600 ml-2 flex-1">Keep my contribution anonymous</Text>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: "#ccc", true: "#4FB7B3" }}
            />
          </View>
        </View>

        <Pressable
          onPress={handleConfirm}
          className={`rounded-xl py-4 items-center shadow-md ${
            (!fundingPurpose || finalAmount <= 0 || submitting) ? 'bg-gray-400' : 'bg-teal-600'
          }`}
          disabled={!fundingPurpose || finalAmount <= 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">
              Confirm Sponsorship - LKR {finalAmount.toLocaleString()}
            </Text>
          )}
        </Pressable>

        <Text className="text-center text-sm text-gray-500">
          * Required fields
        </Text>
      </View>
    </ScrollView>
  );
}