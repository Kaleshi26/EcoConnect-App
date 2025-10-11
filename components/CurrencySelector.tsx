// components/CurrencySelector.tsx
import { Currency, useCurrency } from '@/contexts/CurrencyContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

const currencies: { code: Currency; name: string; symbol: string }[] = [
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
];

export default function CurrencySelector() {
  const { currency, setCurrency, formatCurrency } = useCurrency();

  return (
    <View className="bg-white rounded-2xl p-4 border border-gray-200">
      <Text className="text-lg font-semibold text-teal-700 mb-3">Currency</Text>
      <View className="space-y-2">
        {currencies.map((curr) => (
          <Pressable
            key={curr.code}
            onPress={() => setCurrency(curr.code)}
            className={`flex-row items-center justify-between p-3 rounded-xl border ${
              currency === curr.code
                ? 'bg-teal-50 border-teal-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-teal-100 rounded-full items-center justify-center mr-3">
                <Text className="text-teal-700 font-bold text-sm">{curr.symbol}</Text>
              </View>
              <View>
                <Text className="text-gray-900 font-medium">{curr.name}</Text>
                <Text className="text-gray-500 text-sm">{curr.code}</Text>
              </View>
            </View>
            
            {currency === curr.code && (
              <Ionicons name="checkmark-circle" size={24} color="#14B8A6" />
            )}
          </Pressable>
        ))}
      </View>
      
      
    </View>
  );
}