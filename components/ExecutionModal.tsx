
import React, { useState, useEffect } from 'react';
import { TradeSignal, Side } from '../types';
import { X, Zap, Wallet } from 'lucide-react';

interface ExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  signal: TradeSignal | null;
  onConfirm: (size: number, leverage: number, tp: number, sl: number) => void;
  balance: number;
}

export const ExecutionModal: React.FC<ExecutionModalProps> = ({ isOpen, onClose, signal, onConfirm, balance }) => {
  if (!isOpen || !signal) return null;

  const [size, setSize] = useState(1000);
  const [leverage, setLeverage] = useState(10);

  const marginRequired = size / leverage;
  const maxSize = balance * leverage * 0.95; // 95% buffer

  const handleConfirm = () => {
    // Pass signal defaults for TP/SL since user controls are hidden
    onConfirm(size, leverage, signal.takeProfit, signal.stopLoss);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className={`p-4 border-b border-border flex justify-between items-center ${signal.side === Side.LONG ? 'bg-success/10' : 'bg-danger/10'}`}>
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${signal.side === Side.LONG ? 'text-success' : 'text-danger'}`}>
              <Zap className="w-5 h-5 fill-current" />
              EXECUTE {signal.side} {signal.symbol}
            </h2>
            <span className="text-[10px] text-textSecondary font-mono uppercase tracking-wider">
              Confidence: {(signal.confidence * 100).toFixed(0)}% • Model: {signal.modelType}
            </span>
          </div>
          <button onClick={onClose} className="text-textSecondary hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Signal Reasoning Recap */}
          <div className="p-3 bg-background rounded border border-border text-xs text-textSecondary italic">
            "{signal.reasoning}"
          </div>

          {/* Position Settings */}
          <div className="space-y-4">
            
            {/* Size Input */}
            <div>
              <label className="flex justify-between text-xs text-textPrimary font-bold mb-1.5">
                <span>Position Size (USDT)</span>
                <span className="text-textSecondary font-normal">Max: ${maxSize.toFixed(0)}</span>
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={size}
                  onChange={(e) => setSize(Math.min(parseFloat(e.target.value) || 0, maxSize))}
                  className="w-full bg-background border border-border rounded-lg p-3 text-sm text-white font-mono focus:border-primary focus:outline-none"
                />
                <Wallet className="absolute right-3 top-3 w-4 h-4 text-textSecondary" />
              </div>
            </div>

            {/* Leverage Slider */}
            <div>
              <label className="flex justify-between text-xs text-textPrimary font-bold mb-1.5">
                <span>Leverage</span>
                <span className="text-primary font-mono">{leverage}x</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="125" 
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-textSecondary mt-1 font-mono">
                <span>1x</span>
                <span>20x</span>
                <span>50x</span>
                <span>125x</span>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-surfaceHighlight/20 p-3 rounded-lg border border-border grid grid-cols-2 gap-2 text-xs">
               <div className="flex justify-between">
                 <span className="text-textSecondary">Margin Cost:</span>
                 <span className="font-mono text-white">${marginRequired.toFixed(2)}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-textSecondary">Entry Price:</span>
                 <span className="font-mono text-white">${signal.entryPrice.toFixed(2)}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-background flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-3 rounded-lg font-bold text-textSecondary text-xs hover:bg-surfaceHighlight transition-colors"
          >
            CANCEL
          </button>
          <button 
            onClick={handleConfirm}
            className={`flex-1 py-3 rounded-lg font-bold text-white text-xs shadow-lg transform active:scale-95 transition-all ${signal.side === Side.LONG ? 'bg-success hover:bg-successDark shadow-3d-success' : 'bg-danger hover:bg-dangerDark shadow-3d-danger'}`}
          >
            CONFIRM {signal.side}
          </button>
        </div>
      </div>
    </div>
  );
};
