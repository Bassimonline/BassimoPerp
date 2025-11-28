
import { GoogleGenAI } from "@google/genai";
import { Candle, Side, TradeSignal, SentimentData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMarketAnalysis = async (
  symbol: string,
  currentPrice: number,
  recentCandles: Candle[],
  sentiment?: SentimentData
): Promise<Partial<TradeSignal>> => {
  
  // 1. Immediate Fallback if no key
  if (!process.env.API_KEY) {
    return simulateAnalysis(currentPrice, recentCandles, sentiment, "Demo Mode: ");
  }

  const last5 = recentCandles.slice(-5).map(c => 
    `Time: ${new Date(c.time).toLocaleTimeString()}, Close: ${c.close}, Vol: ${c.volume}`
  ).join('\n');

  const imbalancePct = sentiment ? (sentiment.imbalance * 100).toFixed(2) : "0.00";
  const sentimentText = sentiment 
    ? `Sentiment: ${sentiment.value} (${sentiment.classification}), Book Imbalance: ${imbalancePct}%`
    : "Sentiment Unavailable";

  const prompt = `
    Analyze ${symbol}. Price: ${currentPrice}. ${sentimentText}.
    Recent Candles: ${last5}
    
    Task: Identify a HIGH PROBABILITY trade (Long/Short).
    Rules: 
    - Confidence < 0.5 = SKIP.
    - Risk/Reward 1:3.
    
    Output JSON: { "reasoning": "string", "confidence": number, "side": "LONG"|"SHORT", "suggestedStop": number, "suggestedTarget": number }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.1 }
    });

    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    
    const result = JSON.parse(text);
    return {
      reasoning: result.reasoning,
      confidence: result.confidence,
      side: result.side === 'LONG' ? Side.LONG : Side.SHORT,
      stopLoss: result.suggestedStop,
      takeProfit: result.suggestedTarget,
      modelType: 'Gemini 2.5 Pro',
      sentimentContext: `${sentiment?.classification}`
    };
  } catch (error: any) {
    // 2. Failover to Local Analysis on ANY error (Network, 429, Parse)
    console.warn("AI Service Failed, switching to Quant Engine:", error.message);
    return simulateAnalysis(currentPrice, recentCandles, sentiment, "Quant Fallback: ");
  }
};

// Robust Local Fallback
const simulateAnalysis = (
    price: number, 
    candles: Candle[], 
    sentiment?: SentimentData,
    prefixReason: string = ""
): Partial<TradeSignal> => {
    // If no data, return neutral placeholder to prevent crashes
    if (!candles || candles.length < 2) {
        return {
            reasoning: "Insufficient market data.",
            confidence: 0,
            side: Side.LONG,
            modelType: "Waiting for Data"
        };
    }

    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const isBullish = last.close > prev.close;
    
    let score = isBullish ? 0.5 : -0.5;

    // Add Sentiment Weight
    if (sentiment) {
        score += sentiment.imbalance * 2.0; 
        if (sentiment.value < 20 && !isBullish) score -= 0.2; // Fear + Drop = Short
        if (sentiment.value > 80 && isBullish) score += 0.2; // Greed + Pump = Long
    }

    const side = score > 0 ? Side.LONG : Side.SHORT;
    let confidence = 0.5 + (Math.abs(score) * 0.3);
    confidence = Math.min(0.90, confidence);

    const volatility = (last.high - last.low) / last.close || 0.01;
    const slDist = Math.max(price * 0.01, price * volatility * 2);
    
    return {
      reasoning: `${prefixReason}Trend is ${isBullish?'Bullish':'Bearish'} with ${sentiment?.classification || 'Neutral'} sentiment.`,
      confidence: confidence,
      side: side,
      stopLoss: side === Side.LONG ? price - slDist : price + slDist,
      takeProfit: side === Side.LONG ? price + (slDist * 3) : price - (slDist * 3),
      modelType: "Quant Engine v2",
      sentimentContext: sentiment?.classification
    };
};
