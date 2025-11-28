import React from 'react';
import { TradeSignal, Side } from '../types';
import { Zap, Activity, BrainCircuit, TrendingUp, TrendingDown, Target, Shield } from 'lucide-react';

interface SignalFeedProps {
  signals: TradeSignal[];
  onExecute: (signal: TradeSignal) => void;
}

export const SignalFeed: React.FC<SignalFeedProps> = ({ signals, onExecute }) => {
  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl border border-border overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="p-4 border-b border-border bg-black/40 flex items-center justify-between backdrop-blur-sm sticky top-0 z-10">
        <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 tracking-wide">
          <BrainCircuit className="w-4 h-4 text-primary animate-pulse-slow" />
          Neural Feed
        </h3>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-full border border-primary/20">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
            <span className="text-[9px] font-mono text-primary font-bold uppercase tracking-wider">Live</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-black/20">
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-textSecondary text-xs">
            <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4 shadow-inner">
                 <Activity className="w-8 h-8 text-border" />
            </div>
            <p className="animate-pulse">Analyzing market patterns...</p>
          </div>
        ) : (
          signals.map((signal) => (
            <div key={signal.id} className="group relative bg-[#0C0C0E] border border-border rounded-xl p-4 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-glow">
              {/* Side Strip */}
              <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl transition-all ${signal.side === Side.LONG ? 'bg-success shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-danger shadow-[0_0_10px_rgba(239,68,68,0.4)]'}`}></div>
              
              <div className="flex justify-between items-start mb-3 pl-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm tracking-tight">{signal.symbol}</span>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${signal.side === Side.LONG ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                    {signal.side === Side.LONG ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                    {signal.side}
                  </div>
                </div>
                <span className="text-[10px] text-textSecondary font-mono opacity-60">{new Date(signal.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-3 pl-2">
                 <div className="bg-black/40 p-2 rounded-lg border border-border/50">
                    <span className="block text-[9px] text-textSecondary mb-1 uppercase tracking-wider">Confidence</span>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full shadow-sm ${signal.confidence > 0.8 ? 'bg-gradient-to-r from-success to-emerald-400' : 'bg-gradient-to-r from-primary to-orange-400'}`} 
                                style={{ width: `${signal.confidence * 100}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-white">{(signal.confidence * 100).toFixed(0)}%</span>
                    </div>
                 </div>
                 <div className="bg-black/40 p-2 rounded-lg border border-border/50">
                    <span className="block text-[9px] text-textSecondary mb-1 uppercase tracking-wider">Targets</span>
                    <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-success flex items-center gap-0.5"><Target className="w-2.5 h-2.5"/> {((signal.takeProfit - signal.entryPrice)/signal.entryPrice * 100 * (signal.side===Side.LONG?1:-1)).toFixed(1)}%</span>
                        <span className="text-danger flex items-center gap-0.5"><Shield className="w-2.5 h-2.5"/> 2%</span>
                    </div>
                 </div>
              </div>

              <div className="text-[11px] text-textSecondary mb-4 leading-relaxed pl-3 border-l border-border/50 italic opacity-80">
                "{signal.reasoning}"
              </div>

              <button 
                onClick={() => onExecute(signal)}
                className="w-full py-2.5 ml-1 bg-surfaceHighlight hover:bg-surface text-white text-xs font-bold rounded-lg border border-border transition-all flex items-center justify-center gap-2 group-hover:border-primary/50 group-hover:text-primary shadow-sm active:scale-[0.98]"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                EXECUTE SIGNAL
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};