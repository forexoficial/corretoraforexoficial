import { useCurrencyContext } from '@/contexts/CurrencyContext';

export const useCurrency = () => {
  const { currency, symbol, formatCurrency } = useCurrencyContext();

  return { currency, symbol, formatCurrency };
};
