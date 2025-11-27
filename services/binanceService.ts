
import { Candle, Timeframe, OrderBookData, OrderBookLevel } from '../types';

// Endpoints
const FAPI_URL = 'https://fapi.binance.com/fapi/v1'; // Futures (Primary for PerpTrader)
const SPOT_API_URL = 'https://api.binance.com/api/v3'; // Spot (Fallback)
const WS_URL = 'wss://fstream.binance.com/ws'; // Futures WebSocket

/**
 * Fetches Klines (Candlesticks) with a robust fallback strategy.
 */
export const fetchKlines = async (symbol: string, interval: Timeframe, limit: number = 100): Promise<Candle[]> => {
  try {
    const response = await fetch(`${FAPI_URL}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`);
    if (!response.ok) throw new Error(`Futures API error: ${response.statusText}`);
    const data = await response.json();
    return mapDataToCandles(data);
  } catch (fapiError) {
    try {
      const response = await fetch(`${SPOT_API_URL}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`);
      if (!response.ok) throw new Error(`Spot API error: ${response.statusText}`);
      const data = await response.json();
      return mapDataToCandles(data);
    } catch (spotError) {
      console.error("All Binance APIs failed (likely CORS). Using simulation data.");
      return generateMockCandles(limit, symbol);
    }
  }
};

/**
 * Fetches Order Book (Depth)
 */
export const fetchOrderBook = async (symbol: string, limit: number = 20): Promise<OrderBookData> => {
    try {
        const response = await fetch(`${FAPI_URL}/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`);
        if (!response.ok) throw new Error("Failed to fetch depth");
        const data = await response.json();
        return processOrderBook(data);
    } catch (error) {
        // console.warn("Depth fetch failed, using mock", error);
        return generateMockOrderBook(symbol);
    }
}

const mapDataToCandles = (data: any[]): Candle[] => {
  return data.map((k: any) => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
};

const processOrderBook = (data: any): OrderBookData => {
    const bids = data.bids.map((b: any) => ({ price: parseFloat(b[0]), amount: parseFloat(b[1]) }));
    const asks = data.asks.map((a: any) => ({ price: parseFloat(a[0]), amount: parseFloat(a[1]) }));

    // Sort: Bids desc (highest bid first), Asks asc (lowest ask first)
    bids.sort((a: any, b: any) => b.price - a.price);
    asks.sort((a: any, b: any) => a.price - b.price);

    // Calculate totals for depth bars
    let bidTotal = 0;
    const processedBids: OrderBookLevel[] = bids.map((b: any) => {
        bidTotal += b.amount;
        return { ...b, total: bidTotal, depthPercent: 0 };
    });

    let askTotal = 0;
    const processedAsks: OrderBookLevel[] = asks.map((a: any) => {
        askTotal += a.amount;
        return { ...a, total: askTotal, depthPercent: 0 };
    });

    // Normalize depth percent
    const maxBidTotal = processedBids[processedBids.length - 1]?.total || 1;
    const maxAskTotal = processedAsks[processedAsks.length - 1]?.total || 1;

    processedBids.forEach(b => b.depthPercent = (b.total / maxBidTotal) * 100);
    processedAsks.forEach(a => a.depthPercent = (a.total / maxAskTotal) * 100);

    const spread = processedAsks[0].price - processedBids[0].price;
    const spreadPercent = (spread / processedAsks[0].price) * 100;

    return {
        bids: processedBids,
        asks: processedAsks,
        spread,
        spreadPercent
    };
};

const generateMockOrderBook = (symbol: string): OrderBookData => {
    let price = 100;
    if (symbol.includes('BTC')) price = 60000;
    else if (symbol.includes('ETH')) price = 3000;
    else if (symbol.includes('SOL')) price = 150;
    else if (symbol.includes('PEPE')) price = 0.00001;
    else if (symbol.includes('DOGE')) price = 0.15;

    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    
    let currentBid = price * 0.9995;
    let currentAsk = price * 1.0005;
    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 0; i < 15; i++) {
        const bidVol = Math.random() * 5 + 0.1;
        const askVol = Math.random() * 5 + 0.1;
        bidTotal += bidVol;
        askTotal += askVol;
        
        bids.push({ price: currentBid, amount: bidVol, total: bidTotal, depthPercent: 0 });
        asks.push({ price: currentAsk, amount: askVol, total: askTotal, depthPercent: 0 });

        currentBid -= price * 0.0001;
        currentAsk += price * 0.0001;
    }

    // Normalize
    bids.forEach(b => b.depthPercent = (b.total / bidTotal) * 100);
    asks.forEach(a => a.depthPercent = (a.total / askTotal) * 100);

    return {
        bids,
        asks: asks.reverse(), // Visual fix for mock
        spread: currentAsk - currentBid, // rough approx
        spreadPercent: 0.1
    };
};

const generateMockCandles = (limit: number, symbol: string): Candle[] => {
  const candles: Candle[] = [];
  const now = Date.now();
  
  let price = 100;
  if (symbol.includes('BTC')) price = 60000;
  else if (symbol.includes('ETH')) price = 3000;
  else if (symbol.includes('SOL')) price = 150;
  else if (symbol.includes('PEPE')) price = 0.00001;
  else if (symbol.includes('DOGE')) price = 0.15;

  for (let i = limit; i > 0; i--) {
    const time = now - i * 60 * 60 * 1000; 
    const volatility = price * 0.015;
    const change = (Math.random() - 0.5) * volatility;
    
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * (volatility * 0.5);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.5);
    
    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume: Math.random() * 5000 + 500
    });
    price = close;
  }
  return candles;
};

export const subscribeToTicker = (symbol: string, callback: (price: number) => void) => {
  let ws: WebSocket | null = null;
  try {
    ws = new WebSocket(`${WS_URL}/${symbol.toLowerCase()}@aggTrade`);
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.p) callback(parseFloat(message.p));
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };
  } catch (e) {
    console.error("Failed to initialize WebSocket", e);
  }
  return {
    close: () => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    }
  } as unknown as WebSocket; 
};
