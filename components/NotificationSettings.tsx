import { useNotifications } from '@/contexts/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

export default function NotificationSettings() {
  const { settings, updateSettings } = useNotifications();

  const toggleSetting = (key: keyof typeof settings) => {
    updateSettings({ [key]: !settings[key] });
  };

  const updateFrequency = (frequency: 'instant' | 'daily' | 'weekly') => {
    updateSettings({ notificationFrequency: frequency });
  };

  const NotificationItem = ({ 
    icon, 
    title, 
    description, 
    value, 
    onToggle 
  }: {
    icon: string;
    title: string;
    description: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <View className="flex-row items-center justify-between py-4 border-b border-gray-200">
      <View className="flex-row items-center flex-1">
        <Ionicons name={icon as any} size={24} color="#14B8A6" className="mr-3" />
        <View className="flex-1">
          <Text className="text-gray-900 font-medium text-base">{title}</Text>
          <Text className="text-gray-500 text-sm mt-1">{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#f3f4f6', true: '#a7f3d0' }}
        thumbColor={value ? '#10b981' : '#9ca3af'}
      />
    </View>
  );

  const FrequencyOption = ({ 
    value, 
    label, 
    description, 
    isSelected 
  }: {
    value: 'instant' | 'daily' | 'weekly';
    label: string;
    description: string;
    isSelected: boolean;
  }) => (
    <Pressable
      onPress={() => updateFrequency(value)}
      className={`flex-row items-center p-4 border rounded-xl mb-3 ${
        isSelected ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-200'
      }`}
    >
      <View
        className={`w-5 h-5 rounded-full border-2 mr-3 ${
          isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
        }`}
      >
        {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
      </View>
      <View className="flex-1">
        <Text className="text-gray-900 font-medium">{label}</Text>
        <Text className="text-gray-500 text-sm mt-1">{description}</Text>
      </View>
    </Pressable>
  );

  return (
    <View className="bg-white rounded-2xl p-6 mt-4 mx-4 shadow-sm border border-gray-200">
      <Text className="text-xl font-bold text-teal-700 mb-6">Notification Settings</Text>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Email Notifications Section */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4">
            <Ionicons name="mail" size={20} color="#14B8A6" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Email Notifications</Text>
          </View>
          
          <NotificationItem
            icon="business"
            title="Sponsorship Updates"
            description="Get notified when your sponsorship status changes"
            value={settings.emailSponsorshipUpdates}
            onToggle={() => toggleSetting('emailSponsorshipUpdates')}
          />
          
          <NotificationItem
            icon="calendar"
            title="New Event Invites"
            description="Receive invitations for new sponsorship opportunities"
            value={settings.emailEventInvites}
            onToggle={() => toggleSetting('emailEventInvites')}
          />
          
          <NotificationItem
            icon="analytics"
            title="Impact Reports"
            description="Monthly reports on your environmental impact"
            value={settings.emailImpactReports}
            onToggle={() => toggleSetting('emailImpactReports')}
          />
          
          <NotificationItem
            icon="card"
            title="Payment Reminders"
            description="Reminders for upcoming sponsorship payments"
            value={settings.emailPaymentReminders}
            onToggle={() => toggleSetting('emailPaymentReminders')}
          />
          
          <NotificationItem
            icon="megaphone"
            title="Newsletter"
            description="Monthly newsletter with platform updates and tips"
            value={settings.emailNewsletter}
            onToggle={() => toggleSetting('emailNewsletter')}
          />
        </View>

        {/* Push Notifications Section */}
        <View className="mb-8">
          <View className="flex-row items-center mb-4">
            <Ionicons name="notifications" size={20} color="#14B8A6" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Push Notifications</Text>
          </View>
          
          <NotificationItem
            icon="checkmark-circle"
            title="Sponsorship Status"
            description="Real-time updates on sponsorship approvals"
            value={settings.pushSponsorshipStatus}
            onToggle={() => toggleSetting('pushSponsorshipStatus')}
          />
          
          <NotificationItem
            icon="add-circle"
            title="New Events"
            description="Get alerted about new sponsorship opportunities"
            value={settings.pushNewEvents}
            onToggle={() => toggleSetting('pushNewEvents')}
          />
          
          <NotificationItem
            icon="time"
            title="Event Reminders"
            description="Reminders for events you're sponsoring"
            value={settings.pushEventReminders}
            onToggle={() => toggleSetting('pushEventReminders')}
          />
          
          <NotificationItem
            icon="wallet"
            title="Payment Reminders"
            description="Push notifications for payment deadlines"
            value={settings.pushPaymentReminders}
            onToggle={() => toggleSetting('pushPaymentReminders')}
          />
        </View>

        {/* Notification Frequency */}
        <View className="mb-6">
          <View className="flex-row items-center mb-4">
            <Ionicons name="time-outline" size={20} color="#14B8A6" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Notification Frequency</Text>
          </View>
          
          <FrequencyOption
            value="instant"
            label="Instant"
            description="Receive notifications immediately"
            isSelected={settings.notificationFrequency === 'instant'}
          />
          
          <FrequencyOption
            value="daily"
            label="Daily Digest"
            description="Receive one summary email per day"
            isSelected={settings.notificationFrequency === 'daily'}
          />
          
          <FrequencyOption
            value="weekly"
            label="Weekly Summary"
            description="Receive one summary email per week"
            isSelected={settings.notificationFrequency === 'weekly'}
          />
        </View>

        {/* Current Settings Summary */}
        <View className="bg-teal-50 rounded-xl p-4 border border-teal-200">
          <Text className="text-teal-700 font-medium text-center">
            {settings.notificationFrequency === 'instant' 
              ? 'You will receive notifications instantly' 
              : settings.notificationFrequency === 'daily'
              ? 'You will receive daily notification digests'
              : 'You will receive weekly notification summaries'
            }
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}