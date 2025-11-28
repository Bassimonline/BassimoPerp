
import { Candle, Timeframe, OrderBookData, OrderBookLevel, SentimentData } from '../types';

// Endpoints
const FAPI_URL = 'https://fapi.binance.com/fapi/v1'; // Futures
const SPOT_API_URL = 'https://api.binance.com/api/v3'; // Spot Fallback
const WS_URL = 'wss://fstream.binance.com/ws'; 
const FNG_API_URL = 'https://api.alternative.me/fng/?limit=1';

// --- HELPER: Mock Data Generator (For when APIs are blocked) ---
const generateMockOrderBook = (price: number): OrderBookData => {
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    
    let currentBid = price * 0.9999;
    let currentAsk = price * 1.0001;
    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 0; i < 15; i++) {
        const bidSize = Math.random() * 2 + 0.1;
        const askSize = Math.random() * 2 + 0.1;
        
        bidTotal += bidSize;
        askTotal += askSize;

        bids.push({ price: currentBid, amount: bidSize, total: bidTotal, depthPercent: 0 });
        asks.push({ price: currentAsk, amount: askSize, total: askTotal, depthPercent: 0 });

        currentBid -= price * 0.0005; 
        currentAsk += price * 0.0005;
    }

    // Normalize Depth
    bids.forEach(b => b.depthPercent = (b.total / bidTotal) * 100);
    asks.forEach(a => a.depthPercent = (a.total / askTotal) * 100);

    return {
        bids,
        asks: asks.reverse(), // Visual sort
        spread: currentAsk - currentBid,
        spreadPercent: ((currentAsk - currentBid) / price) * 100
    };
};

/**
 * Fetches the Crypto Fear & Greed Index
 */
export const fetchFearAndGreedIndex = async (): Promise<Partial<SentimentData>> => {
  try {
    const response = await fetch(FNG_API_URL);
    if (!response.ok) throw new Error("Sentiment API Error");
    const data = await response.json();
    const item = data.data[0];
    return {
      value: parseInt(item.value),
      classification: item.value_classification
    };
  } catch (error) {
    return { value: 50, classification: "Neutral" };
  }
};

/**
 * Fetches Klines (Candlesticks) via REST API
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
    } catch (e) {
        console.error("All Data Sources Failed:", e);
        return []; 
    }
  }
};

/**
 * Fetches Order Book (Depth) with 3-Tier Fallback
 */
export const fetchOrderBook = async (symbol: string, limit: number = 20): Promise<OrderBookData | null> => {
    try {
        // Tier 1: Futures
        const response = await fetch(`${FAPI_URL}/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`);
        if (!response.ok) throw new Error("Futures Depth Failed");
        const data = await response.json();
        return processOrderBook(data);
    } catch (futuresError) {
        try {
            // Tier 2: Spot
            const response = await fetch(`${SPOT_API_URL}/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`);
            if (!response.ok) throw new Error("Spot Depth Failed");
            const data = await response.json();
            return processOrderBook(data);
        } catch (spotError) {
            // Tier 3: Mock (Last Resort)
            // We return null here and let the Subscriber or App handle the mock generation 
            // when it has the current price.
            return null; 
        }
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

    bids.sort((a: any, b: any) => b.price - a.price);
    asks.sort((a: any, b: any) => a.price - b.price);

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

    const maxBidTotal = processedBids[processedBids.length - 1]?.total || 1;
    const maxAskTotal = processedAsks[processedAsks.length - 1]?.total || 1;

    processedBids.forEach(b => b.depthPercent = (b.total / maxBidTotal) * 100);
    processedAsks.forEach(a => a.depthPercent = (a.total / maxAskTotal) * 100);

    const spread = processedAsks[0]?.price - processedBids[0]?.price || 0;
    const spreadPercent = processedAsks[0]?.price ? (spread / processedAsks[0].price) * 100 : 0;

    return {
        bids: processedBids,
        asks: processedAsks,
        spread,
        spreadPercent
    };
};

// --------------- WEBSOCKET SUBSCRIPTIONS ---------------

export const subscribeToMarkPrice = (symbol: string, callback: (price: number) => void) => {
  let ws: WebSocket | null = null;
  let shouldReconnect = true;

  const connect = () => {
    try {
        ws = new WebSocket(`${WS_URL}/${symbol.toLowerCase()}@markPrice`);
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.e === 'markPriceUpdate' && message.p) {
                    callback(parseFloat(message.p));
                }
            } catch (e) { }
        };
        ws.onclose = () => { if (shouldReconnect) setTimeout(connect, 1000); };
        ws.onerror = () => ws?.close();
    } catch (e) { if (shouldReconnect) setTimeout(connect, 1000); }
  };
  connect();
  return { close: () => { shouldReconnect = false; ws?.close(); } } as unknown as WebSocket;
};

export const subscribeToTicker = (symbol: string, callback: (price: number) => void) => {
  let ws: WebSocket | null = null;
  let shouldReconnect = true;
  
  const connect = () => {
    try {
        // Use kline_1m for price to match chart close
        ws = new WebSocket(`${WS_URL}/${symbol.toLowerCase()}@kline_1m`);
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.e === 'kline' && message.k) {
                    callback(parseFloat(message.k.c));
                }
            } catch (e) { }
        };
        ws.onclose = () => { if (shouldReconnect) setTimeout(connect, 1000); };
        ws.onerror = () => ws?.close();
    } catch (e) { if (shouldReconnect) setTimeout(connect, 1000); }
  };
  connect();
  return { close: () => { shouldReconnect = false; ws?.close(); } } as unknown as WebSocket; 
};

export const subscribeToKline = (symbol: string, interval: string, callback: (candle: Candle) => void) => {
  let ws: WebSocket | null = null;
  let shouldReconnect = true;

  const connect = () => {
    try {
      ws = new WebSocket(`${WS_URL}/${symbol.toLowerCase()}@kline_${interval}`);
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.e === 'kline') {
            const k = message.k;
            callback({
              time: k.t,
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v)
            });
          }
        } catch (e) { }
      };
      ws.onclose = () => { if (shouldReconnect) setTimeout(connect, 1000); };
    } catch (e) { if (shouldReconnect) setTimeout(connect, 1000); }
  };
  connect();
  return { close: () => { shouldReconnect = false; ws?.close(); } } as unknown as WebSocket;
}

/**
 * Subscribes to Order Book with Fallback to Mock if stream is dead or blocked
 */
export const subscribeToDepth = (symbol: string, callback: (data: OrderBookData) => void) => {
    let ws: WebSocket | null = null;
    let shouldReconnect = true;
    let lastUpdate = 0;
    let mockInterval: any = null;

    // Safety: If no data received for 3s, assume broken stream and generate data
    // to prevent empty UI
    const checkLiveness = (currentPrice: number) => {
        if (Date.now() - lastUpdate > 3000 && currentPrice > 0) {
            callback(generateMockOrderBook(currentPrice));
        }
    }

    const connect = () => {
        try {
            ws = new WebSocket(`${WS_URL}/${symbol.toLowerCase()}@depth20@100ms`);
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.bids && data.asks) {
                        lastUpdate = Date.now();
                        const book = processOrderBook(data);
                        callback(book);
                    }
                } catch (e) { }
            };
            ws.onclose = () => { if (shouldReconnect) setTimeout(connect, 1000); };
        } catch (e) { if (shouldReconnect) setTimeout(connect, 1000); }
    }

    connect();

    return {
        close: () => {
            shouldReconnect = false;
            if (ws) ws.close();
            if (mockInterval) clearInterval(mockInterval);
        },
        checkLiveness
    };
};
