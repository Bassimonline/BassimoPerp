import React from 'react';
import { TradeSignal, Side } from '../types';
import { Zap, Activity, BrainCircuit, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SignalFeedProps {
  signals: TradeSignal[];
  onExecute: (signal: TradeSignal) => void;
}

export const SignalFeed: React.FC<SignalFeedProps> = ({ signals, onExecute }) => {
  return (
    <div className="flex flex-col h-full bg-surface rounded-xl border border-border overflow-hidden shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-surface to-background flex items-center justify-between">
        <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-primary" />
          AI Neural Feed
        </h3>
        <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-[10px] font-mono text-primary font-bold uppercase">Live</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-textSecondary text-xs">
            <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center mb-3">
                 <Activity className="w-6 h-6 opacity-30" />
            </div>
            <p>Scanning market data...</p>
          </div>
        ) : (
          signals.map((signal) => (
            <div key={signal.id} className="group relative bg-background border border-border rounded-lg p-4 hover:border-textSecondary transition-all duration-200 shadow-sm">
              <div className="absolute top-0 left-0 w-1 h-full rounded-l-lg bg-gradient-to-b from-transparent via-border to-transparent group-hover:via-primary transition-all"></div>
              
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-textPrimary text-sm">{signal.symbol}</span>
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${signal.side === Side.LONG ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                    {signal.side === Side.LONG ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
                    {signal.side}
                  </div>
                </div>
                <span className="text-[10px] text-textSecondary font-mono">{new Date(signal.timestamp).toLocaleTimeString()}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                 <div className="bg-surface p-2 rounded border border-border">
                    <span className="block text-[10px] text-textSecondary mb-0.5">Confidence</span>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${signal.confidence > 0.8 ? 'bg-success' : 'bg-primary'}`} 
                                style={{ width: `${signal.confidence * 100}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono font-bold text-textPrimary">{(signal.confidence * 100).toFixed(0)}%</span>
                    </div>
                 </div>
                 <div className="bg-surface p-2 rounded border border-border">
                    <span className="block text-[10px] text-textSecondary mb-0.5">Model</span>
                    <span className="text-[10px] text-primary font-mono truncate">{signal.modelType.split(' ')[0]}</span>
                 </div>
              </div>

              <div className="text-xs text-textSecondary mb-4 leading-relaxed pl-2 border-l-2 border-border italic">
                "{signal.reasoning}"
              </div>

              <button 
                onClick={() => onExecute(signal)}
                className="w-full py-2 bg-surfaceHighlight hover:bg-border text-textPrimary text-xs font-bold rounded border border-border transition-all flex items-center justify-center gap-2 group-hover:border-primary/50 group-hover:text-primary"
              >
                <Zap className="w-3 h-3 fill-current" />
                EXECUTE SIGNAL
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};