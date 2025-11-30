import { useCurrencyContext } from '@/contexts/CurrencyContext';

export const useCurrency = () => {
  const { currency, symbol, formatCurrency, setCurrency } = useCurrencyContext();

  return { currency, symbol, formatCurrency, setCurrency };
};
