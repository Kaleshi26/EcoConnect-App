import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

type EventDoc = {
  id: string;
  title: string;
  description: string;
  eventAt?: any;
  location?: { label?: string };
  sponsorshipRequired?: boolean;
  fundingGoal?: number;
  currentFunding?: number;
  image?: string;
  sponsorCount?: number;
};

type SponsorshipFormData = {
  amount: string;
  message: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  sponsorshipType: 'financial' | 'in_kind' | 'both';
  inKindDescription: string;
  termsAccepted: boolean;
};

type SponsorshipType = {
  value: 'financial' | 'in_kind' | 'both';
  label: string;
  description: string;
  details: string;
};

export default function SponsorForm() {
  const { eventId, eventTitle } = useLocalSearchParams();
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingSponsorship, setHasExistingSponsorship] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [formData, setFormData] = useState<SponsorshipFormData>({
    amount: '',
    message: '',
    contactEmail: user?.email || '',
    contactPhone: '',
    companyName: '',
    sponsorshipType: 'financial',
    inKindDescription: '',
    termsAccepted: false,
  });

  const sponsorshipTypes: SponsorshipType[] = [
    {
      value: 'financial',
      label: 'Financial Sponsorship',
      description: 'Monetary contribution in LKR',
      details: 'Direct financial support that will be used for event expenses, equipment, and resources.'
    },
    {
      value: 'in_kind',
      label: 'In-Kind Sponsorship',
      description: 'Goods, services, or resources',
      details: 'Provide materials, equipment, services, or volunteers instead of monetary support.'
    },
    {
      value: 'both',
      label: 'Combined Sponsorship',
      description: 'Both financial and in-kind support',
      details: 'Provide a combination of financial support and goods/services.'
    },
  ];

  useEffect(() => {
    const fetchEventAndCheckSponsorship = async () => {
      if (!eventId || !user) {
        setError("Missing required information");
        setLoading(false);
        return;
      }

      try {
        // Fetch event details
        const eventDoc = await getDoc(doc(db, "events", eventId as string));
        if (eventDoc.exists()) {
          const eventData = {
            id: eventDoc.id,
            ...eventDoc.data(),
          } as EventDoc;
          setEvent(eventData);

          // Check if user already has a sponsorship for this event
          const sponsorshipsQuery = query(
            collection(db, "sponsorships"),
            where("eventId", "==", eventId),
            where("sponsorId", "==", user.uid)
          );
          
          const sponsorshipSnap = await getDocs(sponsorshipsQuery);
          setHasExistingSponsorship(!sponsorshipSnap.empty);

          if (!sponsorshipSnap.empty) {
            Alert.alert(
              "Already Sponsored",
              "You have already submitted a sponsorship for this event. You can view your sponsorship status in 'My Sponsorships'.",
              [{ text: "OK", onPress: () => router.back() }]
            );
          }
        } else {
          setError("Event not found");
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load event details");
        setLoading(false);
      }
    };

    fetchEventAndCheckSponsorship();
  }, [eventId, user]);

  const handleInputChange = (field: keyof SponsorshipFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const parseCurrency = (value: string): number => {
    const cleanValue = value.replace(/[^\d]/g, '');
    return cleanValue ? parseInt(cleanValue, 10) : 0;
  };

  const validateForm = (): boolean => {
    if (!formData.amount || parseCurrency(formData.amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid sponsorship amount in LKR.");
      return false;
    }

    if (formData.sponsorshipType !== 'financial' && parseCurrency(formData.amount) > 0) {
      // For non-financial sponsorships, amount should be 0 or they should use financial/both
      Alert.alert("Amount Conflict", "For in-kind sponsorships, please set amount to 0 or choose financial sponsorship type.");
      return false;
    }

    if (formData.sponsorshipType === 'in_kind' && !formData.inKindDescription.trim()) {
      Alert.alert("Description Required", "Please describe the goods or services you're providing for in-kind sponsorship.");
      return false;
    }

    if (!formData.contactEmail) {
      Alert.alert("Email Required", "Please enter your contact email.");
      return false;
    }

    if (!formData.contactPhone) {
      Alert.alert("Phone Required", "Please enter your contact phone number.");
      return false;
    }

    // Basic phone validation for international numbers
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(formData.contactPhone.replace(/[\s-]/g, ''))) {
      Alert.alert("Invalid Phone", "Please enter a valid international phone number.");
      return false;
    }

    if (!formData.termsAccepted) {
      Alert.alert("Terms Required", "Please accept the terms and conditions.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!user || hasExistingSponsorship) {
      Alert.alert("Cannot Sponsor", "You have already sponsored this event.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const sponsorshipAmount = parseCurrency(formData.amount);

      // Create sponsorship document
      const sponsorshipData = {
        eventId: eventId,
        eventTitle: event?.title || eventTitle,
        sponsorId: user.uid,
        sponsorEmail: user.email,
        sponsorName: user.displayName || formData.companyName,
        amount: sponsorshipAmount,
        sponsorshipType: formData.sponsorshipType,
        companyName: formData.companyName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        message: formData.message,
        inKindDescription: formData.inKindDescription,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add sponsorship to Firestore
      const sponsorshipRef = await addDoc(collection(db, "sponsorships"), sponsorshipData);

      // Update event's current funding and sponsor count (only for financial contributions)
      if (event && sponsorshipAmount > 0) {
        const currentFundingAmount = event.currentFunding || 0;
        const currentSponsorCount = event.sponsorCount || 0;

        await updateDoc(doc(db, "events", eventId as string), {
          currentFunding: currentFundingAmount + sponsorshipAmount,
          sponsorCount: currentSponsorCount + 1,
          updatedAt: new Date(),
        });
      } else if (event) {
        // For in-kind only, just update sponsor count
        const currentSponsorCount = event.sponsorCount || 0;
        await updateDoc(doc(db, "events", eventId as string), {
          sponsorCount: currentSponsorCount + 1,
          updatedAt: new Date(),
        });
      }

      // Navigate to confirmation page
      router.push({
        pathname: "/sponsor/tabs/SponsorConfirmation",
        params: { 
          sponsorshipId: sponsorshipRef.id,
          eventTitle: event?.title || eventTitle,
          amount: sponsorshipAmount.toString(),
          sponsorshipType: formData.sponsorshipType
        }
      });

    } catch (error) {
      console.error("Error submitting sponsorship:", error);
      Alert.alert(
        "Submission Failed",
        "There was an error submitting your sponsorship. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/sponsor/tabs/sponsorDashboard");
    }
  };

  const suggestedAmounts = [1000, 2500, 5000, 10000, 25000, 50000];
  const hasFundingGoal = event?.fundingGoal && event.fundingGoal > 0;

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text className="text-gray-600 font-medium mt-4 text-base">
          Loading sponsorship form...
        </Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center px-8">
        <StatusBar barStyle="dark-content" />
        <View className="bg-red-100 rounded-full p-4 mb-4">
          <Ionicons name="alert-circle" size={48} color="#DC2626" />
        </View>
        <Text className="text-gray-900 text-xl font-bold text-center mb-2">
          {error || "Event not found"}
        </Text>
        <Text className="text-gray-600 text-base text-center mb-6">
          Unable to load sponsorship form for this event.
        </Text>
        <Pressable
          onPress={handleBack}
          className="bg-teal-500 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-semibold text-base">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (hasExistingSponsorship) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center px-8">
        <StatusBar barStyle="dark-content" />
        <View className="bg-blue-100 rounded-full p-4 mb-4">
          <Ionicons name="information-circle" size={48} color="#3B82F6" />
        </View>
        <Text className="text-gray-900 text-xl font-bold text-center mb-2">
          Already Sponsored
        </Text>
        <Text className="text-gray-600 text-base text-center mb-6">
          You have already submitted a sponsorship for this event.
        </Text>
        <Pressable
          onPress={handleBack}
          className="bg-teal-500 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-semibold text-base">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View 
        className="bg-white pt-4 px-4 border-b border-gray-200"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </Pressable>
          
          <Text className="text-lg font-semibold text-gray-900">Sponsor Event</Text>
          
          <View className="w-10" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="px-4 pt-6 pb-8">
            {/* Event Info Card */}
            <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-200">
              <Text className="text-gray-900 font-semibold text-lg mb-2">
                {event.title}
              </Text>
              <Text className="text-gray-600 text-sm mb-4">
                {event.description?.substring(0, 100)}...
              </Text>
              
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-gray-700 font-medium text-sm">
                    {hasFundingGoal ? 'Funding Progress' : 'Current Support'}
                  </Text>
                  <Text className="text-gray-900 font-bold text-lg">
                    {formatCurrency(event.currentFunding || 0)}
                    {hasFundingGoal && ` / ${formatCurrency(event.fundingGoal || 0)}`}
                  </Text>
                </View>
                <View className="bg-teal-100 px-3 py-1 rounded-full">
                  <Text className="text-teal-700 font-semibold text-sm">
                    {event.sponsorCount || 0} sponsors
                  </Text>
                </View>
              </View>
            </View>

            {/* Sponsorship Type */}
            <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-200">
              <Text className="text-gray-900 font-semibold text-lg mb-4">
                Sponsorship Type
              </Text>

              <View className="space-y-3">
                {sponsorshipTypes.map((type) => (
                  <Pressable
                    key={type.value}
                    onPress={() => handleInputChange('sponsorshipType', type.value)}
                    className={`p-4 border rounded-xl ${
                      formData.sponsorshipType === type.value
                        ? 'bg-teal-50 border-teal-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <View className="flex-row items-start">
                      <View
                        className={`w-5 h-5 rounded-full border-2 mr-3 mt-0.5 ${
                          formData.sponsorshipType === type.value
                            ? 'bg-teal-500 border-teal-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {formData.sponsorshipType === type.value && (
                          <Ionicons name="checkmark" size={12} color="white" />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-900 font-medium text-base">{type.label}</Text>
                        <Text className="text-teal-600 text-sm font-medium mt-1">{type.description}</Text>
                        <Text className="text-gray-500 text-sm mt-2">{type.details}</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Sponsorship Amount */}
            {formData.sponsorshipType !== 'in_kind' && (
              <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-200">
                <Text className="text-gray-900 font-semibold text-lg mb-4">
                  Sponsorship Amount (LKR)
                </Text>

                {/* Suggested Amounts */}
                <Text className="text-gray-600 text-sm mb-3">Suggested amounts:</Text>
                <View className="flex-row flex-wrap mb-4">
                  {suggestedAmounts.map((amount) => (
                    <Pressable
                      key={amount}
                      onPress={() => handleInputChange('amount', amount.toString())}
                      className={`mr-2 mb-2 px-4 py-2 rounded-full border ${
                        formData.amount === amount.toString()
                          ? 'bg-teal-500 border-teal-500'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text
                        className={`font-medium ${
                          formData.amount === amount.toString()
                            ? 'text-white'
                            : 'text-gray-700'
                        }`}
                      >
                        {formatCurrency(amount)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Custom Amount */}
                <View>
                  <Text className="text-gray-600 text-sm mb-2">Or enter custom amount:</Text>
                  <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-white">
                    <Text className="text-gray-500 text-lg mr-2">LKR</Text>
                    <TextInput
                      value={formData.amount ? formatCurrency(parseCurrency(formData.amount)) : ''}
                      onChangeText={(value) => handleInputChange('amount', value)}
                      placeholder="0"
                      keyboardType="number-pad"
                      className="flex-1 text-gray-900 text-lg font-medium"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                
              </View>
            )}

            {/* In-Kind Description */}
            {formData.sponsorshipType !== 'financial' && (
              <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-200">
                <Text className="text-gray-900 font-semibold text-lg mb-4">
                  In-Kind Sponsorship Details
                </Text>

                <Text className="text-gray-600 text-sm mb-3">
                  Please describe the goods, services, or resources you are providing:
                </Text>

                <TextInput
                  value={formData.inKindDescription}
                  onChangeText={(value) => handleInputChange('inKindDescription', value)}
                  placeholder="Examples: 50 pairs of gloves, 100 water bottles, volunteer team of 5 people, printing services for promotional materials..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-gray-900 min-h-[100px]"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}

            {/* Contact Information */}
            <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-200">
              <Text className="text-gray-900 font-semibold text-lg mb-4">
                Contact Information
              </Text>

              <View className="space-y-4">
                <View>
                  <Text className="text-gray-600 text-sm mb-2">Company/Organization Name (Optional)</Text>
                  <TextInput
                    value={formData.companyName}
                    onChangeText={(value) => handleInputChange('companyName', value)}
                    placeholder="Enter company or organization name"
                    className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-gray-900"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View>
                  <Text className="text-gray-600 text-sm mb-2">Email Address *</Text>
                  <TextInput
                    value={formData.contactEmail}
                    onChangeText={(value) => handleInputChange('contactEmail', value)}
                    placeholder="your@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-gray-900"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View>
                  <Text className="text-gray-600 text-sm mb-2">Phone Number *</Text>
                  <TextInput
                    value={formData.contactPhone}
                    onChangeText={(value) => handleInputChange('contactPhone', value)}
                    placeholder="+94 77 123 4567 or international format"
                    keyboardType="phone-pad"
                    className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-gray-900"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Text className="text-gray-500 text-xs mt-1">
                    Include country code for international numbers
                  </Text>
                </View>
              </View>
            </View>

            {/* Message to Organizer */}
            <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-200">
              <Text className="text-gray-900 font-semibold text-lg mb-4">
                Additional Message (Optional)
              </Text>

              <TextInput
                value={formData.message}
                onChangeText={(value) => handleInputChange('message', value)}
                placeholder="Any additional information, questions, or special requests for the event organizer..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-gray-900 min-h-[100px]"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Terms and Conditions */}
            <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-200">
              <Pressable
                onPress={() => handleInputChange('termsAccepted', !formData.termsAccepted)}
                className="flex-row items-start"
              >
                <View
                  className={`w-5 h-5 rounded border-2 mr-3 mt-0.5 ${
                    formData.termsAccepted
                      ? 'bg-teal-500 border-teal-500'
                      : 'border-gray-300'
                  }`}
                >
                  {formData.termsAccepted && (
                    <Ionicons name="checkmark" size={12} color="white" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">
                    I agree to the terms and conditions *
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    By checking this box, I confirm that I want to sponsor this event. The event organizer will contact me via email or phone to coordinate the sponsorship details. I understand that this sponsorship request is subject to approval by the event organizer.
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View className="px-4 pb-4 pt-3 bg-white border-t border-gray-200 absolute bottom-0 left-0 right-0" style={{ paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={handleSubmit}
          disabled={submitting || hasExistingSponsorship}
          className={`rounded-xl py-4 items-center shadow-lg ${
            submitting || hasExistingSponsorship ? 'bg-gray-400' : 'bg-teal-500'
          }`}
          style={{
            shadowColor: "#14B8A6",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : hasExistingSponsorship ? (
            <Text className="text-white font-bold text-lg">Already Sponsored</Text>
          ) : (
            <>
              <Text className="text-white font-bold text-lg">
                Submit Sponsorship Request
              </Text>
              {formData.amount && formData.sponsorshipType !== 'in_kind' && (
                <Text className="text-teal-100 text-sm mt-1">
                  Amount: {formatCurrency(parseCurrency(formData.amount))}
                </Text>
              )}
              {formData.sponsorshipType === 'in_kind' && (
                <Text className="text-teal-100 text-sm mt-1">
                  In-Kind Sponsorship
                </Text>
              )}
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}