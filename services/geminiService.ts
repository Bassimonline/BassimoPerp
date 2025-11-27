
import { GoogleGenAI } from "@google/genai";
import { Candle, Side, TradeSignal } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMarketAnalysis = async (
  symbol: string,
  currentPrice: number,
  recentCandles: Candle[]
): Promise<Partial<TradeSignal>> => {
  // 1. Fallback if no key provided
  if (!process.env.API_KEY) {
    return simulateAnalysis(currentPrice, recentCandles, "Demo Mode: ");
  }

  const last5 = recentCandles.slice(-5).map(c => 
    `Time: ${new Date(c.time).toLocaleTimeString()}, Close: ${c.close}, Vol: ${c.volume}`
  ).join('\n');

  const prompt = `
    You are a high-frequency trading AI. Analyze the market for ${symbol}.
    Current Price: ${currentPrice}
    Recent Data:
    ${last5}

    Provide a concise technical analysis.
    Output JSON format only:
    {
      "reasoning": "string (max 20 words)",
      "confidence": number (0-1),
      "side": "LONG" or "SHORT",
      "suggestedStop": number,
      "suggestedTarget": number
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const result = JSON.parse(text);
    return {
      reasoning: result.reasoning,
      confidence: result.confidence,
      side: result.side === 'LONG' ? Side.LONG : Side.SHORT,
      stopLoss: result.suggestedStop,
      takeProfit: result.suggestedTarget,
      modelType: 'Gemini 2.5 Flash'
    };
  } catch (error: any) {
    // 2. Fallback on API Error (Rate Limit 429 or Network)
    // We swallow the error and return a local analysis to keep the app running.
    let errorMsg = error.message || "Unknown error";
    if (JSON.stringify(error).includes("429") || errorMsg.includes("429")) {
        console.warn("Gemini Quota Exceeded. Switching to local Technical Analysis.");
    } else {
        console.warn("Gemini API Error:", errorMsg);
    }
    
    return simulateAnalysis(currentPrice, recentCandles, "Offline Fallback: ");
  }
};

// Local Technical Analysis Fallback (Used when AI is rate limited)
const simulateAnalysis = (price: number, candles: Candle[], prefixReason: string = ""): Partial<TradeSignal> => {
    if (candles.length < 2) {
        return {
            reasoning: "Insufficient data for analysis.",
            confidence: 0,
            side: Side.LONG,
            modelType: "System Wait"
        };
    }

    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    
    // Simple Trend Logic: Higher Highs / Lower Lows logic could go here
    const isBullish = last.close > prev.close;
    const volatility = (last.high - last.low) / last.close;
    
    // Determine SL/TP based on volatility
    const slPercent = Math.max(0.01, volatility * 1.5); // Min 1%
    const tpPercent = slPercent * 2; // 1:2 Risk Reward

    return {
      reasoning: `${prefixReason}Trend is ${isBullish ? 'Bullish' : 'Bearish'} (Local Calculation).`,
      confidence: 0.60 + (Math.random() * 0.15), // Random confidence between 60-75%
      side: isBullish ? Side.LONG : Side.SHORT,
      stopLoss: isBullish ? price * (1 - slPercent) : price * (1 + slPercent),
      takeProfit: isBullish ? price * (1 + tpPercent) : price * (1 - tpPercent),
      modelType: "Technical Analysis (Fallback)"
    };
};
