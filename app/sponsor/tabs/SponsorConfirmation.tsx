import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

type EventDoc = {
  id: string;
  title: string;
  location?: { label?: string };
};

type PledgeDoc = {
  id: string;
  amount?: number;
  purpose?: string;
  paymentMethod?: string;
  message?: string;
  showCompanyName?: boolean;
  isAnonymous?: boolean;
  createdAt?: any;
};

export default function SponsorConfirmation() {
  const { user } = useAuth();
  const router = useRouter();
  const { eventId, amount, eventName } = useLocalSearchParams();
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [pledge, setPledge] = useState<PledgeDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId || !user) return;
    
    const fetchData = async () => {
      try {
        // Fetch event details
        const eventDoc = await getDoc(doc(db, "events", eventId as string));
        if (eventDoc.exists()) {
          setEvent({ id: eventDoc.id, ...eventDoc.data() } as EventDoc);
        }

        // Fetch the most recent pledge for this event by the current user
        const pledgeQuery = query(
          collection(db, "pledges"), 
          where("userId", "==", user.uid), 
          where("eventId", "==", eventId),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        
        const pledgeSnap = await getDocs(pledgeQuery);
        if (!pledgeSnap.empty) {
          const pledgeDoc = pledgeSnap.docs[0];
          const pledgeData = pledgeDoc.data();
          // Create the pledge object without spreading to avoid id conflicts
          setPledge({
            id: pledgeDoc.id,
            amount: pledgeData.amount,
            purpose: pledgeData.purpose,
            paymentMethod: pledgeData.paymentMethod,
            message: pledgeData.message,
            showCompanyName: pledgeData.showCompanyName,
            isAnonymous: pledgeData.isAnonymous,
            createdAt: pledgeData.createdAt
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching confirmation data:", error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [eventId, user]);

  const getPledgeAmount = () => {
    if (pledge?.amount) return pledge.amount;
    if (amount) return parseInt(amount as string);
    return 0;
  };

  const getEventTitle = () => {
    if (event?.title) return event.title;
    if (eventName) return eventName as string;
    return "the event";
  };

  const formatDate = () => {
    if (pledge?.createdAt) {
      try {
        const date = pledge.createdAt.toDate();
        return date.toLocaleDateString();
      } catch {
        return new Date().toLocaleDateString();
      }
    }
    return new Date().toLocaleDateString();
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4FB7B3" />
        <Text className="text-teal-700 mt-4 font-medium">Loading confirmation...</Text>
      </View>
    );
  }

  const pledgeAmount = getPledgeAmount();
  const eventTitle = getEventTitle();
  const pledgeDate = formatDate();

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      <View className="space-y-6">
        {/* Success Icon */}
        <View className="items-center">
          <View className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <Ionicons name="checkmark-circle" size={48} color="#4FB7B3" />
          </View>
        </View>

        {/* Success Message */}
        <View className="items-center">
          <Text className="text-2xl font-bold text-teal-700 mb-2 text-center">
            Sponsorship Successful!
          </Text>
          <Text className="text-gray-600 text-center">
            Thank you for supporting {eventTitle}
          </Text>
        </View>

        {/* Sponsorship Details */}
        <View className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <Text className="text-lg font-bold text-teal-700 mb-4">Sponsorship Details</Text>
          
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Event:</Text>
              <Text className="text-right font-medium">{eventTitle}</Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Amount:</Text>
              <Text className="text-teal-700 font-bold">LKR {pledgeAmount.toLocaleString()}</Text>
            </View>
            
            {pledge?.purpose && (
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Purpose:</Text>
                <Text className="text-right">{pledge.purpose}</Text>
              </View>
            )}
            
            {pledge?.paymentMethod && (
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Payment Method:</Text>
                <Text className="text-right capitalize">{pledge.paymentMethod}</Text>
              </View>
            )}
            
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Date:</Text>
              <Text>{pledgeDate}</Text>
            </View>

            {pledge?.message && (
              <View className="mt-3 pt-3 border-t border-gray-100">
                <Text className="text-gray-600 mb-1">Your Message:</Text>
                <Text className="text-gray-700 italic">&ldquo;{pledge.message}&rdquo;</Text>
              </View>
            )}
          </View>
        </View>

        {/* Privacy Settings Summary */}
        <View className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <Text className="text-lg font-bold text-teal-700 mb-4">Privacy Settings</Text>
          
          <View className="space-y-2">
            <View className="flex-row items-center">
              <Ionicons 
                name={pledge?.showCompanyName ? "eye-outline" : "eye-off-outline"} 
                size={16} 
                color="#4FB7B3" 
              />
              <Text className="text-gray-600 ml-2">
                Company name {pledge?.showCompanyName ? "will" : "will not"} be displayed
              </Text>
            </View>
            
            <View className="flex-row items-center">
              <Ionicons 
                name={pledge?.isAnonymous ? "person-remove-outline" : "person-outline"} 
                size={16} 
                color="#4FB7B3" 
              />
              <Text className="text-gray-600 ml-2">
                Contribution is {pledge?.isAnonymous ? "anonymous" : "not anonymous"}
              </Text>
            </View>
          </View>
        </View>

        {/* Certificate Section */}
        <View className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="medal-outline" size={20} color="#4FB7B3" />
              <Text className="text-teal-700 font-medium ml-2">Digital Certificate</Text>
            </View>
            <Pressable className="bg-teal-100 rounded-lg py-2 px-4">
              <Text className="text-teal-700 font-bold">Download PDF</Text>
            </Pressable>
          </View>
          <Text className="text-sm text-gray-600">
            Your certificate of appreciation is ready for download
          </Text>
        </View>

        {/* Share Options */}
        <View className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <Text className="text-lg font-bold text-teal-700 mb-4 flex-row items-center justify-center">
            <Ionicons name="share-social" size={20} color="#4FB7B3" />
            <Text className="ml-2">Share Your Impact</Text>
          </Text>
          
          <View className="flex-row justify-between space-x-2">
            <Pressable className="bg-blue-100 rounded-lg py-3 px-4 flex-1 items-center">
              <Ionicons name="logo-linkedin" size={20} color="#0077B5" />
              <Text className="text-blue-700 font-medium text-xs mt-1">LinkedIn</Text>
            </Pressable>
            
            <Pressable className="bg-blue-50 rounded-lg py-3 px-4 flex-1 items-center">
              <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
              <Text className="text-blue-500 font-medium text-xs mt-1">Twitter</Text>
            </Pressable>
            
            <Pressable className="bg-blue-200 rounded-lg py-3 px-4 flex-1 items-center">
              <Ionicons name="logo-facebook" size={20} color="#1877F2" />
              <Text className="text-blue-800 font-medium text-xs mt-1">Facebook</Text>
            </Pressable>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="space-y-3">
          <Pressable
            onPress={() => router.push("/sponsor/tabs/sponsorDashboard")}
            className="bg-teal-600 rounded-xl py-4 items-center shadow-md"
          >
            <Text className="text-white font-bold text-base">View on Dashboard</Text>
          </Pressable>
          
          <Pressable
            onPress={() => router.push("/sponsor/tabs/sponsorDashboard")}
            className="bg-gray-200 rounded-xl py-4 items-center shadow-md"
          >
            <Text className="text-gray-700 font-bold text-base">Back to Events</Text>
          </Pressable>
          
          <Pressable
            onPress={() => router.push("/sponsor/tabs/sponsorDashboard")}
            className="border border-teal-600 rounded-xl py-4 items-center"
          >
            <Text className="text-teal-600 font-bold text-base">Sponsor Another Event</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}