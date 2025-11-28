
import React, { useEffect, useState, useRef } from 'react';
import { fetchKlines, subscribeToTicker, subscribeToDepth, subscribeToKline, subscribeToMarkPrice, fetchOrderBook, fetchFearAndGreedIndex } from './services/binanceService';
import { generateMarketAnalysis } from './services/geminiService';
import { Candle, Side, Timeframe, TradeSignal, Position, AccountInfo, OrderBookData, UserSettings, AppNotification, ClosedTrade, AiLog, TokenConfig, SentimentData } from './types';
import { AVAILABLE_TOKENS, getIconUrl } from './constants';
import { CandleChart } from './components/CandleChart';
import { SignalFeed } from './components/SignalFeed';
import { TradePanel } from './components/TradePanel';
import { OrderBook } from './components/OrderBook';
import { SettingsModal } from './components/SettingsModal';
import { ExecutionModal } from './components/ExecutionModal';
import { NotificationToast } from './components/NotificationToast';
import { StatsDashboard } from './components/StatsDashboard';
import { AiThinkingFeed } from './components/AiThinkingFeed';
import { LiquidationCalculator } from './components/LiquidationCalculator';
import { 
  LayoutDashboard, 
  Wallet, 
  BarChart2, 
  Settings, 
  Cpu, 
  Layers, 
  LogOut, 
  ChevronDown, 
  Bot, 
  Play,
  Calculator,
  Gauge,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const DEFAULT_SETTINGS: UserSettings = {
    notifications: { push: true, telegram: false, email: false },
    autoTrade: true, 
    minConfidence: 0.70, 
    telegramHandle: '',
    emailAddress: ''
};

const NavItem = ({ icon, active = false, onClick }: { icon: React.ReactNode, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-xl transition-all duration-300 ${active ? 'bg-primary text-black shadow-glow' : 'text-textSecondary hover:bg-surfaceHighlight hover:text-white'}`}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
  </button>
);

const App: React.FC = () => {
  const [activeToken, setActiveToken] = useState<TokenConfig>(AVAILABLE_TOKENS[0]);
  const [symbol, setSymbol] = useState(AVAILABLE_TOKENS[0].symbol);
  
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [price, setPrice] = useState<number>(0);
  const [markPrice, setMarkPrice] = useState<number>(0); 
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<ClosedTrade[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [account, setAccount] = useState<AccountInfo>({
    balance: 10000,
    equity: 10000,
    marginUsed: 0,
    freeMargin: 10000,
    dayPnL: 0,
    startBalance: 10000
  });
  
  const [sentiment, setSentiment] = useState<SentimentData>({ value: 50, classification: 'Neutral', imbalance: 0 });
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [view, setView] = useState<'dashboard' | 'analytics' | 'calculator'>('dashboard');
  
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const [executionModalOpen, setExecutionModalOpen] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<TradeSignal | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<Set<string>>(new Set()); 
  const lastExecutionRef = useRef<number>(0); 
  const candlesRef = useRef<Candle[]>([]); 
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTokenDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  useEffect(() => {
      const loadSentiment = async () => {
          const data = await fetchFearAndGreedIndex();
          setSentiment(prev => ({ ...prev, value: data.value || 50, classification: data.classification || 'Neutral' }));
      };
      loadSentiment();
      const interval = setInterval(loadSentiment, 3600000);
      return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      if (orderBook) {
          const totalBids = orderBook.bids.reduce((acc, bid) => acc + bid.total, 0);
          const totalAsks = orderBook.asks.reduce((acc, ask) => acc + ask.total, 0);
          const total = totalBids + totalAsks;
          const imbalance = total > 0 ? (totalBids - totalAsks) / total : 0;
          setSentiment(prev => ({ ...prev, imbalance }));
      }
  }, [orderBook]);

  const handleTokenSelect = (token: TokenConfig) => {
      setSymbol(token.symbol);
      setActiveToken(token);
      setIsTokenDropdownOpen(false);
  };

  const addNotification = (type: AppNotification['type'], title: string, message: string) => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, type, title, message }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addAiLog = (message: string, type: AiLog['type'] = 'info') => {
      setAiLogs(prev => {
         const last = prev[prev.length - 1];
         if (last && last.message === message && Date.now() - last.timestamp < 2000) return prev;
         return [...prev, { id: Math.random().toString(36), timestamp: Date.now(), message, type }];
      });
  };

  // ----------------------------------------------------------------------
  // AUTO-PILOT LOOP
  // ----------------------------------------------------------------------
  useEffect(() => {
    if (!userSettings.autoTrade) return;

    const autoPilotLoop = setInterval(() => {
        if (!isAiAnalyzing) {
            handleAiAnalysis();
        }
    }, 15000); 

    return () => clearInterval(autoPilotLoop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSettings.autoTrade, isAiAnalyzing, symbol, price]); 

  // ----------------------------------------------------------------------
  // HYBRID DATA LOADING
  // ----------------------------------------------------------------------
  useEffect(() => {
    let isActive = true;
    let wsTicker: any = null;
    let wsMark: any = null; 
    let wsKline: any = null;
    let wsDepth: any = null;
    let checkDepthInterval: any = null;

    const startDataStream = async () => {
        setCandles([]);
        setOrderBook(null);
        addAiLog(`Connecting to ${symbol}...`, 'info');

        wsTicker = subscribeToTicker(symbol, (newPrice) => {
            if (!isActive) return;
            const now = Date.now();
            if (now - lastUpdateRef.current > 100) { 
                setPrice(newPrice);
                setCandles(prev => {
                    if (prev.length === 0) return prev;
                    const last = prev[prev.length - 1];
                    const updated = {
                        ...last,
                        close: newPrice,
                        high: Math.max(last.high, newPrice),
                        low: Math.min(last.low, newPrice)
                    };
                    return [...prev.slice(0, -1), updated];
                });
                lastUpdateRef.current = now;
            }
        });

        wsMark = subscribeToMarkPrice(symbol, (newMark) => {
            if (!isActive) return;
            setMarkPrice(newMark);
            handlePriceUpdate(newMark, symbol); 
        });

        wsKline = subscribeToKline(symbol, timeframe, (candle) => {
            if (!isActive) return;
            setCandles(prev => {
                if (prev.length === 0) return [candle];
                const last = prev[prev.length - 1];
                if (last.time === candle.time) {
                    return [...prev.slice(0, -1), candle]; 
                } else {
                    return [...prev, candle];
                }
            });
        });

        // Depth Stream with Watchdog for Mock Generation
        wsDepth = subscribeToDepth(symbol, (newBook) => {
            if (!isActive) return;
            setOrderBook(newBook);
        });

        // Keep checking if Orderbook is empty, if so, generate Mock
        checkDepthInterval = setInterval(() => {
            if (!isActive) return;
            if (wsDepth && wsDepth.checkLiveness && price > 0) {
                wsDepth.checkLiveness(price);
            }
        }, 1000);

        try {
            const [klineData, bookData] = await Promise.all([
                fetchKlines(symbol, timeframe),
                fetchOrderBook(symbol)
            ]);

            if (!isActive) return;

            setCandles(prev => {
                if (prev.length > 0 && klineData.length > 0) {
                     const lastHist = klineData[klineData.length - 1];
                     const lastLive = prev[prev.length - 1];
                     if (lastHist.time === lastLive.time) {
                         return [...klineData.slice(0, -1), lastLive];
                     }
                     return [...klineData, ...prev.filter(c => c.time > lastHist.time)];
                }
                return klineData;
            });
            
            if (!orderBook && bookData) {
                setOrderBook(bookData);
            }
            
            if (price === 0 && klineData.length > 0) {
                setPrice(klineData[klineData.length - 1].close);
                setMarkPrice(klineData[klineData.length - 1].close);
            }

        } catch (e) {
            console.error("Data Fetch Error", e);
        }
    };

    startDataStream();

    return () => {
        isActive = false;
        clearInterval(checkDepthInterval);
        if (wsTicker && wsTicker.close) wsTicker.close();
        if (wsMark && wsMark.close) wsMark.close();
        if (wsKline && wsKline.close) wsKline.close();
        if (wsDepth && wsDepth.close) wsDepth.close();
    };
  }, [symbol, timeframe]);

  const handlePriceUpdate = (currentMarkPrice: number, currentSymbol: string) => {
    setPositions(prevPositions => {
        const updatedPositions = prevPositions.map(pos => {
            if (pos.symbol !== currentSymbol) return pos;

            const multiplier = pos.side === Side.LONG ? 1 : -1;
            const priceDiff = (currentMarkPrice - pos.entryPrice) / pos.entryPrice;
            const uPnL = pos.size * pos.leverage * priceDiff * multiplier;
            
            const isLiquidated = 
                (pos.side === Side.LONG && currentMarkPrice <= pos.liquidationPrice) ||
                (pos.side === Side.SHORT && currentMarkPrice >= pos.liquidationPrice);

            if (isLiquidated && !closingRef.current.has(pos.id)) {
                setTimeout(() => liquidatePosition(pos), 0);
            }

            if (!closingRef.current.has(pos.id) && Date.now() - pos.timestamp > 5000) {
                 if (pos.side === Side.LONG) {
                    if (pos.takeProfit && currentMarkPrice >= pos.takeProfit) {
                        setTimeout(() => closePosition(pos.id, "Take Profit"), 0);
                    } else if (pos.stopLoss && currentMarkPrice <= pos.stopLoss) {
                        setTimeout(() => closePosition(pos.id, "Stop Loss"), 0);
                    }
                } else {
                    if (pos.takeProfit && currentMarkPrice <= pos.takeProfit) {
                        setTimeout(() => closePosition(pos.id, "Take Profit"), 0);
                    } else if (pos.stopLoss && currentMarkPrice >= pos.stopLoss) {
                        setTimeout(() => closePosition(pos.id, "Stop Loss"), 0);
                    }
                }
            }

            return { ...pos, unrealizedPnL: uPnL, markPrice: currentMarkPrice };
        });
        return updatedPositions;
    });

    setPositions(current => {
        const totalPnL = current.reduce((acc, p) => acc + p.unrealizedPnL, 0);
        setAccount(prev => ({
            ...prev,
            equity: prev.balance + totalPnL,
            dayPnL: (prev.balance + totalPnL) - prev.startBalance
        }));
        return current;
    });
  };

  const initiateTrade = (signal: TradeSignal) => {
      setSelectedSignal(signal);
      setExecutionModalOpen(true);
  };

  const executeTrade = (signal: TradeSignal | null, manualOverride?: { side: Side, size: number, leverage: number, tp?: number, sl?: number }) => {
    const side = manualOverride ? manualOverride.side : signal?.side;
    const size = manualOverride ? manualOverride.size : 1000;
    const leverage = manualOverride ? manualOverride.leverage : 10;
    
    if (!side) return;

    lastExecutionRef.current = Date.now();
    const entry = price; 
    
    let tp = manualOverride?.tp;
    let sl = manualOverride?.sl;

    if (!tp) tp = side === Side.LONG ? entry * 1.06 : entry * 0.94; 
    if (!sl) sl = side === Side.LONG ? entry * 0.98 : entry * 1.02; 

    if (side === Side.LONG && sl >= entry) sl = entry * 0.98;
    if (side === Side.SHORT && sl <= entry) sl = entry * 1.02;

    const mmr = 0.005;
    let liqPrice = 0;
    if (side === Side.LONG) {
        liqPrice = entry * (1 - (1/leverage) + mmr);
    } else {
        liqPrice = entry * (1 + (1/leverage) - mmr);
    }

    const marginAmount = size / leverage;

    const newPosition: Position = {
      id: Math.random().toString(36).substr(2, 9),
      symbol,
      side,
      size,
      margin: marginAmount,
      entryPrice: entry,
      markPrice: entry,
      leverage,
      unrealizedPnL: 0,
      liquidationPrice: liqPrice,
      takeProfit: tp,
      stopLoss: sl,
      timestamp: Date.now() 
    };

    setPositions(prev => [newPosition, ...prev]);
    setAccount(prev => ({
        ...prev,
        marginUsed: prev.marginUsed + marginAmount,
        freeMargin: prev.freeMargin - marginAmount
    }));
    addNotification('success', 'Order Filled', `${side} ${symbol} x${leverage} @ $${entry.toFixed(2)}`);
    addAiLog(`Executed ${side} order on ${symbol}. Size: $${size}, Lev: ${leverage}x. Liq: $${liqPrice.toFixed(2)}`, 'execution');
    setExecutionModalOpen(false);
  };

  const liquidatePosition = (pos: Position) => {
      if (closingRef.current.has(pos.id)) return;
      closingRef.current.add(pos.id);

      const loss = -pos.margin;
      const closedTrade: ClosedTrade = {
            id: pos.id,
            symbol: pos.symbol,
            side: pos.side,
            entryPrice: pos.entryPrice,
            exitPrice: pos.liquidationPrice,
            size: pos.size,
            leverage: pos.leverage,
            pnl: loss,
            pnlPercent: -100,
            closeReason: "LIQUIDATION",
            timestamp: Date.now()
        };

        setHistory(prev => [closedTrade, ...prev]);
        setAccount(prev => {
            const newBalance = prev.balance + loss;
            const newMarginUsed = prev.marginUsed - pos.margin;
            const newFreeMargin = prev.freeMargin + pos.margin + loss; 
            return {
                ...prev,
                balance: newBalance,
                equity: newBalance,
                marginUsed: newMarginUsed,
                freeMargin: newFreeMargin,
                dayPnL: newBalance - prev.startBalance
            };
        });

        addAiLog(`CRITICAL: Position ${pos.symbol} LIQUIDATED. Loss: $${loss.toFixed(2)}`, 'alert');
        addNotification('error', 'LIQUIDATION ALERT', `Position ${pos.symbol} has been liquidated.`);
        
        setPositions(prev => prev.filter(p => p.id !== pos.id));
        setTimeout(() => closingRef.current.delete(pos.id), 1000);
  };

  const closePosition = (id: string, reason: string = "Manual Close") => {
    if (closingRef.current.has(id)) return;
    closingRef.current.add(id);

    setPositions(prevPositions => {
        const pos = prevPositions.find(p => p.id === id);
        if (!pos) {
            closingRef.current.delete(id); 
            return prevPositions;
        }

        const pnl = pos.unrealizedPnL;
        const margin = pos.margin;
        const pnlPercent = (pnl / margin) * 100;

        let finalReason = reason;
        if (reason === "Take Profit" && pnl <= 0) {
            finalReason = "Close (Break Even/Loss)";
        }

        const closedTrade: ClosedTrade = {
            id: pos.id,
            symbol: pos.symbol,
            side: pos.side,
            entryPrice: pos.entryPrice,
            exitPrice: pos.markPrice,
            size: pos.size,
            leverage: pos.leverage,
            pnl: pnl,
            pnlPercent: pnlPercent,
            closeReason: finalReason,
            timestamp: Date.now()
        };

        setHistory(prev => [closedTrade, ...prev]);
        setAccount(prev => {
            const newBalance = prev.balance + pnl;
            const newMarginUsed = prev.marginUsed - margin;
            const newFreeMargin = prev.freeMargin + margin + pnl;
            return {
                ...prev,
                balance: newBalance,
                equity: newBalance,
                marginUsed: newMarginUsed,
                freeMargin: newFreeMargin,
                dayPnL: newBalance - prev.startBalance
            };
        });
        
        const logType = pnl > 0 ? 'decision' : 'alert';
        addAiLog(`Position ${pos.symbol} closed. PnL: $${pnl.toFixed(2)} (${finalReason})`, logType);
        
        if (reason.includes("Stop Loss") || reason.includes("Take Profit")) {
             addAiLog('Session Ended. Standing by for user signal.', 'info');
        }
        
        setTimeout(() => {
            if (closingRef.current) closingRef.current.delete(id);
        }, 1000);

        return prevPositions.filter(p => p.id !== id);
    });
  };

  const handleAiAnalysis = async () => {
    if (isAiAnalyzing) return;
    setIsAiAnalyzing(true);

    try {
        const aiResult = await generateMarketAnalysis(symbol, price, candles, sentiment);
        
        if (!aiResult.confidence || aiResult.confidence < 0.50) {
             addAiLog(`Scan: Low Signal (${(aiResult.confidence! * 100).toFixed(0)}%). Monitoring...`, 'scan');
             return; 
        }

        addAiLog(`Analysis: ${aiResult.side} (Conf: ${(aiResult.confidence! * 100).toFixed(0)}%). Sent: ${sentiment.classification}`, 'decision');

        const newSignal: TradeSignal = {
            id: Math.random().toString(36),
            symbol,
            side: aiResult.side || Side.LONG,
            confidence: aiResult.confidence || 0.75,
            entryPrice: price,
            stopLoss: aiResult.stopLoss || price * 0.98,
            takeProfit: aiResult.takeProfit || price * 1.05,
            timestamp: Date.now(),
            reasoning: aiResult.reasoning || "Market analysis complete.",
            modelType: aiResult.modelType || "Gemini Pro",
            sentimentContext: sentiment.classification
        };
        
        setSignals(prev => {
            const others = prev.filter(s => s.symbol !== newSignal.symbol);
            return [newSignal, ...others];
        });
        
        if (newSignal.confidence > 0.8) {
            addNotification('info', 'Strong AI Signal', `${newSignal.side} ${newSignal.symbol}`);
        }

        if (userSettings.autoTrade) {
            const existingPos = positions.find(p => p.symbol === newSignal.symbol);
            if (existingPos) {
                if (Date.now() - existingPos.timestamp < 60000) {
                     addAiLog(`Monitoring New Trade. PnL: ${existingPos.unrealizedPnL >= 0 ? '+' : ''}$${existingPos.unrealizedPnL.toFixed(2)}.`, 'scan');
                     return;
                }

                const flipThreshold = 0.80; 
                if (existingPos.side !== newSignal.side && newSignal.confidence >= flipThreshold) {
                    addAiLog(`Trend Reversal detected (${newSignal.side} - Conf ${Math.round(newSignal.confidence*100)}%). Flipping.`, 'alert');
                    addNotification('warning', 'Auto-Pilot Flip', `Reversing ${existingPos.side} position.`);
                    closePosition(existingPos.id, "AI Flip/Reversal");
                    setTimeout(() => {
                        executeTrade(newSignal, { 
                            side: newSignal.side, 
                            size: existingPos.size, 
                            leverage: existingPos.leverage,
                            tp: newSignal.takeProfit,
                            sl: newSignal.stopLoss
                        });
                    }, 800);
                } else {
                    if (existingPos.side !== newSignal.side) {
                        addAiLog(`Weak reversal (${Math.round(newSignal.confidence*100)}%). Holding ${existingPos.side}.`, 'decision');
                    } else {
                        addAiLog(`Trend Confirmed. Holding ${existingPos.side}. PnL: $${existingPos.unrealizedPnL.toFixed(2)}`, 'decision');
                    }
                }
            } else {
                if (newSignal.confidence >= userSettings.minConfidence) {
                    addAiLog(`Opportunity found (${newSignal.side}). Waiting for user execution.`, 'decision');
                }
            }
        }
    } catch (e) {
        console.error("AI Error", e);
        addAiLog('Analysis failed due to API connection.', 'alert');
    } finally {
        setIsAiAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-textPrimary font-sans overflow-hidden selection:bg-primary selection:text-black">
      <aside className="w-16 border-r border-border bg-surface/50 backdrop-blur-md flex flex-col items-center py-6 gap-8 z-20 shadow-2xl shrink-0">
        <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 shadow-glow cursor-pointer" onClick={() => setView('dashboard')}>
          <Cpu className="text-primary w-6 h-6 animate-pulse-slow" />
        </div>
        <nav className="flex-1 flex flex-col gap-6 w-full items-center">
            <NavItem icon={<LayoutDashboard />} active={view === 'dashboard'} onClick={() => setView('dashboard')} />
            <NavItem icon={<BarChart2 />} active={view === 'analytics'} onClick={() => setView('analytics')} />
            <NavItem icon={<Calculator />} active={view === 'calculator'} onClick={() => setView('calculator')} />
            <NavItem icon={<Layers />} />
        </nav>
        <div className="flex flex-col gap-6 items-center pb-2">
            <NavItem icon={<Settings />} onClick={() => setSettingsOpen(true)} />
            <NavItem icon={<LogOut />} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#000000] relative h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-50 pointer-events-none"></div>
        
        <NotificationToast notifications={notifications} removeNotification={removeNotification} />
        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} settings={userSettings} onSave={setUserSettings} />
        <ExecutionModal 
            isOpen={executionModalOpen} 
            onClose={() => setExecutionModalOpen(false)} 
            signal={selectedSignal} 
            balance={account.freeMargin}
            onConfirm={(size, leverage, tp, sl) => executeTrade(selectedSignal, { side: selectedSignal!.side, size, leverage, tp, sl })} 
        />

        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#27272A 1px, transparent 1px), linear-gradient(90deg, #27272A 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        </div>
        
        <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6 z-10 shrink-0 relative">
           <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

           <div className="flex items-center gap-6">
              <div className="flex flex-col">
                  <h1 className="text-lg font-bold tracking-tight text-white leading-none flex items-center gap-2">
                    <span className="text-primary">Perp</span>Trader AI
                  </h1>
                  <span className="text-[9px] text-textSecondary font-mono tracking-widest uppercase opacity-80">Pro Terminal v2.0</span>
              </div>
              <div className="h-8 w-px bg-border mx-2"></div>
              
              <div className="relative" ref={dropdownRef}>
                <button 
                    onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                    className="flex items-center gap-3 bg-surfaceHighlight border border-white/5 rounded-xl px-3 py-1.5 hover:border-primary/30 transition-colors group min-w-[160px] justify-between shadow-lg"
                >
                    <div className="flex items-center gap-2">
                        <img 
                            src={getIconUrl(activeToken.base)} 
                            alt={activeToken.base} 
                            className="w-6 h-6 rounded-full bg-white/10"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${activeToken.base}&background=2B3139&color=fff`
                            }}
                        />
                        <div className="flex flex-col items-start">
                            <span className="text-[9px] text-textSecondary font-bold leading-none mb-0.5 tracking-wider">MARKET</span>
                            <span className="font-bold font-mono text-sm leading-none text-white">{symbol}</span>
                        </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-textSecondary group-hover:text-primary transition-colors" />
                </button>
                
                {isTokenDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-[#0C0C0E] border border-border rounded-xl shadow-2xl z-50 py-1 max-h-80 overflow-y-auto custom-scrollbar backdrop-blur-xl">
                        {AVAILABLE_TOKENS.map(token => (
                            <button
                                key={token.symbol}
                                onClick={() => handleTokenSelect(token)}
                                className={`w-full text-left px-4 py-3 text-sm font-mono hover:bg-white/5 flex items-center gap-3 transition-colors ${symbol === token.symbol ? 'bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent'}`}
                            >
                                <img 
                                    src={getIconUrl(token.base)} 
                                    alt={token.base} 
                                    className="w-6 h-6 rounded-full"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.base}&background=2B3139&color=fff`
                                    }}
                                />
                                <div>
                                    <div className={`font-bold leading-none ${symbol === token.symbol ? 'text-primary' : 'text-textPrimary'}`}>{token.symbol}</div>
                                    <div className="text-[10px] text-textSecondary leading-none mt-1">{token.name}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
              </div>

              <div className="flex flex-col">
                <span className={`text-xl font-mono font-bold tracking-tight ${price > (candles[candles.length-2]?.close || 0) ? 'text-success drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'text-danger drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]'}`}>
                    ${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] text-textSecondary font-mono uppercase">Last</span>
                        <span className={`text-[9px] font-bold px-1 rounded ${sentiment.imbalance > 0 ? 'text-success' : 'text-danger'}`}>
                            {sentiment.imbalance > 0.05 ? '↑' : sentiment.imbalance < -0.05 ? '↓' : '-'}
                        </span>
                    </div>
                    {markPrice > 0 && (
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] text-primary font-mono uppercase">Mark</span>
                            <span className="text-[9px] font-mono text-white">${markPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                    )}
                </div>
              </div>
           </div>

           <div className="flex items-center gap-6">
              
              <div className="hidden lg:flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
                  <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                      <Gauge className="w-3.5 h-3.5 text-textSecondary" />
                      <div className="flex flex-col items-end">
                          <span className="text-[9px] text-textSecondary leading-none uppercase">Macro</span>
                          <span className={`text-[10px] font-bold leading-none ${
                              sentiment.value > 60 ? 'text-success' : sentiment.value < 40 ? 'text-danger' : 'text-primary'
                          }`}>
                              {sentiment.classification}
                          </span>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      {sentiment.imbalance > 0 ? <TrendingUp className="w-3.5 h-3.5 text-success" /> : <TrendingDown className="w-3.5 h-3.5 text-danger" />}
                      <div className="flex flex-col items-end">
                          <span className="text-[9px] text-textSecondary leading-none uppercase">Micro</span>
                          <span className={`text-[10px] font-bold leading-none ${sentiment.imbalance > 0 ? 'text-success' : 'text-danger'}`}>
                              {(sentiment.imbalance * 100).toFixed(1)}%
                          </span>
                      </div>
                  </div>
              </div>

              {userSettings.autoTrade && (
                  <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full shadow-glow">
                      <div className="relative">
                        <Bot className="w-4 h-4 text-primary" />
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-success rounded-full border border-black"></span>
                      </div>
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Co-Pilot Active</span>
                  </div>
              )}

              <div className="flex gap-4 bg-gradient-to-br from-surface to-black border border-white/10 rounded-xl p-2 px-4 shadow-lg">
                 <div className="flex flex-col items-end">
                    <span className="text-[9px] text-textSecondary uppercase tracking-wider">Equity</span>
                    <span className="text-xs font-mono font-bold text-white">
                        ${account.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                 </div>
                 <div className="w-px bg-white/10 h-full"></div>
                 <div className="flex flex-col items-end">
                    <span className="text-[9px] text-textSecondary uppercase tracking-wider">PnL (24h)</span>
                    <span className={`text-xs font-mono font-bold ${account.dayPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                        {account.dayPnL >= 0 ? '+' : ''}{account.dayPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                 </div>
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-20 scroll-smooth">
            {view === 'dashboard' ? (
                <div className="grid grid-cols-12 gap-4 h-full min-h-[800px]">
                    
                    <div className="col-span-12 lg:col-span-9 flex flex-col gap-4">
                        
                        <div className="flex flex-col lg:flex-row gap-4 h-[550px]">
                            <div className="flex-1 glass-panel rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden relative group">
                                <div className="absolute top-4 left-4 z-10 flex gap-1 p-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/5">
                                    {(['1m', '5m', '15m', '1h', '4h', '1d'] as Timeframe[]).map(tf => (
                                        <button 
                                            key={tf}
                                            onClick={() => setTimeframe(tf)}
                                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${timeframe === tf ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-textSecondary hover:bg-white/10 hover:text-white'}`}
                                        >
                                            {tf}
                                        </button>
                                    ))}
                                </div>
                                <CandleChart data={candles} />
                            </div>

                            <div className="w-full lg:w-72 glass-panel rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
                                <div className="p-3 border-b border-border bg-black/20 backdrop-blur-sm">
                                    <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider">Order Book</h3>
                                </div>
                                <div className="flex-1">
                                    <OrderBook data={orderBook} currentPrice={price} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="glass-panel rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden min-h-[250px]">
                                <div className="p-4 border-b border-border bg-black/20 flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-primary" />
                                        Open Positions
                                    </h3>
                                    <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-textSecondary border border-white/5 font-mono">{positions.length} Active</span>
                                </div>
                                <div className="flex-1 overflow-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-black/40 text-[10px] text-textSecondary uppercase tracking-wider font-bold sticky top-0 z-10 backdrop-blur-md">
                                            <tr>
                                                <th className="p-3 pl-4">Symbol</th>
                                                <th className="p-3">Side</th>
                                                <th className="p-3">Margin (Lev)</th>
                                                <th className="p-3">Entry</th>
                                                <th className="p-3">Mark</th>
                                                <th className="p-3">Liq. Price</th>
                                                <th className="p-3">PnL (ROE%)</th>
                                                <th className="p-3 text-right pr-4">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs font-mono text-gray-300">
                                            {positions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="p-12 text-center text-textSecondary/50 italic">
                                                        No active positions.
                                                    </td>
                                                </tr>
                                            ) : (
                                                positions.map(pos => (
                                                    <tr key={pos.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                        <td className="p-3 pl-4 font-bold text-white group-hover:text-primary transition-colors">{pos.symbol}</td>
                                                        <td className={`p-3 font-bold ${pos.side === Side.LONG ? 'text-success' : 'text-danger'}`}>{pos.side}</td>
                                                        <td className="p-3">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-white">${pos.margin.toLocaleString()} <span className="text-textSecondary text-[10px]">({pos.leverage}x)</span></span>
                                                                <span className="text-textSecondary text-[10px] opacity-60">Size: ${pos.size.toLocaleString()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-textSecondary">${pos.entryPrice.toFixed(2)}</td>
                                                        <td className="p-3 text-white">${pos.markPrice.toFixed(2)}</td>
                                                        <td className={`p-3 font-bold ${
                                                            Math.abs((pos.markPrice - pos.liquidationPrice) / pos.markPrice) < 0.05 ? 'text-danger animate-pulse' : 'text-primary/70'
                                                        }`}>
                                                            ${pos.liquidationPrice.toFixed(2)}
                                                        </td>
                                                        <td className={`p-3 font-bold ${pos.unrealizedPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                                                            ${pos.unrealizedPnL.toFixed(2)} <span className="opacity-60 text-[10px]">({((pos.unrealizedPnL / pos.margin)*100).toFixed(2)}%)</span>
                                                        </td>
                                                        <td className="p-3 text-right pr-4">
                                                            <button 
                                                                onClick={() => closePosition(pos.id)}
                                                                className="px-3 py-1.5 bg-surface border border-white/10 rounded-lg text-[10px] font-bold hover:bg-white hover:text-black transition-all shadow-sm active:scale-95"
                                                            >
                                                                Close
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="min-h-[250px] overflow-hidden">
                                <AiThinkingFeed 
                                    logs={aiLogs} 
                                    onScan={handleAiAnalysis}
                                    isScanning={isAiAnalyzing}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-full">
                        <div className="flex-shrink-0">
                            <TradePanel 
                                symbol={symbol} 
                                price={price} 
                                balance={account.freeMargin} 
                                onTrade={(side, amount, leverage) => executeTrade(null, { side, size: amount, leverage })} 
                            />
                        </div>
                        
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <SignalFeed 
                                signals={signals} 
                                onExecute={(signal) => initiateTrade(signal)} 
                            />
                        </div>
                    </div>
                </div>
            ) : view === 'analytics' ? (
                <div className="h-full">
                    <StatsDashboard history={history} account={account} />
                </div>
            ) : (
                <div className="h-full">
                    <LiquidationCalculator />
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
