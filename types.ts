
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export enum Side {
  LONG = 'LONG',
  SHORT = 'SHORT'
}

export interface TradeSignal {
  id: string;
  symbol: string;
  side: Side;
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: number;
  reasoning: string;
  modelType: string;
}

export interface Position {
  id: string;
  symbol: string;
  side: Side;
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  unrealizedPnL: number;
  liquidationPrice: number;
  takeProfit?: number;
  stopLoss?: number;
  timestamp: number; // Added for grace period check
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  side: Side;
  entryPrice: number;
  exitPrice: number;
  size: number;
  leverage: number;
  pnl: number;
  pnlPercent: number;
  closeReason: string;
  timestamp: number;
}

export interface AccountInfo {
  balance: number;
  equity: number;
  marginUsed: number;
  freeMargin: number;
  dayPnL: number;
  startBalance: number; 
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number; // Cumulative total for depth calc
  depthPercent: number; // 0-100 for visual bar
}

export interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercent: number;
}

export interface UserSettings {
  notifications: {
    push: boolean;
    telegram: boolean;
    email: boolean;
  };
  telegramHandle: string;
  emailAddress: string;
  autoTrade: boolean;
  minConfidence: number;
}

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  title?: string;
}

export interface AiLog {
  id: string;
  timestamp: number;
  message: string;
  type: 'scan' | 'decision' | 'execution' | 'alert' | 'info';
}
