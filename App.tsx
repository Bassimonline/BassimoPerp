
import React, { useEffect, useState, useRef } from 'react';
import { fetchKlines, subscribeToTicker, fetchOrderBook } from './services/binanceService';
import { generateMarketAnalysis } from './services/geminiService';
import { Candle, Side, Timeframe, TradeSignal, Position, AccountInfo, OrderBookData, UserSettings, AppNotification, ClosedTrade, AiLog } from './types';
import { CandleChart } from './components/CandleChart';
import { SignalFeed } from './components/SignalFeed';
import { TradePanel } from './components/TradePanel';
import { OrderBook } from './components/OrderBook';
import { SettingsModal } from './components/SettingsModal';
import { ExecutionModal } from './components/ExecutionModal';
import { NotificationToast } from './components/NotificationToast';
import { StatsDashboard } from './components/StatsDashboard';
import { AiThinkingFeed } from './components/AiThinkingFeed';
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
  Play
} from 'lucide-react';

const TOKENS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'SHIBUSDT', 'DOTUSDT',
  'LINKUSDT', 'MATICUSDT', 'PEPEUSDT', 'WIFUSDT'
];

const DEFAULT_SETTINGS: UserSettings = {
    notifications: { push: true, telegram: false, email: false },
    autoTrade: true, // Default ON (Co-Pilot Mode)
    minConfidence: 0.70, // Increased default to 70%
    telegramHandle: '',
    emailAddress: ''
};

