import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useExchangeRate } from '@/hooks/useExchangeRate';

type Currency = 'BRL' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  symbol: string;
  formatCurrency: (value: number) => string;
  formatBalance: (balanceInBRL: number) => string;
  convertBalance: (balanceInBRL: number) => number;
  convertToBase: (amountInUserCurrency: number) => number;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number;
  isLoadingRate: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrencyContext = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrencyContext must be used within CurrencyProvider');
  }
  return context;
};

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider = ({ children }: CurrencyProviderProps) => {
  const { rate, isLoading: isLoadingRate, convertBRLtoUSD, convertUSDtoBRL } = useExchangeRate();
  
  const [currency, setCurrencyState] = useState<Currency>(() => {
    // Verificar se há preferência manual salva
    const stored = localStorage.getItem('app_currency');
    if (stored) return stored as Currency;
    
    // Detectar moeda baseado no idioma selecionado
    // Português = BRL, qualquer outro idioma = USD
    const language = localStorage.getItem('app_language') || 
                     navigator.language.split('-')[0] || 
                     'en';
    
    return language === 'pt' ? 'BRL' : 'USD';
  });

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('app_currency', newCurrency);
  };

  const symbol = currency === 'BRL' ? 'R$' : '$';

  // Converte um valor em BRL para a moeda selecionada (para exibição)
  const convertBalance = useCallback((balanceInBRL: number): number => {
    if (currency === 'BRL') {
      return balanceInBRL;
    }
    // Converter BRL para USD usando a cotação atual
    return convertBRLtoUSD(balanceInBRL);
  }, [currency, convertBRLtoUSD]);

  // Converte um valor da moeda do usuário para BRL (base do sistema)
  const convertToBase = useCallback((amountInUserCurrency: number): number => {
    if (currency === 'BRL') {
      return amountInUserCurrency;
    }
    // Converter USD para BRL
    return convertUSDtoBRL(amountInUserCurrency);
  }, [currency, convertUSDtoBRL]);

  // Formata um valor genérico na moeda selecionada
  const formatCurrency = useCallback((value: number): string => {
    if (currency === 'BRL') {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `$ ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }, [currency]);

  // Formata um saldo (converte de BRL e formata)
  const formatBalance = useCallback((balanceInBRL: number): string => {
    const convertedValue = convertBalance(balanceInBRL);
    return formatCurrency(convertedValue);
  }, [convertBalance, formatCurrency]);

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      symbol, 
      formatCurrency, 
      formatBalance,
      convertBalance,
      convertToBase,
      setCurrency,
      exchangeRate: rate,
      isLoadingRate
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};
