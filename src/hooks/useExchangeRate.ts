import { useState, useEffect, useCallback } from 'react';

interface ExchangeRateData {
  rate: number;
  lastUpdate: string;
  isLoading: boolean;
  error: string | null;
}

const CACHE_KEY = 'exchange_rate_usd_brl';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

interface CachedRate {
  rate: number;
  lastUpdate: string;
  cachedAt: number;
}

export const useExchangeRate = () => {
  const [data, setData] = useState<ExchangeRateData>({
    rate: 5.5, // Fallback rate
    lastUpdate: '',
    isLoading: true,
    error: null,
  });

  const fetchRate = useCallback(async () => {
    // Check cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsedCache: CachedRate = JSON.parse(cached);
        const now = Date.now();
        
        // Use cache if still valid
        if (now - parsedCache.cachedAt < CACHE_DURATION) {
          setData({
            rate: parsedCache.rate,
            lastUpdate: parsedCache.lastUpdate,
            isLoading: false,
            error: null,
          });
          return;
        }
      } catch (e) {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      // AwesomeAPI - Free, no API key needed, real-time rates
      const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rate');
      }
      
      const result = await response.json();
      const usdBrl = result.USDBRL;
      
      const rate = parseFloat(usdBrl.bid);
      const lastUpdate = usdBrl.create_date;
      
      // Cache the result
      const cacheData: CachedRate = {
        rate,
        lastUpdate,
        cachedAt: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      
      setData({
        rate,
        lastUpdate,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      
      // Try to use cached rate even if expired
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsedCache: CachedRate = JSON.parse(cached);
          setData({
            rate: parsedCache.rate,
            lastUpdate: parsedCache.lastUpdate,
            isLoading: false,
            error: 'Using cached rate',
          });
          return;
        } catch (e) {
          // Ignore parse error
        }
      }
      
      // Use fallback rate
      setData({
        rate: 5.5,
        lastUpdate: '',
        isLoading: false,
        error: 'Using fallback rate',
      });
    }
  }, []);

  useEffect(() => {
    fetchRate();
    
    // Refresh rate every 30 minutes
    const interval = setInterval(fetchRate, CACHE_DURATION);
    return () => clearInterval(interval);
  }, [fetchRate]);

  const convertBRLtoUSD = useCallback((brlAmount: number): number => {
    return brlAmount / data.rate;
  }, [data.rate]);

  const convertUSDtoBRL = useCallback((usdAmount: number): number => {
    return usdAmount * data.rate;
  }, [data.rate]);

  return {
    ...data,
    convertBRLtoUSD,
    convertUSDtoBRL,
    refreshRate: fetchRate,
  };
};
