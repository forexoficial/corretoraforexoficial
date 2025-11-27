// Technical Indicators Calculations

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// Simple Moving Average (SMA)
export function calculateSMA(data: CandleData[], period: number): Array<{ time: number; value: number }> {
  const result: Array<{ time: number; value: number }> = [];
  
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({
      time: data[i].time,
      value: sum / period
    });
  }
  
  return result;
}

// Exponential Moving Average (EMA)
export function calculateEMA(data: CandleData[], period: number): Array<{ time: number; value: number }> {
  const result: Array<{ time: number; value: number }> = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for first value
  let ema = 0;
  for (let i = 0; i < period; i++) {
    ema += data[i].close;
  }
  ema = ema / period;
  
  result.push({ time: data[period - 1].time, value: ema });
  
  // Calculate EMA for remaining values
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({ time: data[i].time, value: ema });
  }
  
  return result;
}

// Relative Strength Index (RSI)
export function calculateRSI(data: CandleData[], period: number = 14): Array<{ time: number; value: number }> {
  const result: Array<{ time: number; value: number }> = [];
  
  if (data.length < period + 1) return result;
  
  let gains = 0;
  let losses = 0;
  
  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calculate RSI
  for (let i = period; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    result.push({ time: data[i].time, value: rsi });
  }
  
  return result;
}

// Bollinger Bands
export interface BollingerBands {
  upper: Array<{ time: number; value: number }>;
  middle: Array<{ time: number; value: number }>;
  lower: Array<{ time: number; value: number }>;
}

export function calculateBollingerBands(
  data: CandleData[], 
  period: number = 20, 
  stdDev: number = 2
): BollingerBands {
  const result: BollingerBands = {
    upper: [],
    middle: [],
    lower: []
  };
  
  for (let i = period - 1; i < data.length; i++) {
    // Calculate SMA (middle band)
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    const sma = sum / period;
    
    // Calculate standard deviation
    let variance = 0;
    for (let j = 0; j < period; j++) {
      variance += Math.pow(data[i - j].close - sma, 2);
    }
    const sd = Math.sqrt(variance / period);
    
    result.middle.push({ time: data[i].time, value: sma });
    result.upper.push({ time: data[i].time, value: sma + (stdDev * sd) });
    result.lower.push({ time: data[i].time, value: sma - (stdDev * sd) });
  }
  
  return result;
}

// MACD (Moving Average Convergence Divergence)
export interface MACD {
  macd: Array<{ time: number; value: number }>;
  signal: Array<{ time: number; value: number }>;
  histogram: Array<{ time: number; value: number }>;
}

export function calculateMACD(
  data: CandleData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACD {
  const result: MACD = {
    macd: [],
    signal: [],
    histogram: []
  };
  
  if (data.length < slowPeriod + signalPeriod) return result;
  
  // Calculate EMAs
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  // Calculate MACD line
  const macdLine: Array<{ time: number; value: number }> = [];
  for (let i = 0; i < slowEMA.length; i++) {
    const fastValue = fastEMA.find(e => e.time === slowEMA[i].time);
    if (fastValue) {
      macdLine.push({
        time: slowEMA[i].time,
        value: fastValue.value - slowEMA[i].value
      });
    }
  }
  
  // Calculate signal line (EMA of MACD)
  const signalMultiplier = 2 / (signalPeriod + 1);
  let signalEMA = 0;
  
  // Start with SMA for first signal value
  for (let i = 0; i < signalPeriod && i < macdLine.length; i++) {
    signalEMA += macdLine[i].value;
  }
  signalEMA = signalEMA / Math.min(signalPeriod, macdLine.length);
  
  // Calculate signal line and histogram
  for (let i = signalPeriod - 1; i < macdLine.length; i++) {
    if (i === signalPeriod - 1) {
      result.signal.push({ time: macdLine[i].time, value: signalEMA });
    } else {
      signalEMA = (macdLine[i].value - signalEMA) * signalMultiplier + signalEMA;
      result.signal.push({ time: macdLine[i].time, value: signalEMA });
    }
    
    result.macd.push(macdLine[i]);
    result.histogram.push({
      time: macdLine[i].time,
      value: macdLine[i].value - signalEMA
    });
  }
  
  return result;
}
