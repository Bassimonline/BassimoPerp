import React, { useState } from 'react';
import { Side } from '../types';
import { Settings, RefreshCw, Info } from 'lucide-react';

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
    // Simulate latency
    setTimeout(() => {
        onTrade(side, amountUsd, leverage);
        setIsOrdering(false);
    }, 500);
  };

  const buyingPower = balance * leverage;
  const marginRequired = amountUsd / leverage;
  const maxPosition = buyingPower * 0.95; // Safety buffer

  return (
    <div className="bg-surface rounded-xl border border-border p-5 h-full flex flex-col shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-base font-bold text-textPrimary flex items-center gap-2">
          <span className="w-1 h-4 bg-primary rounded-full"></span>
          Place Order
        </h2>
        <div className="flex gap-2">
           <div className="bg-background px-2 py-1 rounded border border-border text-[10px] text-textSecondary font-mono">
              Margin Mode: <span className="text-primary">Cross</span>
           </div>
           <Settings className="w-4 h-4 text-textSecondary cursor-pointer hover:text-textPrimary transition-colors" />
        </div>
      </div>

      {/* Leverage Slider */}
      <div className="mb-6 bg-background p-4 rounded-lg border border-border">
        <div className="flex justify-between text-xs text-textSecondary mb-3">
            <span className="font-medium">Adjust Leverage</span>
            <span className="text-primary font-mono font-bold text-lg">{leverage}x</span>
        </div>
        <input 
          type="range" 
          min="1" 
          max="125" 
          value={leverage} 
          onChange={(e) => setLeverage(parseInt(e.target.value))}
          className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primaryHover transition-all"
        />
        <div className="flex justify-between text-[10px] text-textSecondary mt-2 font-mono">
            <span>1x</span>
            <span>20x</span>
            <span>50x</span>
            <span>75x</span>
            <span>125x</span>
        </div>
      </div>

      {/* Inputs */}
      <div className="mb-6 space-y-4">
        <div>
            <div className="flex justify-between mb-1">
                <label className="text-xs text-textSecondary font-medium">Order Size (USDT)</label>
                <span className="text-[10px] text-textSecondary">Max: ${maxPosition.toLocaleString()}</span>
            </div>
            <div className="relative group">
                <input 
                    type="number" 
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(parseFloat(e.target.value))}
                    className="w-full bg-background border border-border text-textPrimary text-sm rounded-lg p-3 pr-12 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none font-mono transition-all group-hover:border-gray-600"
                />
                <span className="absolute right-3 top-3 text-xs text-textSecondary font-bold">USDT</span>
            </div>
        </div>
        
        <div className="p-3 bg-background rounded border border-border text-xs space-y-2">
            <div className="flex justify-between">
                <span className="text-textSecondary">Cost</span>
                <span className="text-textPrimary font-mono">${marginRequired.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-textSecondary">Available</span>
                <span className="text-textPrimary font-mono">${balance.toFixed(2)}</span>
            </div>
        </div>
      </div>

      {/* 3D Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mt-auto">
        <button 
            disabled={isOrdering}
            onClick={() => handleOrder(Side.LONG)}
            className="
                relative w-full py-3 rounded-lg font-bold text-white text-sm uppercase tracking-wide
                bg-success shadow-3d-success transition-all
                hover:bg-[#32d993] hover:-translate-y-0.5
                active:shadow-none active:translate-y-1 active:bg-successDark
                disabled:opacity-50 disabled:cursor-not-allowed
            "
        >
            {isOrdering ? <RefreshCw className="w-5 h-5 animate-spin mx-auto"/> : 'Buy / Long'}
        </button>
        
        <button 
            disabled={isOrdering}
            onClick={() => handleOrder(Side.SHORT)}
            className="
                relative w-full py-3 rounded-lg font-bold text-white text-sm uppercase tracking-wide
                bg-danger shadow-3d-danger transition-all
                hover:bg-[#ff5e74] hover:-translate-y-0.5
                active:shadow-none active:translate-y-1 active:bg-dangerDark
                disabled:opacity-50 disabled:cursor-not-allowed
            "
        >
             {isOrdering ? <RefreshCw className="w-5 h-5 animate-spin mx-auto"/> : 'Sell / Short'}
        </button>
      </div>
    </div>
  );
};