import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from '@/contexts/CurrencyContext';
import { db } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

type EventDoc = {
  id: string;
  title: string;
  description: string;
  eventAt?: any;
  location?: { label?: string; address?: string; coordinates?: any };
  sponsorshipRequired?: boolean;
  fundingGoal?: number;
  currentFunding?: number;
  image?: string;
  goal?: string;
  organizer?: string;
  organizerId?: string;
  contactEmail?: string;
  contactPhone?: string;
  maxVolunteers?: number;
  currentVolunteers?: number;
  volunteersNeeded?: number;
  category?: string;
  status?: string;
  createdAt?: any;
  completedAt?: any;
  updatedAt?: any;
  sponsorCount?: number;
  requirements?: string[];
  resourcesNeeded?: string;
  platform?: string;
};

// Helper functions
function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  try {
    if (ts.toDate && typeof ts.toDate === 'function') {
      return ts.toDate();
    }
    if (typeof ts === 'string') {
      return new Date(ts);
    }
    return null;
  } catch {
    return null;
  }
}

function formatDate(d?: Date | null): string {
  if (!d) return "TBA";
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(d?: Date | null): string {
  if (!d) return "TBA";
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/*function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}*/

function calculateDaysLeft(eventDate?: Date | null): string {
  if (!eventDate) return "TBA";
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(eventDate);
  eventDay.setHours(0, 0, 0, 0);
  
  const diffTime = eventDay.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1) return `${diffDays} days left`;
  if (diffDays === -1) return "Yesterday";
  if (diffDays < -1) return "Event completed";
  
  return "Scheduled";
}

function canSponsorEvent(event: EventDoc): boolean {
  // Check if event requires sponsorship
  if (!event.sponsorshipRequired) return false;
  
  // Normalize status (handle case differences)
  const normalizedStatus = event.status?.toLowerCase();
  
  // Check event status
  if (normalizedStatus === 'completed' || normalizedStatus === 'cancelled') return false;
  
  // Check if event date is in the future
  const eventDate = tsToDate(event.eventAt);
  if (eventDate && eventDate < new Date()) return false;
  
  return true;
}

function getEventStatus(event: EventDoc): string {
  const normalizedStatus = event.status?.toLowerCase();
  const eventDate = tsToDate(event.eventAt);
  const now = new Date();
  
  // If status is explicitly set, use it
  if (normalizedStatus && normalizedStatus !== 'upcoming') {
    return normalizedStatus;
  }
  
  // Determine status based on dates
  if (eventDate) {
    if (eventDate < now) return 'completed';
    return 'upcoming';
  }
  
  return normalizedStatus || 'upcoming';
}

// Progress Bar Component
function ProgressBar({ percentage, color = "#14B8A6", height = 8 }: any) {
  return (
    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <View 
        className="h-full rounded-full" 
        style={{ 
          width: `${Math.min(percentage, 100)}%`,
          backgroundColor: color,
          height: height,
        }}
      />
    </View>
  );
}

// Info Row Component
function InfoRow({ icon, label, value, color = "#6B7280" }: any) {
  return (
    <View className="flex-row items-start mb-4">
      <View className="w-6 items-center mt-0.5">
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-gray-600 text-sm font-medium mb-1">{label}</Text>
        <Text className="text-gray-900 text-base">{value || "Not specified"}</Text>
      </View>
    </View>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
      case 'upcoming':
        return { color: 'bg-blue-100', text: 'text-blue-800', label: 'Upcoming' };
      case 'ongoing':
        return { color: 'bg-green-100', text: 'text-green-800', label: 'Ongoing' };
      case 'completed':
        return { color: 'bg-gray-100', text: 'text-gray-800', label: 'Completed' };
      case 'cancelled':
        return { color: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' };
      default:
        return { color: 'bg-gray-100', text: 'text-gray-800', label: 'Upcoming' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <View className={`${config.color} px-3 py-1.5 rounded-full`}>
      <Text className={`${config.text} text-xs font-semibold`}>
        {config.label}
      </Text>
    </View>
  );
}

// Sponsorship Status Component
function SponsorshipStatus({ event }: { event: EventDoc }) {
  const eventStatus = getEventStatus(event);
  
  if (!event.sponsorshipRequired) {
    return (
      <View className="bg-gray-100 rounded-xl p-4 mb-6">
        <View className="flex-row items-center">
          <Ionicons name="business-outline" size={20} color="#6B7280" />
          <Text className="text-gray-700 font-medium ml-2">
            This event does not require sponsorship
          </Text>
        </View>
      </View>
    );
  }

  if (!canSponsorEvent(event)) {
    const eventDate = tsToDate(event.eventAt);
    const isPastEvent = eventDate && eventDate < new Date();
    
    let message = "Sponsorship not available";
    if (eventStatus === 'completed') {
      message = "This event has been completed";
    } else if (eventStatus === 'cancelled') {
      message = "This event has been cancelled";
    } else if (isPastEvent) {
      message = "This event has already occurred";
    }

    return (
      <View className="bg-gray-100 rounded-xl p-4 mb-6">
        <View className="flex-row items-center">
          <Ionicons name="lock-closed" size={20} color="#6B7280" />
          <Text className="text-gray-700 font-medium ml-2">{message}</Text>
        </View>
      </View>
    );
  }

  return null;
}

export default function EventDetails() {
  const { eventId } = useLocalSearchParams();
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();


  useEffect(() => {
    if (!eventId) {
      setError("No event ID provided");
      setLoading(false);
      return;
    }

    const eventDocRef = doc(db, "events", eventId as string);
    
    const unsubscribe = onSnapshot(
      eventDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setEvent({
            id: docSnap.id,
            ...docSnap.data(),
          } as EventDoc);
          setError(null);
        } else {
          setError("Event not found");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching event:", err);
        setError("Failed to load event details");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  const handleSponsorEvent = () => {
    if (!user) {
      Alert.alert(
        "Authentication Required",
        "Please sign in to sponsor this event.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/auth/signup") }
        ]
      );
      return;
    }

    if (!event || !canSponsorEvent(event)) {
      Alert.alert(
        "Cannot Sponsor",
        "This event is no longer accepting sponsorships."
      );
      return;
    }

    // Navigate to sponsor form page
    router.push({
      pathname: "/sponsor/tabs/SponsorForm",
      params: { 
        eventId: event.id, 
        eventTitle: event.title,
        fundingGoal: event.fundingGoal?.toString(),
        currentFunding: event.currentFunding?.toString()
      }
    });
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/sponsor/tabs/sponsorDashboard");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text className="text-gray-600 font-medium mt-4 text-base">
          Loading event details...
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
          The event you are looking for doesnot exist or may have been removed.
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

  const eventDate = tsToDate(event.eventAt);
  const funding = event.currentFunding || 0;
  const goal = event.fundingGoal || 1;
  const progress = (funding / goal) * 100;
  const sponsorCount = event.sponsorCount || 0;
  const daysLeft = calculateDaysLeft(eventDate);
  const eventStatus = getEventStatus(event);
  const canSponsor = canSponsorEvent(event);

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
          
          <StatusBadge status={eventStatus} />
          
          <View className="w-10" />
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Event Image */}
        {event.image ? (
          <Image
            source={{ uri: event.image }}
            className="w-full h-64"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-64 bg-teal-100 items-center justify-center">
            <Ionicons name="calendar" size={64} color="#14B8A6" />
            <Text className="text-teal-700 font-medium mt-2">Event Image</Text>
          </View>
        )}

        {/* Content */}
        <View className="px-4 pt-6 pb-8">
          {/* Title and Description */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              {event.title}
            </Text>
            <Text className="text-gray-600 text-base leading-6">
              {event.description || "No description available for this event."}
            </Text>
          </View>

          {/* Sponsorship Status */}
          <SponsorshipStatus event={event} />

          {/* Days Left Badge - Only show for upcoming events */}
          {eventStatus === 'upcoming' && (
            <View className="bg-blue-50 rounded-xl p-4 mb-6">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-blue-800 font-semibold text-lg">
                    {daysLeft}
                  </Text>
                  <Text className="text-blue-600 text-sm">
                    {eventDate ? formatDate(eventDate) : "Date to be announced"}
                  </Text>
                </View>
                <Ionicons name="time" size={24} color="#1D4ED8" />
              </View>
            </View>
          )}

          {/* Completed Event Badge */}
          {eventStatus === 'completed' && (
            <View className="bg-gray-100 rounded-xl p-4 mb-6">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-gray-800 font-semibold text-lg">
                    Event Completed
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    {eventDate ? `Held on ${formatDate(eventDate)}` : "Event has been completed"}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color="#6B7280" />
              </View>
            </View>
          )}

          {/* Funding Progress */}
          {event.sponsorshipRequired && (
            <View className="bg-white rounded-xl p-5 mb-6 shadow-sm border border-gray-200">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-gray-900 font-semibold text-lg">
                  Funding Progress
                </Text>
                <Text className="text-gray-700 font-bold">
                  {Math.round(progress)}%
                </Text>
              </View>
              
              <ProgressBar percentage={progress} height={10} />
              
              <View className="flex-row justify-between mt-2">
                <Text className="text-gray-600 text-sm">
                  {formatCurrency(funding)} raised
                </Text>
                <Text className="text-gray-600 text-sm">
                  Goal: {formatCurrency(goal)}
                </Text>
              </View>
              
              <View className="flex-row items-center mt-3">
                <Ionicons name="people" size={16} color="#6B7280" />
                <Text className="text-gray-600 text-sm ml-2">
                  {sponsorCount} sponsor{sponsorCount !== 1 ? 's' : ''} supporting
                </Text>
              </View>
            </View>
          )}

          {/* Event Details */}
          <View className="bg-white rounded-xl p-5 mb-6 shadow-sm border border-gray-200">
            <Text className="text-gray-900 font-semibold text-lg mb-4">
              Event Details
            </Text>
            
            <InfoRow
              icon="calendar"
              label="Date & Time"
              value={eventDate ? `${formatDate(eventDate)} at ${formatTime(eventDate)}` : "TBA"}
            />
            
            <InfoRow
              icon="location"
              label="Location"
              value={event.location?.label || event.location?.address}
            />
            
            {event.category && (
              <InfoRow
                icon="pricetag"
                label="Category"
                value={event.category}
              />
            )}
            
            {event.goal && (
              <InfoRow
                icon="flag"
                label="Event Goal"
                value={event.goal}
              />
            )}
            
            {(event.maxVolunteers || event.volunteersNeeded) && (
              <InfoRow
                icon="people"
                label="Volunteer Capacity"
                value={`${event.currentVolunteers || 0} / ${event.maxVolunteers || event.volunteersNeeded} volunteers`}
              />
            )}

            {event.resourcesNeeded && (
              <InfoRow
                icon="construct"
                label="Resources Needed"
                value={event.resourcesNeeded}
              />
            )}
          </View>

          {/* Organizer Info */}
          {(event.organizer || event.contactEmail || event.contactPhone) && (
            <View className="bg-white rounded-xl p-5 mb-6 shadow-sm border border-gray-200">
              <Text className="text-gray-900 font-semibold text-lg mb-4">
                Organizer Information
              </Text>
              
              {event.organizer && (
                <InfoRow
                  icon="business"
                  label="Organizer"
                  value={event.organizer}
                />
              )}
              
              {event.contactEmail && (
                <InfoRow
                  icon="mail"
                  label="Contact Email"
                  value={event.contactEmail}
                />
              )}
              
              {event.contactPhone && (
                <InfoRow
                  icon="call"
                  label="Contact Phone"
                  value={event.contactPhone}
                />
              )}
            </View>
          )}

          {/* Requirements */}
          {event.requirements && event.requirements.length > 0 && (
            <View className="bg-white rounded-xl p-5 mb-6 shadow-sm border border-gray-200">
              <Text className="text-gray-900 font-semibold text-lg mb-4">
                Requirements
              </Text>
              {event.requirements.map((requirement, index) => (
                <View key={index} className="flex-row items-start mb-2">
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" className="mt-0.5" />
                  <Text className="text-gray-700 text-base ml-2 flex-1">
                    {requirement}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sponsor Button - Only show if event can be sponsored */}
      {canSponsor && (
        <View className="px-4 pb-4 pt-3 bg-white border-t border-gray-200" style={{ paddingBottom: insets.bottom + 16 }}>
          <Pressable
            onPress={handleSponsorEvent}
            className="bg-teal-500 rounded-xl py-4 items-center shadow-lg"
            style={{
              shadowColor: "#14B8A6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Text className="text-white font-bold text-lg">
              Sponsor This Event
            </Text>
            <Text className="text-teal-100 text-sm mt-1">
              Support this beach cleanup initiative
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}