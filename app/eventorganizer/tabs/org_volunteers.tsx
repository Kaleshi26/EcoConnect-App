// app/eventorganizer/tabs/org_volunteers.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { collection, doc, onSnapshot, query, Timestamp, updateDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Image, ImageBackground, Pressable, ScrollView, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "../../../contexts/AuthContext";
import { db } from "../../../services/firebaseConfig";

// @ts-ignore
console.reportErrorsAsExceptions = false;

type EventDoc = {
  id: string;
  title: string;
  imageUrl?: string;
  status: "open" | "in_progress" | "completed";
  eventAt?: Timestamp;
  organizerId: string;
};

type Registration = {
  id: string;
  userId: string;
  email: string;
  phoneNumber: string;
  status: "pending" | "confirmed";
  attended?: boolean;
};

// Helper to format timestamp to date
function tsToDate(ts?: Timestamp) {
  return ts ? ts.toDate() : null;
}

// Helper to determine event status
function getStatus(ev: EventDoc) {
  if (ev.status === "completed") return "Completed";
  const now = new Date();
  const eventDate = tsToDate(ev.eventAt);
  if (!eventDate) return "Upcoming";
  if (eventDate.getTime() > now.getTime()) return "Upcoming";
  return "In Progress";
}

// Animation hook for pressable components
function usePressScale(initial = 1) {
  const scale = useRef(new Animated.Value(initial)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return { scale, onPressIn, onPressOut };
}

// Row component for consistent layout
// Row component for consistent layout (fixed)
function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={`flex-row items-center ${className || ""}`}>{children}</View>;
}


