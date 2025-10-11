import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from 'expo-media-library';
import { addDoc, collection, doc, getDocs, onSnapshot, query, setDoc, Timestamp, where } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from "react-native-safe-area-context";
import ViewShot, { captureRef } from 'react-native-view-shot';

// Reuse type from org_events.tsx
type EventDoc = {
  id: string;
  title: string;
  description: string;
  eventAt?: Timestamp;
  location?: { label?: string };
  wasteTypes?: string[];
  volunteersNeeded?: number;
  sponsorshipRequired?: boolean;
  organizerId?: string;
  createdAt?: Timestamp;
  imageUrl?: string;
};

// Registration type
type RegistrationData = {
  id?: string;
  eventId: string;
  userId: string;
  email: string;
  phoneNumber: string;
  emergencyContact: string;
  skills: string;
  registeredAt: Timestamp;
  status: "pending" | "confirmed" | "cancelled";
};

// Reuse helpers from org_events.tsx
function tsToDate(ts?: Timestamp) {
  try {
    if (!ts) return null;
    // @ts-ignore
    if (typeof ts.toDate === "function") return ts.toDate();
  } catch {}
  return null;
}

function formatDate(d?: Date | null) {
  if (!d) return undefined;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(d?: Date | null) {
  if (!d) return undefined;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// Clean Row component
function Row({ children }: { children: React.ReactNode }) {
  return <View className="flex-row items-center mb-2.5">{children}</View>;
}

// Custom hook for press animations
function usePressScale(initial = 1) {
  const scale = useRef(new Animated.Value(initial)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return { scale, onPressIn, onPressOut };
}

// Registration Modal Component
function RegistrationModal({ 
  visible, 
  onClose, 
  event,
  onRegistrationComplete 
}: { 
  visible: boolean; 
  onClose: () => void; 
  event: EventDoc;
  onRegistrationComplete: (regId: string) => void;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || "",
    phoneNumber: "",
    emergencyContact: "",
    skills: ""
  });

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email || "" }));
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Authentication Required", "Please sign in to register for events.");
      return;
    }

    // Validation
    if (!formData.email || !formData.phoneNumber || !formData.emergencyContact) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      // Check if user is already registered
      const registrationQuery = query(
        collection(db, `events/${event.id}/registrations`),
        where("userId", "==", user.uid)
      );
      const existingRegistrations = await getDocs(registrationQuery);
      
      if (!existingRegistrations.empty) {
        Alert.alert("Already Registered", "You have already registered for this event.");
        onClose();
        return;
      }

      // Create registration
      const registrationData: RegistrationData = {
        eventId: event.id,
        userId: user.uid,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        emergencyContact: formData.emergencyContact,
        skills: formData.skills,
        registeredAt: Timestamp.fromDate(new Date()),
        status: "confirmed"
      };

      const regRef = await addDoc(collection(db, `events/${event.id}/registrations`), registrationData);
      const regId = regRef.id;
      
      // Also store a reference in the user's profile for easy access
      const userRegistrationRef = doc(db, `users/${user.uid}/registrations`, event.id);
      await setDoc(userRegistrationRef, {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.eventAt,
        registeredAt: Timestamp.fromDate(new Date()),
        status: "confirmed"
      });

      onRegistrationComplete(regId);
      onClose();
    } catch (e: any) {
      console.error("[RegistrationModal] Registration error:", e);
      Alert.alert("Registration Failed", "Unable to register for this event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const d = tsToDate(event.eventAt);
  const dateStr = d ? `${formatDate(d)} • ${formatTime(d)}` : "Date TBD";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView className="flex-1 bg-gray-50">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView 
            className="flex-1" 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/* Header */}
            <View className="bg-white px-6 pt-4 pb-5 shadow-sm">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-2xl font-bold text-gray-900">Event Registration</Text>
                <Pressable 
                  onPress={onClose}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="#6b7280" />
                </Pressable>
              </View>
              <Text className="text-gray-500 text-sm mt-1">Fill in your details to secure your spot</Text>
            </View>

            {/* Event Info Card */}
            <View className="mx-6 mt-4 mb-6">
              <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <Image 
                  source={{ uri: event.imageUrl || "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400" }}
                  className="w-full h-32 rounded-xl mb-4"
                  resizeMode="cover"
                />
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1 pr-3">
                    <Text className="text-lg font-bold text-gray-900 mb-2">{event.title}</Text>
                  </View>
                  <View className="bg-teal-100 px-3 py-1 rounded-full">
                    <Text className="text-[#0F828C] text-xs font-semibold">EVENT</Text>
                  </View>
                </View>
                
                <View className="space-y-2">
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 bg-teal-50 rounded-full items-center justify-center mr-3">
                      <Ionicons name="time" size={16} color="#0F828C" />
                    </View>
                    <Text className="text-gray-700 flex-1">{dateStr}</Text>
                  </View>
                  
                  {event.location?.label && (
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 bg-teal-50 rounded-full items-center justify-center mr-3">
                        <Ionicons name="location" size={16} color="#0F828C" />
                      </View>
                      <Text className="text-gray-700 flex-1">{event.location.label}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Registration Form */}
            <View className="mx-6 mb-8">
              <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <Text className="text-lg font-bold text-gray-900 mb-1">Registration Details</Text>
                <Text className="text-gray-500 text-sm mb-6">All fields marked with * are required</Text>
                
                {/* Email Field */}
                <View className="mb-5">
                  <Text className="text-gray-700 font-semibold mb-3">Email Address *</Text>
                  <View className="relative">
                    <TextInput
                      value={formData.email}
                      onChangeText={(text) => handleInputChange("email", text)}
                      placeholder="Enter your email address"
                      placeholderTextColor="#9ca3af"
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-base"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                    <View className="absolute right-4 top-4">
                      <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                    </View>
                  </View>
                </View>

                {/* Phone Field */}
                <View className="mb-5">
                  <Text className="text-gray-700 font-semibold mb-3">Phone Number *</Text>
                  <View className="relative">
                    <TextInput
                      value={formData.phoneNumber}
                      onChangeText={(text) => handleInputChange("phoneNumber", text)}
                      placeholder="Enter your phone number"
                      placeholderTextColor="#9ca3af"
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-base"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                    />
                    <View className="absolute right-4 top-4">
                      <Ionicons name="call-outline" size={20} color="#9ca3af" />
                    </View>
                  </View>
                </View>

                {/* Emergency Contact Field */}
                <View className="mb-5">
                  <Text className="text-gray-700 font-semibold mb-3">Emergency Contact *</Text>
                  <TextInput
                    value={formData.emergencyContact}
                    onChangeText={(text) => handleInputChange("emergencyContact", text)}
                    placeholder="Name and phone number"
                    placeholderTextColor="#9ca3af"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-base"
                  />
                  <Text className="text-gray-500 text-xs mt-2">E.g., John Doe - +1 (555) 123-4567</Text>
                </View>

                {/* Skills Field */}
                <View className="mb-6">
                  <Text className="text-gray-700 font-semibold mb-3">Skills & Experience</Text>
                  <TextInput
                    value={formData.skills}
                    onChangeText={(text) => handleInputChange("skills", text)}
                    placeholder="Tell us about your relevant skills or experience"
                    placeholderTextColor="#9ca3af"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-base min-h-24"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  <Text className="text-gray-500 text-xs mt-2">Optional - This helps us better organize the event</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Fixed Bottom Button */}
          <View className="bg-white px-6 py-4 shadow-lg">
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              className={`bg-[#0F828C] rounded-xl py-4 px-6 items-center shadow-sm ${
                loading ? "opacity-70" : ""
              }`}
            >
              {loading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="white" size="small" />
                  <Text className="text-white font-bold text-base ml-2">Processing...</Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text className="text-white font-bold text-base ml-2">Complete Registration</Text>
                </View>
              )}
            </Pressable>
            
            <Pressable 
              onPress={onClose}
              className="mt-3 py-3 items-center"
            >
              <Text className="text-gray-500 font-medium">Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// Professional EventCard with teal theme
function EventCard({ ev, onViewDetails }: { ev: EventDoc; onViewDetails: (event: EventDoc) => void }) {
  const { user } = useAuth();
  const d = tsToDate(ev.eventAt);
  const dateStr = d ? `${formatDate(d)} • ${formatTime(d)}` : "Date TBD";
  const registerAnim = usePressScale();
  const viewInfoAnim = usePressScale();

  const handleRegister = async () => {
    if (!user) {
      Alert.alert("Authentication Required", "Please sign in to register for events.");
      return;
    }
    
    // Check if already registered
    try {
      const registrationQuery = query(
        collection(db, `events/${ev.id}/registrations`),
        where("userId", "==", user.uid)
      );
      const existingRegistrations = await getDocs(registrationQuery);
      
      if (!existingRegistrations.empty) {
        Alert.alert("Already Registered", "You have already registered for this event.");
        return;
      }
      
      // If not registered, show details modal which includes registration
      onViewDetails(ev);
    } catch (e: any) {
      console.error("[EventCard] Registration check error:", e);
      onViewDetails(ev);
    }
  };

  return (
    <View className="mb-5 bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden">
      {/* Header Section with Image */}
      <View className="relative">
        <Image
          source={{
            uri: ev.imageUrl || "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400",
          }}
          className="w-full h-40"
          resizeMode="cover"
        />
        <View className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
          <Text className="text-xl font-bold text-white mb-2">{ev.title}</Text>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={16} color="#e2e8f0" />
            <Text className="text-slate-200 font-medium ml-2">{dateStr}</Text>
          </View>
        </View>
      </View>

      {/* Event Details Section */}
      <View className="px-6 py-4">
        {!!ev.location?.label && (
          <Row>
            <View className="w-8 h-8 bg-teal-100 rounded-full items-center justify-center">
              <Ionicons name="location-outline" size={16} color="#0F828C" />
            </View>
            <Text className="text-slate-700 ml-3 flex-1 font-medium">{ev.location.label}</Text>
          </Row>
        )}
        
        <Row>
          <View className="w-8 h-8 bg-teal-100 rounded-full items-center justify-center">
            <Ionicons name="people-outline" size={16} color="#0F828C" />
          </View>
          <Text className="text-slate-700 ml-3 font-medium">{ev.volunteersNeeded ?? 0} volunteers needed</Text>
        </Row>

        {/* Waste Types Tags */}
        {!!ev.wasteTypes?.length && (
          <View className="mt-4">
            <Text className="text-slate-600 font-medium mb-2 text-sm">Focus Areas:</Text>
            <View className="flex-row flex-wrap">
              {ev.wasteTypes.slice(0, 4).map((w) => (
                <View key={w} className="px-3 py-2 mr-2 mb-2 rounded-full bg-teal-50 border border-teal-200">
                  <Text className="text-[#0F828C] text-sm font-medium">{w}</Text>
                </View>
              ))}
              {ev.wasteTypes.length > 4 && (
                <View className="px-3 py-2 rounded-full bg-slate-100 border border-slate-200">
                  <Text className="text-slate-600 text-sm font-medium">+{ev.wasteTypes.length - 4} more</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Description Preview */}
        {ev.description && (
          <View className="mt-4 pt-4 border-t border-teal-100">
            <Text className="text-slate-600 leading-6" numberOfLines={3}>
              {ev.description}
            </Text>
          </View>
        )}

        {/* Sponsorship Badge */}
        {ev.sponsorshipRequired && (
          <View className="mt-3 flex-row items-center">
            <View className="w-2 h-2 bg-[#0F828C] rounded-full mr-2" />
            <Text className="text-[#0F828C] text-sm font-medium">Sponsorship opportunities available</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View className="p-6 pt-0">
        <View className="flex-row space-x-3">
          <Animated.View style={{ flex: 1, transform: [{ scale: registerAnim.scale }] }}>
            <Pressable
              onPress={() => onViewDetails(ev)}
              onPressIn={viewInfoAnim.onPressIn}
              onPressOut={viewInfoAnim.onPressOut}
              className="bg-[#0F828C] rounded-xl py-4 items-center mr-1.5 shadow-md"
            >
              <Text className="text-white font-bold text-base">Register</Text>
            </Pressable>
          </Animated.View>
          <Animated.View style={{ flex: 1, transform: [{ scale: viewInfoAnim.scale }] }}>
            <Pressable
              onPress={() => onViewDetails(ev)}
              onPressIn={viewInfoAnim.onPressIn}
              onPressOut={viewInfoAnim.onPressOut}
              className="bg-slate-100 border border-slate-200 rounded-xl py-4 items-center ml-1.5"
            >
              <Text className="text-slate-700 font-bold text-base">Details</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

export default function VolEvent() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<EventDoc | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [userRegistrations, setUserRegistrations] = useState<string[]>([]);
  const [qrData, setQrData] = useState<{ eventId: string; regId: string } | null>(null);
  const qrRef = useRef<ViewShot>(null);

  // Fetch events
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "events"), where("status", "==", "open"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const all: EventDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setEvents(all);
        setFilteredEvents(all);
        setLoading(false);
      },
      (err) => {
        console.error("[VolEvent] Snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Fetch user registrations
  useEffect(() => {
    if (!user) return;

    const fetchUserRegistrations = async () => {
      try {
        const registrationsRef = collection(db, `users/${user.uid}/registrations`);
        const snapshot = await getDocs(registrationsRef);
        const eventIds = snapshot.docs.map(doc => doc.id);
        setUserRegistrations(eventIds);
      } catch (error) {
        console.error("Error fetching user registrations:", error);
      }
    };

    fetchUserRegistrations();
  }, [user]);

  // Enhanced filter with multiple search criteria
  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();
    if (!lowerQuery) {
      setFilteredEvents(events);
      return;
    }
    const filtered = events.filter(
      (ev) =>
        ev.title.toLowerCase().includes(lowerQuery) ||
        (ev.location?.label?.toLowerCase() || "").includes(lowerQuery) ||
        ev.description.toLowerCase().includes(lowerQuery) ||
        (ev.wasteTypes || []).some(type => type.toLowerCase().includes(lowerQuery))
    );
    setFilteredEvents(filtered);
  }, [searchQuery, events]);

  // Animation for header
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerTranslate, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const clearSearch = () => {
    setSearchQuery("");
  };

  const handleViewDetails = (event: EventDoc) => {
    setSelectedEvent(event);
    setShowRegistrationModal(true);
  };

  const handleRegistrationComplete = (regId: string) => {
    if (selectedEvent) {
      setUserRegistrations(prev => [...prev, selectedEvent.id]);
      setQrData({ eventId: selectedEvent.id, regId });
    }
    setShowRegistrationModal(false);
    setSelectedEvent(null);
  };

  const handleDownload = async () => {
    if (!qrRef.current) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save to library.');
        return;
      }
      const uri = await captureRef(qrRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Success', 'QR code saved to your gallery.');
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download QR code.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <Animated.View
        style={{ 
          opacity: headerOpacity, 
          transform: [{ translateY: headerTranslate }] 
        }}
        className="bg-gradient-to-r from-[#0F828C] to-teal-700"
      >
        <View className="px-6 pt-5 pb-1">
          
          {/* Search Bar */}
          <View className="flex-row items-center bg-white rounded-2xl px-5 py-4 shadow-lg">
            <Ionicons name="search" size={22} color="#64748b" />
            <TextInput
              className="flex-1 mx-3 text-base text-slate-800"
              placeholder="Search events, locations, or focus areas..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={clearSearch}
                className="p-1"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={22} color="#94a3b8" />
              </Pressable>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ 
          padding: 20, 
          paddingBottom: 100 
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#0F828C" />
            <Text className="text-slate-600 mt-4 font-medium">Loading events...</Text>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <View className="w-20 h-20 bg-teal-100 rounded-full items-center justify-center mb-6">
              <Ionicons 
                name={searchQuery ? "search-outline" : "calendar-outline"} 
                size={32} 
                color="#0F828C" 
              />
            </View>
            <Text className="text-2xl font-bold text-slate-800 mb-3">
              {searchQuery ? "No Events Found" : "No Events Available"}
            </Text>
            <Text className="text-slate-600 text-center max-w-sm leading-6 mb-6">
              {searchQuery
                ? `No events match "${searchQuery}". Try adjusting your search terms.`
                : "There are currently no open volunteer events. Check back soon for new opportunities to make a difference."}
            </Text>
            {searchQuery && (
              <Pressable
                onPress={clearSearch}
                className="bg-[#0F828C] px-6 py-3 rounded-xl shadow-md"
              >
                <Text className="text-white font-bold">Clear Search</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View>
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-slate-700 font-bold text-lg">
                  {filteredEvents.length} {filteredEvents.length === 1 ? 'Event' : 'Events'} 
                  {searchQuery ? ` Found` : ` Available`}
                </Text>
                <Text className="text-slate-500 text-sm">
                  Ready for registration
                </Text>
              </View>
              {searchQuery && (
                <Pressable
                  onPress={clearSearch}
                  className="bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl"
                >
                  <Text className="text-slate-700 font-medium">Clear</Text>
                </Pressable>
              )}
            </View>
            {filteredEvents.map((ev) => (
              <EventCard 
                key={ev.id} 
                ev={ev} 
                onViewDetails={handleViewDetails}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Registration Modal */}
      {selectedEvent && (
        <RegistrationModal
          visible={showRegistrationModal}
          onClose={() => {
            setShowRegistrationModal(false);
            setSelectedEvent(null);
          }}
          event={selectedEvent}
          onRegistrationComplete={handleRegistrationComplete}
        />
      )}

      {/* QR Code Modal */}
      {qrData && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setQrData(null)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <SafeAreaView className="bg-white rounded-2xl p-6 w-11/12 max-w-sm shadow-xl">
              <Text className="text-2xl font-bold text-gray-900 mb-4 text-center">Registration Successful!</Text>
              <Text className="text-gray-600 mb-4 text-center">
                Present this QR code to the organizer at the event to scan and confirm your participation to update your badge. We give badges according to the number of completed events.
              </Text>
              <Text className="text-gray-600 mb-6 text-center">
                This QR code is also visible under your profile section.
              </Text>
              <View className="items-center mb-6">
                <ViewShot ref={qrRef} options={{ format: 'png', quality: 1 }}>
                  <QRCode
                    value={`vol-reg:${qrData.eventId}:${qrData.regId}:${user?.uid}`}
                    size={200}
                    backgroundColor="white"
                    color="black"
                  />
                </ViewShot>
              </View>
              <Pressable
                onPress={handleDownload}
                className="bg-[#0F828C] rounded-xl py-4 mb-4"
              >
                <Text className="text-white font-bold text-center">Download QR Code</Text>
              </Pressable>
              <Pressable
                onPress={() => setQrData(null)}
                className="bg-gray-200 rounded-xl py-4"
              >
                <Text className="text-gray-800 font-bold text-center">Close</Text>
              </Pressable>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}