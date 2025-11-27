import { createContext, useContext, ReactNode, useRef, useState, useCallback } from 'react';
import { IChartApi, IPriceLine } from 'lightweight-charts';

interface ChartContextType {
  // Chart refs
  chartRef: React.MutableRefObject<IChartApi | null>;
  candleSeriesRef: React.MutableRefObject<any>;
  
  // State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  currentPrice: number;
  setCurrentPrice: (price: number) => void;
  currentCandleTime: number;
  setCurrentCandleTime: (time: number) => void;
  
  // Active trades
  activeTrades: any[];
  setActiveTrades: React.Dispatch<React.SetStateAction<any[]>>;
  tradeLinesRef: React.MutableRefObject<Map<string, IPriceLine>>;
  
  // Completed trade notification
  completedTradeNotification: any;
  setCompletedTradeNotification: (notification: any) => void;
  
  // Indicator series
  indicatorSeriesRef: React.MutableRefObject<{
    sma?: any;
    ema?: any;
    rsi?: any;
    bbUpper?: any;
    bbMiddle?: any;
    bbLower?: any;
    macdLine?: any;
    macdSignal?: any;
    macdHistogram?: any;
  }>;
  
  // Intervals
  autoGenerateIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
  smoothAnimationIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
  candleCheckIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
  currentCandleRef: React.MutableRefObject<any>;
  
  // User
  userId: string | null;
  setUserId: (id: string | null) => void;
}

const ChartContext = createContext<ChartContextType | undefined>(undefined);

export const useChartContext = () => {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error('useChartContext must be used within ChartProvider');
  }
  return context;
};

interface ChartProviderProps {
  children: ReactNode;
}

export const ChartProvider = ({ children }: ChartProviderProps) => {
  // Chart refs
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currentCandleTime, setCurrentCandleTime] = useState<number>(0);
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [completedTradeNotification, setCompletedTradeNotification] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Refs
  const tradeLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  const indicatorSeriesRef = useRef<{
    sma?: any;
    ema?: any;
    rsi?: any;
    bbUpper?: any;
    bbMiddle?: any;
    bbLower?: any;
    macdLine?: any;
    macdSignal?: any;
    macdHistogram?: any;
  }>({});
  
  const autoGenerateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const smoothAnimationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const candleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentCandleRef = useRef<any>(null);

  const value: ChartContextType = {
    chartRef,
    candleSeriesRef,
    isLoading,
    setIsLoading,
    currentPrice,
    setCurrentPrice,
    currentCandleTime,
    setCurrentCandleTime,
    activeTrades,
    setActiveTrades,
    tradeLinesRef,
    completedTradeNotification,
    setCompletedTradeNotification,
    indicatorSeriesRef,
    autoGenerateIntervalRef,
    smoothAnimationIntervalRef,
    candleCheckIntervalRef,
    currentCandleRef,
    userId,
    setUserId,
  };

  return <ChartContext.Provider value={value}>{children}</ChartContext.Provider>;
};
