import React, { useState } from 'react';
import { Side } from '../types';
import { Settings, RefreshCw, Wallet, DollarSign } from 'lucide-react';

interface TradePanelProps {
  symbol: string;
  price: number;
  balance: number;
  onTrade: (side: Side, amount: number, leverage: number) => void;
}

export const TradePanel: React.FC<TradePanelProps> = ({ symbol, price, balance, onTrade }) => {
  const [leverage, setLeverage] = useState(20);
  const [amountUsd, setAmountUsd] = useState(1000);
  const [isOrdering, setIsOrdering] = useState(false);

  const handleOrder = (side: Side) => {
    setIsOrdering(true);
    setTimeout(() => {
        onTrade(side, amountUsd, leverage);
        setIsOrdering(false);
    }, 500);
  };

  const buyingPower = balance * leverage;
  const marginRequired = amountUsd / leverage;
  const maxPosition = buyingPower * 0.95; 

  return (
    <div className="glass-panel rounded-2xl p-5 h-full flex flex-col shadow-2xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex justify-between items-center mb-6 relative z-10">
        <h2 className="text-base font-bold text-textPrimary flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow"></div>
          Execution
        </h2>
        <div className="flex gap-2">
           <div className="bg-black/40 px-2 py-1 rounded border border-border text-[10px] text-textSecondary font-mono uppercase tracking-wide">
              Mode: <span className="text-primary font-bold">Cross</span>
           </div>
           <Settings className="w-4 h-4 text-textSecondary cursor-pointer hover:text-primary transition-colors" />
        </div>
      </div>

      {/* Leverage */}
      <div className="mb-6 bg-black/40 p-4 rounded-xl border border-border/50">
        <div className="flex justify-between text-xs text-textSecondary mb-4">
            <span className="font-medium tracking-wide">LEVERAGE</span>
            <span className="text-primary font-mono font-bold text-lg drop-shadow-md">{leverage}x</span>
        </div>
        <div className="relative h-6 flex items-center">
            <input 
            type="range" 
            min="1" 
            max="125" 
            value={leverage} 
            onChange={(e) => setLeverage(parseInt(e.target.value))}
            className="w-full h-1.5 bg-surfaceHighlight rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primaryHover transition-all z-10"
            />
            {/* Visual tick marks could go here */}
        </div>
        <div className="flex justify-between text-[9px] text-textSecondary mt-1 font-mono opacity-60">
            <span>1x</span>
            <span>25x</span>
            <span>50x</span>
            <span>75x</span>
            <span>125x</span>
        </div>
      </div>

      {/* Inputs */}
      <div className="mb-6 space-y-4">
        <div>
            <div className="flex justify-between mb-2">
                <label className="text-xs text-textSecondary font-bold tracking-wide uppercase">Size (USDT)</label>
                <div className="flex items-center gap-1 text-[10px] text-textSecondary">
                    <Wallet className="w-3 h-3" />
                    <span>Max: ${maxPosition.toLocaleString()}</span>
                </div>
            </div>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-textSecondary group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                    type="number" 
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(parseFloat(e.target.value))}
                    className="w-full bg-black/60 border border-border text-white text-sm rounded-xl py-3 pl-10 pr-12 focus:border-primary focus:ring-1 focus:ring-primary/50 focus:outline-none font-mono transition-all placeholder-gray-600 shadow-inner"
                    placeholder="0.00"
                />
                <span className="absolute right-3 top-3 text-xs text-textSecondary font-bold">USDT</span>
            </div>
        </div>
        
        <div className="p-3 bg-black/20 rounded-lg border border-border/30 text-xs space-y-2">
            <div className="flex justify-between">
                <span className="text-textSecondary">Initial Margin</span>
                <span className="text-white font-mono font-bold">${marginRequired.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-textSecondary">Account Balance</span>
                <span className="text-white font-mono">${balance.toFixed(2)}</span>
            </div>
        </div>
      </div>

      {/* 3D Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mt-auto">
        <button 
            disabled={isOrdering}
            onClick={() => handleOrder(Side.LONG)}
            className="
                group relative w-full py-3.5 rounded-xl font-bold text-white text-sm uppercase tracking-wider
                bg-success border-b-4 border-successDark
                active:border-b-0 active:translate-y-1 active:mt-1
                hover:brightness-110 transition-all
                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-4
                shadow-lg shadow-success/20
            "
        >
            <div className="flex items-center justify-center gap-2">
                {isOrdering ? <RefreshCw className="w-4 h-4 animate-spin"/> : 'Buy / Long'}
            </div>
        </button>
        
        <button 
            disabled={isOrdering}
            onClick={() => handleOrder(Side.SHORT)}
            className="
                group relative w-full py-3.5 rounded-xl font-bold text-white text-sm uppercase tracking-wider
                bg-danger border-b-4 border-dangerDark
                active:border-b-0 active:translate-y-1 active:mt-1
                hover:brightness-110 transition-all
                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-4
                shadow-lg shadow-danger/20
            "
        >
             <div className="flex items-center justify-center gap-2">
                {isOrdering ? <RefreshCw className="w-4 h-4 animate-spin"/> : 'Sell / Short'}
            </div>
        </button>
      </div>
    </div>
  );
};