// Event Item Component
function EventItem({
  event,
  isSelected,
  onPress
}: {
  event: EventDoc;
  isSelected: boolean;
  onPress: () => void;
}) {
  const status = getStatus(event);
  const statusColors: Record<string, string> = {
    Upcoming: "bg-blue-100 text-blue-700",
    "In Progress": "bg-yellow-100 text-yellow-700",
    Completed: "bg-green-100 text-green-700",
  };
  const btnAnim = usePressScale();

  // We pre-calculate the className string here to keep the JSX clean
  const pressableClasses = `bg-white rounded-2xl mb-3 shadow-sm border overflow-hidden ${
    isSelected ? "border-blue-500 border-2" : "border-gray-100"
  }`;

  return (
    <Animated.View style={{ transform: [{ scale: btnAnim.scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={btnAnim.onPressIn}
        onPressOut={btnAnim.onPressOut}
        className={pressableClasses} // Use the clean variable here
      >
        {/* Image Section */}
        <Image
          source={{ uri: event.imageUrl || "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=500" }}
          className="w-full h-36"
          resizeMode="cover"
        />
        {/* Content Section (the white space) */}
        <View className="p-4">
          <Row className="justify-between items-center">
            <Text className="text-lg font-semibold text-gray-900 flex-1 pr-2">
              {event.title}
            </Text>
            <View className={`px-3 py-1 rounded-full ${statusColors[status]}`}>
              <Text className="text-xs font-medium">
                {status}
              </Text>
            </View>
          </Row>
          <Text className="text-gray-500 text-sm mt-1">
            {tsToDate(event.eventAt)?.toLocaleDateString() || "Date TBD"}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Volunteer Item Component
function VolunteerItem({ 
  registration, 
  onMarkAttended 
}: { 
  registration: Registration; 
  onMarkAttended: (regId: string, attended: boolean) => void; 
}) {
  const btnAnim = usePressScale();
  
  return (
    <Animated.View
      style={{ transform: [{ scale: btnAnim.scale }], marginBottom: 12 }}
    >
      <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <Row className="justify-between items-center">
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">{registration.email}</Text>
            <Text className="text-gray-600 text-sm">{registration.phoneNumber}</Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-gray-500 text-xs">
                Status: {registration.status}
              </Text>
              <View className={`w-2 h-2 rounded-full mx-2 ${
                registration.attended ? "bg-green-500" : "bg-gray-400"
              }`} />
              <Text className="text-gray-500 text-xs">
                {registration.attended ? "Attended" : "Not attended"}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => onMarkAttended(registration.id, !registration.attended)}
            onPressIn={btnAnim.onPressIn}
            onPressOut={btnAnim.onPressOut}
            className={`px-4 py-2 rounded-lg ${
              registration.attended ? "bg-green-600" : "bg-blue-600"
            }`}
          >
            <Text className="font-semibold text-sm text-white">
              {registration.attended ? "Attended" : "Mark Attended"}
            </Text>
          </Pressable>
        </Row>
      </View>
    </Animated.View>
  );
}

export default function OrgVolunteers() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [regLoading, setRegLoading] = useState(false);

  // Animation for header
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { 
        toValue: 1, 
        duration: 500, 
        useNativeDriver: true 
      }),
      Animated.spring(headerTranslate, { 
        toValue: 0, 
        tension: 80, 
        friction: 8, 
        useNativeDriver: true 
      }),
    ]).start();
  }, []);

  // Fetch events
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const q = query(collection(db, "events"));
    
    const unsub = onSnapshot(q, 
      (snapshot) => {
        try {
          const eventsData: EventDoc[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            // Only include events that belong to the current organizer
            if (data.organizerId === user.uid) {
              eventsData.push({
                id: doc.id,
                title: data.title || 'Untitled Event',
                status: data.status || 'open',
                eventAt: data.eventAt,
                organizerId: data.organizerId,
                imageUrl: data.imageUrl
              });
            }
          });
          setEvents(eventsData);
          setLoading(false);
        } catch (error) {
          console.error("Error processing events:", error);
          setLoading(false);
        }
      },
      (error) => {
        console.error("[OrgVolunteers] Events snapshot error:", error);
        setLoading(false);
        Alert.alert("Error", "Failed to load events");
      }
    );
    
    return () => unsub();
  }, [user]);

  // Fetch registrations for selected event
  useEffect(() => {
    if (!selectedEventId) {
      setRegistrations([]);
      return;
    }
    
    setRegLoading(true);
    const q = collection(db, `events/${selectedEventId}/registrations`);
    
    const unsub = onSnapshot(q, 
      (snapshot) => {
        try {
          const regsData: Registration[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            regsData.push({
              id: doc.id,
              userId: data.userId || '',
              email: data.email || 'No email',
              phoneNumber: data.phoneNumber || 'No phone',
              status: data.status || 'pending',
              attended: data.attended || false
            });
          });
          setRegistrations(regsData);
          setRegLoading(false);
        } catch (error) {
          console.error("Error processing registrations:", error);
          setRegLoading(false);
        }
      },
      (error) => {
        console.error("[OrgVolunteers] Registrations snapshot error:", error);
        setRegLoading(false);
        Alert.alert("Error", "Failed to load volunteers");
      }
    );
    
    return () => unsub();
  }, [selectedEventId]);




  // Mark volunteer attendance
  const markAttended = async (regId: string, attended: boolean) => {
    if (!selectedEventId) {
      Alert.alert("Error", "No event selected");
      return;
    }
    
    try {
      const regRef = doc(db, `events/${selectedEventId}/registrations`, regId);
      await updateDoc(regRef, { attended });
      // No need to show alert here as the UI will update automatically via the snapshot listener
    } catch (error) {
      console.error("[OrgVolunteers] Attendance update error:", error);
      Alert.alert("Error", "Failed to update attendance");
    }
  };

  // Handle event selection
  const handleEventPress = (eventId: string) => {
    setSelectedEventId(eventId === selectedEventId ? null : eventId);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-600 mt-4 font-medium">Loading events...</Text>
      </View>
    );
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="w-full h-40 relative"> {/* Adjust height as needed */}
        <ImageBackground
          source={{ uri: "https://i0.wp.com/fromsunrisetosunset.com/wp-content/uploads/2018/11/20180911_151859_1200px-min.jpg?ssl=1" }} // Placeholder image URL
          className="w-full h-full"
          resizeMode="cover"
        >
          {/* Gradient Overlay for Text Readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']} // Adjust colors for desired fade
            className="absolute inset-0 flex-col justify-end p-6" // Covers the whole image, pushes content to bottom
          >
            {/* Top Row: Profile & Notifications */}
            <Row className="justify-end items-center mt-6">
                <Pressable 
                  onPress={() => Alert.alert("Notifications", "No notifications yet.")}
                  className="p-2"
                >
                  <Ionicons name="notifications-outline" size={24} color="#fff" />
                </Pressable>
            </Row>

            {/* Main Title */}
            <Text className="text-3xl font-bold text-white mt-8">manage volunteers</Text>
            {/* Subtitle/Location */}
            <Row className="items-center mt-1">
                <Ionicons name="location-sharp" size={16} color="#fff" />
                <Text className="text-white text-sm ml-1">Hikkaduwa beach, Mount Lavinia</Text>
            </Row>
            
          </LinearGradient>
        </ImageBackground>
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Events List */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-gray-900 mb-4">Your Progressing Events</Text>
          {events.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 items-center">
              <Ionicons name="calendar-outline" size={32} color="#9ca3af" />
              <Text className="text-gray-600 mt-3 font-medium">No events found</Text>
              <Text className="text-gray-500 text-sm text-center mt-1">
                Create an event to start managing volunteers.
              </Text>
            </View>
          ) : (
            events.map((ev) => (
              <EventItem
                key={ev.id}
                event={ev}
                isSelected={ev.id === selectedEventId}
                onPress={() => handleEventPress(ev.id)}
              />
            ))
          )}
        </View>

        {/* Volunteers for Selected Event */}
        {selectedEventId && (
          <View
            className="mb-6"
            onLayout={() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-gray-900">
                Volunteers for {selectedEvent?.title}
              </Text>
              <Text className="text-gray-500 text-sm">
                {registrations.length} volunteer{registrations.length !== 1 ? 's' : ''}
              </Text>
            </View>
            
            {regLoading ? (
              <View className="items-center py-6">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-gray-600 mt-2">Loading volunteers...</Text>
              </View>
            ) : registrations.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 items-center">
                <Ionicons name="people-outline" size={32} color="#9ca3af" />
                <Text className="text-gray-600 mt-3 font-medium">No volunteers yet</Text>
                <Text className="text-gray-500 text-sm text-center mt-1">
                  Volunteers will appear here once they register for this event.
                </Text>
              </View>
            ) : (
              <View>
                {registrations.map((reg) => (
                  <VolunteerItem
                    key={reg.id}
                    registration={reg}
                    onMarkAttended={markAttended}
                  />
                ))}
              </View>
            )}
            
            {selectedEvent && getStatus(selectedEvent) === "In Progress" && (
              <View className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 items-center">
                <Text className="text-lg font-semibold text-gray-900 mb-4">
                  QR Code for Volunteer Check-in
                </Text>
                <QRCode 
                  value={selectedEventId} 
                  size={200} 
                  color="#1f2937" 
                  backgroundColor="#fff" 
                />
                <Text className="text-gray-500 text-sm mt-3 text-center">
                  Volunteers can scan this QR code to check in at the event.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}