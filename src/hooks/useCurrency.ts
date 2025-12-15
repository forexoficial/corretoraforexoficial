import { useCurrencyContext } from '@/contexts/CurrencyContext';

export const useCurrency = () => {
  const { 
    currency, 
    symbol, 
    formatCurrency, 
    formatBalance,
    convertBalance,
    convertToBase,
    setCurrency,
    exchangeRate,
    isLoadingRate
  } = useCurrencyContext();

  return { 
    currency, 
    symbol, 
    formatCurrency, 
    formatBalance,
    convertBalance,
    convertToBase,
    setCurrency,
    exchangeRate,
    isLoadingRate
  };
};