const NavItem = ({ icon, active = false, onClick }: { icon: React.ReactNode, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-xl transition-all ${active ? 'bg-primary text-black shadow-glow' : 'text-textSecondary hover:bg-surfaceHighlight hover:text-white'}`}
  >
    {React.cloneElement(icon as React.ReactElement, { size: 20 })}
  </button>
);

const App: React.FC = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [price, setPrice] = useState<number>(0);
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
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [view, setView] = useState<'dashboard' | 'analytics'>('dashboard');
  
  // New States
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  // Execution Modal State
  const [executionModalOpen, setExecutionModalOpen] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<TradeSignal | null>(null);

  // Refs for Logic Safety
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<Set<string>>(new Set()); // Lock to prevent double-closing race conditions
  const lastExecutionRef = useRef<number>(0); // Timestamp of last execution to prevent immediate re-scanning

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTokenDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // Notifications Helper
  const addNotification = (type: AppNotification['type'], title: string, message: string) => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, type, title, message }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addAiLog = (message: string, type: AiLog['type'] = 'info') => {
      // Prevents double-logging in React StrictMode
      setAiLogs(prev => {
         // Simple de-bounce check: if the last log is identical and < 500ms ago, skip
         const last = prev[prev.length - 1];
         if (last && last.message === message && Date.now() - last.timestamp < 500) return prev;
         return [...prev, { id: Math.random().toString(36), timestamp: Date.now(), message, type }];
      });
  };

  // Data Fetching
  useEffect(() => {
    const loadData = async () => {
      const klineData = await fetchKlines(symbol, timeframe);
      setCandles(klineData);
      if (klineData.length > 0) setPrice(klineData[klineData.length - 1].close);
      
      const bookData = await fetchOrderBook(symbol);
      setOrderBook(bookData);
      addAiLog(`Market data loaded for ${symbol}`, 'info');
    };
    loadData();
    const interval = setInterval(loadData, 30000); 
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  // OrderBook Real-time polling
  useEffect(() => {
    const interval = setInterval(async () => {
        const bookData = await fetchOrderBook(symbol);
        setOrderBook(bookData);
    }, 3000);
    return () => clearInterval(interval);
  }, [symbol]);

  // WebSocket for Price & TP/SL Monitoring
  useEffect(() => {
    const ws = subscribeToTicker(symbol, (newPrice) => {
      setPrice(newPrice);
      setCandles(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const updated = { ...last, close: newPrice, high: Math.max(last.high, newPrice), low: Math.min(last.low, newPrice) };
        return [...prev.slice(0, -1), updated];
      });
      updatePnL(newPrice);
    });
    return () => ws.close();
  }, [symbol]);

  // Dedicated TP/SL Monitor (Runs on price update)
  useEffect(() => {
    positions.forEach(pos => {
        // Only monitor TP/SL for the currently active symbol's price stream
        if (pos.symbol !== symbol) return;

        // SKIP if already processing close (prevents double logging/execution)
        if (closingRef.current.has(pos.id)) return;

        // SETTLEMENT BUFFER: Ignore checks for first 5 seconds to prevent spread stops
        if (Date.now() - pos.timestamp < 5000) return;

        if (pos.side === Side.LONG) {
            if (pos.takeProfit && price >= pos.takeProfit) {
                closePosition(pos.id, "Take Profit");
                addNotification('success', 'Take Profit Hit', `Closed LONG ${pos.symbol} at $${price.toFixed(2)}`);
                addAiLog('Session Ended (TP). Standing by for user signal.', 'info');
            } else if (pos.stopLoss && price <= pos.stopLoss) {
                closePosition(pos.id, "Stop Loss");
                addNotification('warning', 'Stop Loss Hit', `Closed LONG ${pos.symbol} at $${price.toFixed(2)}`);
                addAiLog('Session Ended (SL). Standing by for user signal.', 'info');
            }
        } else {
            if (pos.takeProfit && price <= pos.takeProfit) {
                closePosition(pos.id, "Take Profit");
                addNotification('success', 'Take Profit Hit', `Closed SHORT ${pos.symbol} at $${price.toFixed(2)}`);
                addAiLog('Session Ended (TP). Standing by for user signal.', 'info');
            } else if (pos.stopLoss && price >= pos.stopLoss) {
                closePosition(pos.id, "Stop Loss");
                addNotification('warning', 'Stop Loss Hit', `Closed SHORT ${pos.symbol} at $${price.toFixed(2)}`);
                addAiLog('Session Ended (SL). Standing by for user signal.', 'info');
            }
        }
    });
  }, [price, positions, symbol]);

  // AI Auto-Pilot Analysis Loop
  useEffect(() => {
    if (!userSettings.autoTrade) return;

    // Increased interval to 30 seconds to avoid 429 Quota errors
    const autoPilotLoop = setInterval(() => {
        if (!isAiAnalyzing) {
            // Check if we recently executed a trade (within 5 seconds)
            // If so, skip scanning to let the order book/positions settle
            if (Date.now() - lastExecutionRef.current < 5000) {
               return; 
            }

            addAiLog(`Auto-Pilot Scanning ${symbol}...`, 'scan');
            handleAiAnalysis();
        }
    }, 30000); 

    return () => clearInterval(autoPilotLoop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSettings.autoTrade, isAiAnalyzing, symbol]);


  // PnL Logic - Real-time equity update
  const updatePnL = (currentPrice: number) => {
    setPositions(prevPositions => {
        return prevPositions.map(pos => {
            // CRITICAL FIX: Only update PnL for the active symbol.
            // Other positions retain their last known state to prevent data corruption.
            if (pos.symbol !== symbol) return pos;

            const multiplier = pos.side === Side.LONG ? 1 : -1;
            const priceDiff = (currentPrice - pos.entryPrice) / pos.entryPrice;
            const uPnL = pos.size * pos.leverage * priceDiff * multiplier;
            return { ...pos, unrealizedPnL: uPnL, markPrice: currentPrice };
        });
    });
    
    // Update Equity based on fresh positions calculation
    setPositions(currentPositions => {
        const totalUnrealizedPnL = currentPositions.reduce((acc, pos) => acc + pos.unrealizedPnL, 0);
        setAccount(prev => ({
            ...prev,
            equity: prev.balance + totalUnrealizedPnL,
            dayPnL: (prev.balance + totalUnrealizedPnL) - prev.startBalance
        }));
        return currentPositions;
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

    // Mark execution time to pause AI scans temporarily
    lastExecutionRef.current = Date.now();

    const entry = price;
    
    // Determine Safe TP/SL if not provided (WIDER DEFAULTS to prevent instant close)
    let tp = manualOverride?.tp;
    let sl = manualOverride?.sl;

    if (!tp) {
        // Default TP: 4% gain
        tp = side === Side.LONG ? entry * 1.04 : entry * 0.96;
    }
    if (!sl) {
        // Default SL: 2% risk
        sl = side === Side.LONG ? entry * 0.98 : entry * 1.02;
    }

    // Safety check: Ensure SL isn't hitting immediately at entry price
    if (side === Side.LONG && sl >= entry) sl = entry * 0.98;
    if (side === Side.SHORT && sl <= entry) sl = entry * 1.02;

    const newPosition: Position = {
      id: Math.random().toString(36).substr(2, 9),
      symbol,
      side,
      size,
      entryPrice: entry,
      markPrice: entry,
      leverage,
      unrealizedPnL: 0,
      liquidationPrice: side === Side.LONG ? entry * (1 - 1/leverage) : entry * (1 + 1/leverage),
      takeProfit: tp,
      stopLoss: sl,
      timestamp: Date.now() // Track creation time
    };

    setPositions(prev => [newPosition, ...prev]);
    setAccount(prev => ({
        ...prev,
        marginUsed: prev.marginUsed + (size / leverage),
        freeMargin: prev.freeMargin - (size / leverage)
    }));
    addNotification('success', 'Order Filled', `${side} ${symbol} x${leverage} @ $${entry.toFixed(2)}`);
    addAiLog(`Executed ${side} order on ${symbol}. Size: $${size}, Lev: ${leverage}x. Monitoring...`, 'execution');
    setExecutionModalOpen(false);
  };

  const closePosition = (id: string, reason: string = "Manual Close") => {
    // PREVENT DOUBLE CLOSING: Check lock
    if (closingRef.current.has(id)) return;
    
    // Acquire lock
    closingRef.current.add(id);

    setPositions(prevPositions => {
        const pos = prevPositions.find(p => p.id === id);
        if (!pos) {
            closingRef.current.delete(id); // Release if not found
            return prevPositions;
        }

        const pnl = pos.unrealizedPnL;
        const margin = pos.size / pos.leverage;
        const pnlPercent = (pnl / margin) * 100;

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
            closeReason: reason,
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
        
        // Log handled here securely
        addAiLog(`Position ${pos.symbol} closed. PnL: $${pnl.toFixed(2)} (${reason})`, pnl > 0 ? 'decision' : 'alert');
        
        // Keep lock for 1s to ensure all effects flush before allowing re-processing (safety)
        setTimeout(() => {
            if (closingRef.current) closingRef.current.delete(id);
        }, 1000);

        return prevPositions.filter(p => p.id !== id);
    });
  };

  // AI Analysis Logic
  const handleAiAnalysis = async () => {
    if (isAiAnalyzing) return;
    setIsAiAnalyzing(true);

    try {
        const aiResult = await generateMarketAnalysis(symbol, price, candles);
        addAiLog(`Market Analysis: ${aiResult.side} (Conf: ${(aiResult.confidence! * 100).toFixed(0)}%)`, 'decision');

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
            modelType: aiResult.modelType || "Gemini Pro Vision"
        };
        
        // DEDUPLICATION: Remove old signals for this symbol, add new one
        setSignals(prev => {
            const others = prev.filter(s => s.symbol !== newSignal.symbol);
            return [newSignal, ...others];
        });
        
        if (newSignal.confidence > 0.8) {
            addNotification('info', 'Strong AI Signal', `${newSignal.side} ${newSignal.symbol}`);
        }

        // CO-PILOT LOGIC: Manage Existing Positions
        if (userSettings.autoTrade) {
            // Check if we have an open position for this symbol
            const existingPos = positions.find(p => p.symbol === newSignal.symbol);
            
            if (existingPos) {
                // MANAGEMENT PHASE: We have a position, AI is allowed to manage/flip it.
                
                // GRACE PERIOD CHECK: Don't flip trades opened less than 60s ago
                if (Date.now() - existingPos.timestamp < 60000) {
                     return;
                }

                // STRICT ANTI-WHIPSAW: 
                // Only flip if confidence is VERY HIGH (> 80%).
                // Flipping at 65% or 70% is too risky and causes churn.
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
                        addAiLog(`Weak reversal signal (${Math.round(newSignal.confidence*100)}% < 80%). Holding ${existingPos.side}.`, 'decision');
                    } else {
                        addAiLog(`Holding ${existingPos.side}. Trend confirms.`, 'decision');
                    }
                }
            } else {
                // ENTRY PHASE: No position exists.
                // CRITICAL: DO NOT AUTO-EXECUTE. Strict "Signal Only" mode for entries.
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
      
      {/* Sidebar */}
      <aside className="w-16 border-r border-border flex flex-col items-center py-6 gap-8 bg-surface z-20 shadow-xl shrink-0">
        <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 shadow-glow cursor-pointer" onClick={() => setView('dashboard')}>
          <Cpu className="text-primary w-6 h-6" />
        </div>
        <nav className="flex-1 flex flex-col gap-6 w-full items-center">
            <NavItem icon={<LayoutDashboard />} active={view === 'dashboard'} onClick={() => setView('dashboard')} />
            <NavItem icon={<BarChart2 />} active={view === 'analytics'} onClick={() => setView('analytics')} />
            <NavItem icon={<Wallet />} />
            <NavItem icon={<Layers />} />
        </nav>
        <div className="flex flex-col gap-6 items-center pb-2">
            <NavItem icon={<Settings />} onClick={() => setSettingsOpen(true)} />
            <NavItem icon={<LogOut />} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0B0E11] relative h-screen overflow-hidden">
        <NotificationToast notifications={notifications} removeNotification={removeNotification} />
        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} settings={userSettings} onSave={setUserSettings} />
        
        {/* Execution Modal */}
        <ExecutionModal 
            isOpen={executionModalOpen} 
            onClose={() => setExecutionModalOpen(false)} 
            signal={selectedSignal} 
            balance={account.freeMargin}
            onConfirm={(size, leverage, tp, sl) => executeTrade(selectedSignal, { side: selectedSignal!.side, size, leverage, tp, sl })} 
        />

        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#2B3139 1px, transparent 1px), linear-gradient(90deg, #2B3139 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        </div>
        
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-surface/80 backdrop-blur-md z-10 shrink-0">
           <div className="flex items-center gap-6">
              <div className="flex flex-col">
                  <h1 className="text-lg font-bold tracking-tight text-white leading-none">PerpTrader</h1>
                  <span className="text-[10px] text-primary font-mono tracking-widest uppercase opacity-80">AI Terminal v2.0</span>
              </div>
              <div className="h-8 w-px bg-border mx-2"></div>
              
              {/* Symbol Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button 
                    onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                    className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 hover:border-textSecondary transition-colors group min-w-[140px] justify-between"
                >
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] text-textSecondary font-bold leading-none mb-0.5">MARKET</span>
                        <span className="font-bold font-mono text-sm leading-none">{symbol}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-textSecondary group-hover:text-primary transition-colors" />
                </button>
                
                {isTokenDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto custom-scrollbar">
                        {TOKENS.map(token => (
                            <button
                                key={token}
                                onClick={() => {
                                    setSymbol(token);
                                    setIsTokenDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm font-mono hover:bg-surfaceHighlight ${symbol === token ? 'text-primary font-bold bg-primary/5' : 'text-textPrimary'}`}
                            >
                                {token}
                            </button>
                        ))}
                    </div>
                )}
              </div>

              {/* Price Ticker */}
              <div className="flex flex-col">
                <span className={`text-lg font-mono font-bold ${price > (candles[candles.length-2]?.close || 0) ? 'text-success' : 'text-danger'}`}>
                    ${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-textSecondary font-mono">Mark Price</span>
              </div>
           </div>

           <div className="flex items-center gap-6">
              {/* Auto-Pilot Indicator */}
              {userSettings.autoTrade && (
                  <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full animate-pulse shadow-glow">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-bold text-primary uppercase">Co-Pilot: Armed</span>
                  </div>
              )}

              {/* Account Info */}
              <div className="flex gap-4 bg-background border border-border rounded-lg p-1.5 px-3 shadow-inner">
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] text-textSecondary">Equity (Live)</span>
                    <span className="text-xs font-mono font-bold text-white transition-all duration-300 ease-in-out">
                        ${account.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                 </div>
                 <div className="w-px bg-border h-full"></div>
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] text-textSecondary">Total PnL</span>
                    <span className={`text-xs font-mono font-bold transition-all duration-300 ${account.dayPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                        {account.dayPnL >= 0 ? '+' : ''}{account.dayPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                 </div>
              </div>
           </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-20 scroll-smooth">
            
            {view === 'dashboard' ? (
                <div className="grid grid-cols-12 gap-4 h-full min-h-[800px]">
                    {/* LEFT COLUMN (Chart & Positions) */}
                    <div className="col-span-12 lg:col-span-9 flex flex-col gap-4">
                        {/* Top Row: Chart + OrderBook */}
                        <div className="flex flex-col lg:flex-row gap-4 h-[550px]">
                            {/* Chart Area */}
                            <div className="flex-1 bg-surface border border-border rounded-xl shadow-lg flex flex-col overflow-hidden relative group">
                                <div className="absolute top-4 left-4 z-10 flex gap-2">
                                    {(['1m', '5m', '15m', '1h', '4h', '1d'] as Timeframe[]).map(tf => (
                                        <button 
                                            key={tf}
                                            onClick={() => setTimeframe(tf)}
                                            className={`px-2 py-1 rounded text-[10px] font-bold backdrop-blur-sm border transition-all ${timeframe === tf ? 'bg-primary text-black border-primary' : 'bg-surface/50 text-textSecondary border-border hover:bg-surfaceHighlight hover:text-white'}`}
                                        >
                                            {tf}
                                        </button>
                                    ))}
                                </div>
                                <CandleChart data={candles} />
                            </div>

                            {/* Order Book (Adjacent) */}
                            <div className="w-full lg:w-72 bg-surface border border-border rounded-xl shadow-lg overflow-hidden flex flex-col">
                                <div className="p-3 border-b border-border bg-surfaceHighlight/30">
                                    <h3 className="text-xs font-bold text-textSecondary uppercase">Order Book</h3>
                                </div>
                                <div className="flex-1">
                                    <OrderBook data={orderBook} currentPrice={price} />
                                </div>
                            </div>
                        </div>

                        {/* Middle Row: Positions Table */}
                        <div className="bg-surface border border-border rounded-xl shadow-lg flex flex-col overflow-hidden h-[300px]">
                            <div className="p-4 border-b border-border flex justify-between items-center bg-surfaceHighlight/10">
                                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-primary" />
                                    Open Positions
                                </h3>
                                <span className="text-xs text-textSecondary font-mono">{positions.length} Active</span>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-background text-[10px] text-textSecondary uppercase tracking-wider font-bold sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3">Symbol</th>
                                            <th className="p-3">Side</th>
                                            <th className="p-3">Size / Margin</th>
                                            <th className="p-3">Entry Price</th>
                                            <th className="p-3">Mark Price</th>
                                            <th className="p-3">Liq. Price</th>
                                            <th className="p-3">PnL (ROE%)</th>
                                            <th className="p-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-mono">
                                        {positions.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="p-8 text-center text-textSecondary italic">
                                                    No open positions. Start trading or enable Auto-Pilot.
                                                </td>
                                            </tr>
                                        ) : (
                                            positions.map(pos => (
                                                <tr key={pos.id} className="border-b border-border/50 hover:bg-surfaceHighlight/50 transition-colors">
                                                    <td className="p-3 font-bold text-textPrimary">{pos.symbol}</td>
                                                    <td className={`p-3 font-bold ${pos.side === Side.LONG ? 'text-success' : 'text-danger'}`}>{pos.side}</td>
                                                    <td className="p-3 text-textPrimary">
                                                        <div className="flex flex-col">
                                                            <span>${pos.size.toLocaleString()} <span className="text-textSecondary text-[10px]">({pos.leverage}x)</span></span>
                                                            <span className="text-textSecondary text-[10px] opacity-70">Margin: ${(pos.size / pos.leverage).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-textSecondary">${pos.entryPrice.toFixed(2)}</td>
                                                    <td className="p-3 text-textPrimary">${pos.markPrice.toFixed(2)}</td>
                                                    <td className="p-3 text-warning">${pos.liquidationPrice.toFixed(2)}</td>
                                                    <td className={`p-3 font-bold ${pos.unrealizedPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                                                        ${pos.unrealizedPnL.toFixed(2)} <span className="opacity-70">({((pos.unrealizedPnL / (pos.size/pos.leverage))*100).toFixed(2)}%)</span>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <button 
                                                            onClick={() => closePosition(pos.id)}
                                                            className="px-2 py-1 bg-surface border border-border rounded text-[10px] hover:bg-white hover:text-black transition-all"
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

                         {/* Bottom Row: AI Thinking Feed (Full Width) */}
                         <div className="flex-1 flex flex-col min-h-[250px] overflow-hidden">
                             <AiThinkingFeed logs={aiLogs} />
                             {/* Manual Scan Trigger */}
                             <button 
                                 onClick={handleAiAnalysis}
                                 disabled={isAiAnalyzing}
                                 className="mt-2 w-full py-3 bg-gradient-to-r from-primary to-yellow-400 text-black font-bold text-xs rounded-lg shadow-glow hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
                             >
                                 {isAiAnalyzing ? <span className="animate-pulse">Analyzing...</span> : <><Play className="w-3 h-3 fill-current"/> Scan Market Now</>}
                             </button>
                         </div>
                    </div>

                    {/* RIGHT COLUMN (Controls) */}
                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-full">
                        {/* Trade Panel */}
                        <div className="flex-shrink-0">
                            <TradePanel 
                                symbol={symbol} 
                                price={price} 
                                balance={account.freeMargin} 
                                onTrade={(side, amount, leverage) => executeTrade(null, { side, size: amount, leverage })} 
                            />
                        </div>
                        
                        {/* AI Signal Feed */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <SignalFeed 
                                signals={signals} 
                                onExecute={(signal) => initiateTrade(signal)} 
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-full">
                    <StatsDashboard history={history} account={account} />
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
