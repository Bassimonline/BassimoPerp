
import { Candle, Timeframe, OrderBookData, OrderBookLevel, SentimentData } from '../types';

// Endpoints - STRICTLY FUTURES ONLY
const FAPI_URL = 'https://fapi.binance.com/fapi/v1'; 
const WS_URL = 'wss://fstream.binance.com/ws'; 
const FNG_API_URL = 'https://api.alternative.me/fng/?limit=1';

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
    console.warn("Failed to fetch Fear & Greed:", error);
    return { value: 50, classification: "Neutral" };
  }
};

/**
 * Fetches Klines (Candlesticks) via REST API (Historical Data)
 * FIX: Removed Spot Fallback. Strictly Futures data.
 */
export const fetchKlines = async (symbol: string, interval: Timeframe, limit: number = 100): Promise<Candle[]> => {
  try {
    const response = await fetch(`${FAPI_URL}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`);
    if (!response.ok) throw new Error(`Futures API error: ${response.statusText}`);
    const data = await response.json();
    return mapDataToCandles(data);
  } catch (fapiError) {
    console.error("Futures API Failed (CORS or Network):", fapiError);
    return []; // Fail gracefully, do not fallback to Spot
  }
};

/**
 * Fetches Order Book (Depth) via REST API (Snapshot)
 */
export const fetchOrderBook = async (symbol: string, limit: number = 20): Promise<OrderBookData | null> => {
    try {
        const response = await fetch(`${FAPI_URL}/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`);
        if (!response.ok) throw new Error("Failed to fetch depth");
        const data = await response.json();
        return processOrderBook(data);
    } catch (error) {
        return null;
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
    // FIX: Ensure mapping uses 'amount', consistent with AI Logic requirements
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

/**
 * Subscribes to Mark Price (@markPrice).
 * Essential for accurate Liquidation calculation on Futures.
 */
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

        ws.onclose = () => {
             if (shouldReconnect) setTimeout(() => connect(), 1000);
        };
        ws.onerror = () => ws?.close();
    } catch (e) {
        if (shouldReconnect) setTimeout(() => connect(), 1000);
    }
  };
  connect();
  return {
    close: () => {
      shouldReconnect = false;
      if (ws) ws.close();
    }
  } as unknown as WebSocket;
};

/**
 * Subscribes to Real-Time Trade Updates (@aggTrade).
 * Used for "Last Price" display and Chart ticks.
 */
export const subscribeToTicker = (symbol: string, callback: (price: number) => void) => {
  let ws: WebSocket | null = null;
  let shouldReconnect = true;
  
  const connect = () => {
    try {
        ws = new WebSocket(`${WS_URL}/${symbol.toLowerCase()}@aggTrade`);
        
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.e === 'aggTrade' && message.p) {
                    callback(parseFloat(message.p));
                }
            } catch (e) { }
        };

        ws.onclose = () => {
             if (shouldReconnect) setTimeout(() => connect(), 1000);
        };
        ws.onerror = () => ws?.close();
    } catch (e) {
        if (shouldReconnect) setTimeout(() => connect(), 1000);
    }
  };
  connect();
  return {
    close: () => {
      shouldReconnect = false;
      if (ws) ws.close();
    }
  } as unknown as WebSocket; 
};

/**
 * Subscribes to Chart Data (Candles).
 */
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
            const candle: Candle = {
              time: k.t,
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v)
            };
            callback(candle);
          }
        } catch (e) { }
      };

      ws.onclose = () => {
        if (shouldReconnect) setTimeout(() => connect(), 1000);
      };
    } catch (e) {
      if (shouldReconnect) setTimeout(() => connect(), 1000);
    }
  };
  connect();
  return {
    close: () => {
      shouldReconnect = false;
      if (ws) ws.close();
    }
  } as unknown as WebSocket;
}

/**
 * Subscribes to Order Book (Depth 20).
 * Note: @depth20@100ms is a SNAPSHOT push, not differential.
 */
export const subscribeToDepth = (symbol: string, callback: (data: OrderBookData) => void) => {
    let ws: WebSocket | null = null;
    let shouldReconnect = true;

    const connect = () => {
        try {
            ws = new WebSocket(`${WS_URL}/${symbol.toLowerCase()}@depth20@100ms`);
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.bids && data.asks) {
                        const book = processOrderBook(data);
                        callback(book);
                    }
                } catch (e) { }
            };
            ws.onclose = () => {
                if (shouldReconnect) setTimeout(() => connect(), 1000);
            };
        } catch (e) {
             if (shouldReconnect) setTimeout(() => connect(), 1000);
        }
    }
    connect();
    return {
        close: () => {
            shouldReconnect = false;
            if (ws) ws.close();
        }
    };
};
