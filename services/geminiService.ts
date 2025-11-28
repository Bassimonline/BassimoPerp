
import { GoogleGenAI } from "@google/genai";
import { Candle, Side, TradeSignal, SentimentData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMarketAnalysis = async (
  symbol: string,
  currentPrice: number,
  recentCandles: Candle[],
  sentiment?: SentimentData
): Promise<Partial<TradeSignal>> => {
  
  // 1. Fallback if no key provided or Quota
  if (!process.env.API_KEY) {
    return simulateAnalysis(currentPrice, recentCandles, sentiment, "Demo Mode: ");
  }

  const last5 = recentCandles.slice(-5).map(c => 
    `Time: ${new Date(c.time).toLocaleTimeString()}, Close: ${c.close}, Vol: ${c.volume}`
  ).join('\n');

  // Enhanced Sentiment Context
  const imbalancePct = sentiment ? (sentiment.imbalance * 100).toFixed(2) : "0.00";
  const sentimentText = sentiment 
    ? `
    MARKET SENTIMENT DATA:
    - Fear & Greed Index: ${sentiment.value}/100 (${sentiment.classification})
    - Real-Time Order Book Imbalance: ${imbalancePct}% 
      (Positive = Buyers Dominating / Bullish Pressure)
      (Negative = Sellers Dominating / Bearish Pressure)
    `
    : "Sentiment Data Unavailable.";

  const prompt = `
    Act as a Senior Crypto Hedge Fund Manager. Analyze ${symbol} for a HIGH-PROFITABILITY setup.
    
    LIVE DATA:
    - Current Price: ${currentPrice}
    ${sentimentText}
    
    RECENT PRICE ACTION (Last 5 periods):
    ${last5}

    STRATEGY & RULES:
    1. **Quality over Quantity**: REJECT any trade with < 50% probability. We only want A+ setups.
    2. **Trend Alignment**: 
       - In "Extreme Fear" or Negative Imbalance -> HARD BIAS towards SHORT.
       - In "Extreme Greed" or Positive Imbalance -> HARD BIAS towards LONG.
       - Do NOT fight the trend unless you see a massive exhaustion candle.
    3. **Profit Maximization**: 
       - Aim for a Risk:Reward ratio of at least 1:3. 
       - Set targets aggressive enough to cover fees and generate alpha.

    OUTPUT:
    Return a JSON object with the trade decision.
    {
      "reasoning": "Concise analysis (max 20 words). Focus on why this is an A+ setup.",
      "confidence": number (0.00 to 1.00),
      "side": "LONG" or "SHORT",
      "suggestedStop": number (Precise stop loss),
      "suggestedTarget": number (Aggressive take profit, aim for >2% move)
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1 // Low temp for strict adherence to logic
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
      modelType: 'Gemini 2.5 Pro',
      sentimentContext: `${sentiment?.classification} (${imbalancePct}%)`
    };
  } catch (error: any) {
    let errorMsg = error.message || "Unknown error";
    if (JSON.stringify(error).includes("429") || errorMsg.includes("429")) {
        console.warn("Gemini Quota Exceeded. Switching to local Technical + Sentiment Analysis.");
    } else {
        console.warn("Gemini API Error:", errorMsg);
    }
    
    return simulateAnalysis(currentPrice, recentCandles, sentiment, "Offline Fallback: ");
  }
};

// Local Technical Analysis Fallback (Enhanced with Weighted Sentiment)
const simulateAnalysis = (
    price: number, 
    candles: Candle[], 
    sentiment?: SentimentData,
    prefixReason: string = ""
): Partial<TradeSignal> => {
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
    
    // 1. Base Technical Trend
    const isTechnicalBullish = last.close > prev.close;
    
    // 2. Sentiment Weighting
    let score = isTechnicalBullish ? 0.5 : -0.5; // Start with trend
    let sentimentNote = "";

    if (sentiment) {
        // Imbalance is critical for short-term direction (0.1 = 10% imbalance)
        // Add direct weight from imbalance
        score += sentiment.imbalance * 2.5; // Heavy weight on real-time book

        if (sentiment.imbalance > 0.15) sentimentNote = " + High Buy Pressure";
        if (sentiment.imbalance < -0.15) sentimentNote = " + High Sell Pressure";

        // Macro Sentiment Alignment
        // If Fear (<30) AND Technicals are Bearish -> Boost Score (Strong Short)
        if (sentiment.value < 30 && !isTechnicalBullish) score -= 0.3;
        // If Greed (>70) AND Technicals are Bullish -> Boost Score (Strong Long)
        if (sentiment.value > 70 && isTechnicalBullish) score += 0.3;
        
        // Counter-Trend Penalty (Fighting the tape)
        if (sentiment.value < 30 && isTechnicalBullish) score -= 0.2; // Don't trust pumps in fear
    }

    const finalSide = score > 0 ? Side.LONG : Side.SHORT;
    
    // Calculate Confidence based on agreement between Trend and Score
    // If Trend is Bullish and Score is High Positive -> High Confidence
    let confidence = 0.60 + (Math.abs(score) * 0.2); 
    
    // Penalty for weak conviction
    if (Math.abs(sentiment?.imbalance || 0) < 0.05) confidence -= 0.1;

    confidence = Math.min(0.95, confidence); // Cap at 95%

    const volatility = (last.high - last.low) / last.close;
    
    // STRATEGY UPDATE: Widen stops and targets for higher profitability
    const slPercent = Math.max(0.01, volatility * 2.5); // Minimum 1% stop or 2.5x volatility
    const tpPercent = slPercent * 3.0; // 3:1 Reward to Risk Ratio (Greedier)

    return {
      reasoning: `${prefixReason}Book Imbalance ${(sentiment?.imbalance! * 100).toFixed(1)}%${sentimentNote}. Target 3:1 R/R.`,
      confidence: confidence,
      side: finalSide,
      stopLoss: finalSide === Side.LONG ? price * (1 - slPercent) : price * (1 + slPercent),
      takeProfit: finalSide === Side.LONG ? price * (1 + tpPercent) : price * (1 - tpPercent),
      modelType: "Quant Engine v2",
      sentimentContext: sentiment?.classification
    };
};
