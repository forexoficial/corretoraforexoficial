import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Currency = 'BRL' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  symbol: string;
  formatCurrency: (value: number) => string;
  setCurrency: (currency: Currency) => void;
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

  const formatCurrency = (value: number): string => {
    if (currency === 'BRL') {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `$ ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, symbol, formatCurrency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};
