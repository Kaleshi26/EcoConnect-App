// contexts/CurrencyContext.tsx
import React, { createContext, ReactNode, useContext, useState } from 'react';

export type Currency = 'LKR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertAmount: (amount: number, fromCurrency?: Currency) => number;
  formatCurrency: (amount: number, customCurrency?: Currency) => string;
  exchangeRates: Record<Currency, number>;
}

const exchangeRates: Record<Currency, number> = {
  LKR: 1,
  USD: 0.0031, // 1 LKR = 0.0031 USD
  EUR: 0.0028, // 1 LKR = 0.0028 EUR
  GBP: 0.0024, // 1 LKR = 0.0024 GBP
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('LKR');

  const convertAmount = (amount: number, fromCurrency: Currency = 'LKR'): number => {
    // Convert from source currency to LKR first, then to target currency
    const amountInLKR = fromCurrency === 'LKR' ? amount : amount / exchangeRates[fromCurrency];
    return amountInLKR * exchangeRates[currency];
  };

  const formatCurrency = (amount: number, customCurrency?: Currency): string => {
    const targetCurrency = customCurrency || currency;
    const convertedAmount = customCurrency ? amount : convertAmount(amount);
    
    const formatters: Record<Currency, Intl.NumberFormat> = {
      LKR: new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
      USD: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
      EUR: new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
      GBP: new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    };

    return formatters[targetCurrency].format(convertedAmount);
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      convertAmount,
      formatCurrency,
      exchangeRates,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}