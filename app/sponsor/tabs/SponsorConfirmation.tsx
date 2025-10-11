import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from '@/contexts/CurrencyContext';
import { db } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from "expo-router";
import { shareAsync } from 'expo-sharing';
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SponsorshipDoc = {
  id: string;
  eventId: string;
  eventTitle: string;
  sponsorId: string;
  sponsorEmail: string;
  sponsorName: string;
  amount: number;
  sponsorshipType: 'financial' | 'in_kind' | 'both';
  companyName?: string;
  contactEmail: string;
  contactPhone: string;
  message?: string;
  inKindDescription?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: any;
  updatedAt: any;
};

type EventDoc = {
  id: string;
  title: string;
  eventAt?: any;
  location?: { label?: string };
  status?: string;
  wasteCollected?: number;
};

export default function SponsorConfirmation() {
  const { sponsorshipId, eventId, fromReports } = useLocalSearchParams();
  const [sponsorship, setSponsorship] = useState<SponsorshipDoc | null>(null);
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
    const [generatingPDF, setGeneratingPDF] = useState(false);

  // Real-time listener for sponsorship updates
  useEffect(() => {
    if (!sponsorshipId) return;

    const sponsorshipRef = doc(db, "sponsorships", sponsorshipId as string);
    
    const unsubscribe = onSnapshot(sponsorshipRef, (docSnap) => {
      if (docSnap.exists()) {
        const sponsorshipData = {
          id: docSnap.id,
          ...docSnap.data(),
        } as SponsorshipDoc;
        setSponsorship(sponsorshipData);
        setLoading(false);
      } else {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error listening to sponsorship:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sponsorshipId]);

  // Fetch event details
  useEffect(() => {
    if (!eventId) return;

    const eventRef = doc(db, "events", eventId as string);
    
    const unsubscribe = onSnapshot(eventRef, (docSnap) => {
      if (docSnap.exists()) {
        const eventData = {
          id: docSnap.id,
          ...docSnap.data(),
        } as EventDoc;
        setEvent(eventData);
      }
    });

    return () => unsubscribe();
  }, [eventId]);


const generatePDF = async () => {
  if (!sponsorship || !event) return;
  
  setGeneratingPDF(true);
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Sponsorship Confirmation - ${sponsorship.eventTitle}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            color: #333;
            line-height: 1.4;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #14B8A6; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
          }
          .logo { 
            font-size: 24px; 
            font-weight: bold; 
            color: #14B8A6; 
            margin-bottom: 10px;
          }
          .title { 
            font-size: 20px; 
            font-weight: bold; 
            margin-bottom: 5px;
          }
          .subtitle { 
            color: #666; 
            margin-bottom: 20px;
          }
          .section { 
            margin-bottom: 25px; 
          }
          .section-title { 
            font-size: 16px; 
            font-weight: bold; 
            color: #14B8A6; 
            margin-bottom: 10px; 
            border-bottom: 1px solid #eee; 
            padding-bottom: 5px;
          }
          .row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 8px; 
          }
          .label { 
            font-weight: bold; 
            color: #555; 
          }
          .value { 
            color: #333; 
          }
          .status { 
            padding: 5px 10px; 
            border-radius: 15px; 
            font-weight: bold; 
            display: inline-block;
            background-color: ${getStatusBackground(sponsorship.status).replace('#', '')};
            color: ${getStatusColor(sponsorship.status).replace('#', '')};
          }
          .amount { 
            font-size: 18px; 
            font-weight: bold; 
            color: #14B8A6; 
          }
          .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #eee; 
            text-align: center; 
            color: #666; 
            font-size: 12px;
          }
          .message-box {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #14B8A6;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🌱 EcoConnect</div>
          <div class="title">Sponsorship Confirmation</div>
          <div class="subtitle">${sponsorship.eventTitle}</div>
        </div>

        <div class="section">
          <div class="section-title">Event Details</div>
          <div class="row">
            <span class="label">Event:</span>
            <span class="value">${sponsorship.eventTitle}</span>
          </div>
          <div class="row">
            <span class="label">Location:</span>
            <span class="value">${event?.location?.label || 'TBA'}</span>
          </div>
          <div class="row">
            <span class="label">Date:</span>
            <span class="value">${formatDate(event?.eventAt)}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Sponsorship Details</div>
          <div class="row">
            <span class="label">Status:</span>
            <span class="status">${getStatusText(sponsorship.status)}</span>
          </div>
          ${sponsorship.amount > 0 ? `
          <div class="row">
            <span class="label">Amount:</span>
            <span class="value amount">${formatCurrency(sponsorship.amount)}</span>
          </div>
          ` : ''}
          <div class="row">
            <span class="label">Sponsorship Type:</span>
            <span class="value">${getSponsorshipTypeText(sponsorship.sponsorshipType)}</span>
          </div>
          ${sponsorship.companyName ? `
          <div class="row">
            <span class="label">Company:</span>
            <span class="value">${sponsorship.companyName}</span>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">Contact Information</div>
          <div class="row">
            <span class="label">Email:</span>
            <span class="value">${sponsorship.contactEmail}</span>
          </div>
          <div class="row">
            <span class="label">Phone:</span>
            <span class="value">${sponsorship.contactPhone}</span>
          </div>
        </div>

        ${sponsorship.inKindDescription ? `
        <div class="section">
          <div class="section-title">In-Kind Contribution</div>
          <div class="message-box">${sponsorship.inKindDescription}</div>
        </div>
        ` : ''}

        ${sponsorship.message ? `
        <div class="section">
          <div class="section-title">Message to Organizer</div>
          <div class="message-box">${sponsorship.message}</div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Timeline</div>
          <div class="row">
            <span class="label">Submitted:</span>
            <span class="value">${formatDate(sponsorship.createdAt)}</span>
          </div>
          <div class="row">
            <span class="label">Last Updated:</span>
            <span class="value">${formatDate(sponsorship.updatedAt)}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Reference</div>
          <div class="row">
            <span class="label">Reference ID:</span>
            <span class="value">#${sponsorship.id.substring(0, 8).toUpperCase()}</span>
          </div>
        </div>

        <div class="footer">
          Generated on ${new Date().toLocaleDateString()} • EcoConnect Sponsorship Platform
          <br>Thank you for supporting environmental initiatives!
        </div>
      </body>
      </html>
    `;

    if (Platform.OS === 'web') {
      // Web PDF generation
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      }
    } else {
      // Mobile PDF generation with Expo
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 612,
        height: 792,
        margins: {
          left: 36,
          top: 36,
          right: 36,
          bottom: 36,
        },
      });
      
      // Share the PDF file
      await shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save Sponsorship Confirmation',
      });
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    Alert.alert('Error', 'Failed to generate PDF. Please try again.');
  } finally {
    setGeneratingPDF(false);
  }
};
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "TBA";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "TBA";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "approved":
        return "#10B981";
      case "ongoing":
        return "#3B82F6";
      case "pending":
        return "#F59E0B";
      case "rejected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusBackground = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "approved":
        return "#DCFCE7";
      case "ongoing":
        return "#DBEAFE";
      case "pending":
        return "#FEF3C7";
      case "rejected":
        return "#FEE2E2";
      default:
        return "#F3F4F6";
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "Under Review";
      case "approved":
        return "Approved ✅";
      case "rejected":
        return "Rejected ❌";
      case "completed":
        return "Completed 🎉";
      default:
        return status || "Pending";
    }
  };

  const getSponsorshipTypeText = (type: string) => {
    switch (type) {
      case 'financial': return 'Financial Sponsorship';
      case 'in_kind': return 'In-Kind Sponsorship';
      case 'both': return 'Combined Sponsorship';
      default: return 'Sponsorship';
    }
  };

  const getSponsorshipTypeDescription = (type: string) => {
    switch (type) {
      case 'financial': 
        return 'Monetary contribution to support the event';
      case 'in_kind': 
        return 'Providing goods, services, or resources';
      case 'both': 
        return 'Combination of financial and in-kind support';
      default: return 'Event sponsorship';
    }
  };

  const handleViewDashboard = () => {
    router.push("/sponsor/tabs/sponsorDashboard");
  };

  const handleViewMySponsorships = () => {
    router.push("/sponsor/tabs/sponsorReports");
  };

  const handleBack = () => {
    if (fromReports === "true" || router.canGoBack()) {
      router.back();
    } else {
      router.push("/sponsor/tabs/sponsorDashboard");
    }
  };

  if (loading || !sponsorship) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <StatusBar barStyle="light-content" backgroundColor="#14B8A6" />
        <Text className="text-gray-600 font-medium text-base">
          Loading sponsorship details...
        </Text>
      </View>
    );
  }

  const statusColor = getStatusColor(sponsorship.status);
  const statusBackground = getStatusBackground(sponsorship.status);

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#14B8A6" />
      
      {/* Fixed Header */}
<View 
  className="bg-teal-500 pt-4 px-4"
  style={{ paddingTop: insets.top + 16 }}
>
  <View className="flex-row items-center justify-between pb-4">
    <Pressable
      onPress={handleBack}
      className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
    >
      <Ionicons name="chevron-back" size={24} color="white" />
    </Pressable>
    
    <View className="flex-1 items-center">
      <Text className="text-l font-bold text-white">Sponsorship Details</Text>
    </View>
    
    {/* Download Button - Moved inside the flex container */}
    <Pressable
      onPress={generatePDF}
      disabled={generatingPDF}
      className="w-10 h-10 items-center justify-center rounded-full bg-white/20"
    >
      <Ionicons 
        name="download" 
        size={20} 
        color={generatingPDF ? "#cccccc" : "white"} 
      />
    </Pressable>
  </View>
</View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-6 pb-8">
          {/* Success Header */}
          <View className="items-center mb-8">
            <View className="bg-green-100 rounded-full p-6 mb-4">
              <Ionicons 
                name={
                  sponsorship.status === 'approved' ? "checkmark-circle" :
                  sponsorship.status === 'rejected' ? "close-circle" :
                  "time"
                } 
                size={80} 
                color={statusColor} 
              />
            </View>
            
            <Text className="text-3xl font-bold text-gray-900 text-center mb-2">
              {sponsorship.status === 'approved' ? 'Sponsorship Approved!' :
               sponsorship.status === 'rejected' ? 'Sponsorship Rejected' :
               'Thank You!'}
            </Text>
            
            <Text className="text-gray-600 text-lg text-center">
              {sponsorship.status === 'approved' ? 'Your sponsorship has been approved by the event organizer.' :
               sponsorship.status === 'rejected' ? 'Unfortunately, your sponsorship was not approved.' :
               'Your sponsorship request has been submitted and is under review.'}
            </Text>
          </View>

          {/* Event Card */}
          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-200">
            <View className="flex-row items-center mb-3">
              <Ionicons name="calendar" size={20} color="#14B8A6" />
              <Text className="text-gray-900 font-semibold text-lg ml-2">Event Details</Text>
            </View>
            <Text className="text-xl font-bold text-teal-700 mb-2">
              {sponsorship.eventTitle}
            </Text>
            {event?.location?.label && (
              <View className="flex-row items-center mb-1">
                <Ionicons name="location" size={16} color="#6B7280" />
                <Text className="text-gray-600 text-sm ml-2">
                  {event.location.label}
                </Text>
              </View>
            )}
            {event?.eventAt && (
              <View className="flex-row items-center">
                <Ionicons name="time" size={16} color="#6B7280" />
                <Text className="text-gray-600 text-sm ml-2">
                  {formatDate(event.eventAt)}
                </Text>
              </View>
            )}
          </View>

          {/* Sponsorship Details Card */}
          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-200">
            <View className="flex-row items-center mb-4">
              <Ionicons name="receipt" size={24} color="#14B8A6" />
              <Text className="text-gray-900 font-semibold text-lg ml-2">
                Sponsorship Details
              </Text>
            </View>
            
            <View className="space-y-4">
              {/* Status - Highlighted */}
              <View className="flex-row justify-between items-center p-3 rounded-lg bg-gray-50">
                <Text className="text-gray-700 font-medium">Status</Text>
                <View className="px-3 py-2 rounded-full" style={{ backgroundColor: statusBackground }}>
                  <Text className="font-semibold" style={{ color: statusColor }}>
                    {getStatusText(sponsorship.status)}
                  </Text>
                </View>
              </View>

              {/* Amount */}
              {sponsorship.amount > 0 && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Amount</Text>
                  <Text className="text-2xl font-bold text-teal-600">
                    {formatCurrency(sponsorship.amount)}
                  </Text>
                </View>
              )}

              {/* Sponsorship Type */}
              <View className="flex-row justify-between items-start">
                <Text className="text-gray-600">Sponsorship Type</Text>
                <View className="flex-1 ml-4">
                  <Text className="text-gray-900 font-medium text-right">
                    {getSponsorshipTypeText(sponsorship.sponsorshipType)}
                  </Text>
                  <Text className="text-gray-500 text-sm text-right mt-1">
                    {getSponsorshipTypeDescription(sponsorship.sponsorshipType)}
                  </Text>
                </View>
              </View>

              {/* Company Name */}
              {sponsorship.companyName && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Company/Organization</Text>
                  <Text className="text-gray-900 font-medium">{sponsorship.companyName}</Text>
                </View>
              )}

              {/* Contact Information */}
              <View className="border-t border-gray-200 pt-4">
                <Text className="text-gray-700 font-medium mb-2">Contact Information</Text>
                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Email</Text>
                    <Text className="text-gray-900">{sponsorship.contactEmail}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Phone</Text>
                    <Text className="text-gray-900">{sponsorship.contactPhone}</Text>
                  </View>
                </View>
              </View>

              {/* In-Kind Description */}
              {sponsorship.inKindDescription && (
                <View className="border-t border-gray-200 pt-4">
                  <Text className="text-gray-700 font-medium mb-2">In-Kind Contribution</Text>
                  <Text className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                    {sponsorship.inKindDescription}
                  </Text>
                </View>
              )}

              {/* Message */}
              {sponsorship.message && (
                <View className="border-t border-gray-200 pt-4">
                  <Text className="text-gray-700 font-medium mb-2">Your Message</Text>
                  <Text className="text-gray-600 text-sm bg-blue-50 p-3 rounded-lg">
                    {sponsorship.message}
                  </Text>
                </View>
              )}

              {/* Dates */}
              <View className="border-t border-gray-200 pt-4 space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Submitted</Text>
                  <Text className="text-gray-900">{formatDate(sponsorship.createdAt)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Last Updated</Text>
                  <Text className="text-gray-900">{formatDate(sponsorship.updatedAt)}</Text>
                </View>
              </View>

              {/* Reference ID */}
              <View className="border-t border-gray-200 pt-4">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Reference ID</Text>
                  <Text className="text-gray-900 font-mono text-sm">
                    #{sponsorship.id.substring(0, 8).toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Next Steps Based on Status */}
          <View className="bg-blue-50 rounded-2xl p-5 mb-6 border border-blue-200">
            <View className="flex-row items-center mb-4">
              <Ionicons name="information-circle" size={24} color="#2563EB" />
              <Text className="text-blue-900 font-bold text-lg ml-2">
                {sponsorship.status === 'approved' ? 'Next Steps' :
                 sponsorship.status === 'rejected' ? 'What Happens Next?' :
                 'What to Expect'}
              </Text>
            </View>
            
            {sponsorship.status === 'approved' ? (
              <View className="space-y-3">
                <View className="flex-row items-start">
                  <Ionicons name="checkmark-circle" size={20} color="#059669" className="mt-0.5 mr-3" />
                  <Text className="text-blue-800 flex-1">
                    Your sponsorship has been approved! The event organizer may contact you for further coordination.
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Ionicons name="calendar" size={20} color="#2563EB" className="mt-0.5 mr-3" />
                  <Text className="text-blue-800 flex-1">
                    You will receive updates about the event and your sponsorship impact.
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Ionicons name="document-text" size={20} color="#7C3AED" className="mt-0.5 mr-3" />
                  <Text className="text-blue-800 flex-1">
                    Look out for impact reports after the event completion.
                  </Text>
                </View>
              </View>
            ) : sponsorship.status === 'rejected' ? (
              <View className="space-y-3">
                <View className="flex-row items-start">
                  <Ionicons name="close-circle" size={20} color="#DC2626" className="mt-0.5 mr-3" />
                  <Text className="text-blue-800 flex-1">
                    Unfortunately, your sponsorship request was not approved for this event.
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Ionicons name="search" size={20} color="#2563EB" className="mt-0.5 mr-3" />
                  <Text className="text-blue-800 flex-1">
                    You can explore other events that need sponsorship support.
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Ionicons name="mail" size={20} color="#7C3AED" className="mt-0.5 mr-3" />
                  <Text className="text-blue-800 flex-1">
                    The event organizer may contact you with more information.
                  </Text>
                </View>
              </View>
            ) : (
              <View className="space-y-3">
                <View className="flex-row items-start">
                  <Ionicons name="time" size={20} color="#D97706" className="mt-0.5 mr-3" />
                  <Text className="text-blue-800 flex-1">
                    The event organizer will review your request within 2-3 business days.
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Ionicons name="mail" size={20} color="#2563EB" className="mt-0.5 mr-3" />
                  <Text className="text-blue-800 flex-1">
                    You will be notified via email when your sponsorship is approved or if more information is needed.
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Ionicons name="refresh" size={20} color="#7C3AED" className="mt-0.5 mr-3" />
                  <Text className="text-blue-800 flex-1">
                    This page will update automatically when your sponsorship status changes.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
<View className="space-y-3">
  {/* Add Download Button here too */}
  <Pressable
    onPress={generatePDF}
    disabled={generatingPDF}
    className="bg-white border border-teal-300 rounded-xl py-4 items-center shadow-sm flex-row justify-center"
  >
    <Ionicons 
      name="download" 
      size={20} 
      color={generatingPDF ? "#cccccc" : "#14B8A6"} 
      style={{ marginRight: 8 }}
    />
    <Text className={`font-semibold text-lg ${generatingPDF ? 'text-gray-400' : 'text-teal-700'}`}>
      {generatingPDF ? 'Generating PDF...' : 'Download as PDF'}
    </Text>
  </Pressable>

  <Pressable
    onPress={handleViewMySponsorships}
    className="bg-teal-500 rounded-xl py-4 items-center shadow-lg"
  >
    <Text className="text-white font-bold text-lg">View All My Sponsorships</Text>
  </Pressable>
  
  <Pressable
    onPress={handleViewDashboard}
    className="bg-white border border-teal-300 rounded-xl py-4 items-center shadow-sm"
  >
    <Text className="text-teal-700 font-semibold text-lg">Back to Dashboard</Text>
  </Pressable>
</View>
        </View>
      </ScrollView>
    </View>
  );
}