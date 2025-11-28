
import React, { useState, useEffect } from 'react';
import { Calculator, ArrowRight, RotateCcw } from 'lucide-react';
import { Side } from '../types';

export const LiquidationCalculator: React.FC = () => {
  const [side, setSide] = useState<Side>(Side.LONG);
  const [leverage, setLeverage] = useState<number>(20);
  const [entryPrice, setEntryPrice] = useState<number>(60000);
  const [size, setSize] = useState<number>(10000);
  const [balance, setBalance] = useState<number>(1000);
  
  const [liqPrice, setLiqPrice] = useState<number>(0);

  useEffect(() => {
    // Standard Isolated Margin Liquidation Logic
    // MMR (Maintenance Margin Rate) roughly 0.5% for major pairs
    const mmr = 0.005; 
    
    // Margin allocated to this specific position
    // For calculation purposes, we assume 'balance' here acts as the Isolated Margin amount
    const margin = balance; 
    
    // Formula:
    // Long: Entry - ((Margin - (Size * MMR)) / Size * Entry) ?? 
    // Simplified Industry Standard: Entry * (1 - (1/Lev) + MMR)
    
    // Let's use the Bankruptcy Price method which is clearer:
    // Bankruptcy Price = Entry * (1 - 1/Lev) (Long)
    // Liq Price is slightly before Bankruptcy based on MMR.
    
    let calculatedLiq = 0;

    if (side === Side.LONG) {
        // Liq = Entry * (1 - (1/Lev) + MMR)
        calculatedLiq = entryPrice * (1 - (1/leverage) + mmr);
    } else {
        // Liq = Entry * (1 + (1/Lev) - MMR)
        calculatedLiq = entryPrice * (1 + (1/leverage) - mmr);
    }

    setLiqPrice(calculatedLiq);
  }, [side, leverage, entryPrice, size, balance]);

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="p-3 bg-surfaceHighlight rounded-xl">
                <Calculator className="w-6 h-6 text-primary" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-textPrimary">Liquidation Calculator</h2>
                <p className="text-xs text-textSecondary">Estimate your liquidation price based on leverage and entry.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Controls */}
            <div className="bg-surface border border-border rounded-xl p-6 space-y-6 shadow-lg">
                
                {/* Side Selector */}
                <div className="grid grid-cols-2 gap-2 bg-background p-1 rounded-lg">
                    <button 
                        onClick={() => setSide(Side.LONG)}
                        className={`py-2 text-sm font-bold rounded transition-colors ${side === Side.LONG ? 'bg-success text-white shadow' : 'text-textSecondary hover:text-white'}`}
                    >
                        LONG
                    </button>
                    <button 
                        onClick={() => setSide(Side.SHORT)}
                        className={`py-2 text-sm font-bold rounded transition-colors ${side === Side.SHORT ? 'bg-danger text-white shadow' : 'text-textSecondary hover:text-white'}`}
                    >
                        SHORT
                    </button>
                </div>

                {/* Leverage */}
                <div>
                    <div className="flex justify-between text-xs text-textSecondary mb-2">
                        <span>Leverage</span>
                        <span className="text-primary font-mono font-bold">{leverage}x</span>
                    </div>
                    <input 
                        type="range" min="1" max="125" value={leverage} 
                        onChange={(e) => setLeverage(Number(e.target.value))}
                        className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>

                {/* Entry Price */}
                <div>
                    <label className="text-xs text-textSecondary font-bold uppercase mb-1.5 block">Entry Price (USDT)</label>
                    <input 
                        type="number" 
                        value={entryPrice}
                        onChange={(e) => setEntryPrice(Number(e.target.value))}
                        className="w-full bg-background border border-border p-3 rounded-lg text-sm font-mono focus:border-primary focus:outline-none"
                    />
                </div>

                 {/* Margin / Balance */}
                 <div>
                    <label className="text-xs text-textSecondary font-bold uppercase mb-1.5 block">Isolated Margin (USDT)</label>
                    <input 
                        type="number" 
                        value={balance}
                        onChange={(e) => setBalance(Number(e.target.value))}
                        className="w-full bg-background border border-border p-3 rounded-lg text-sm font-mono focus:border-primary focus:outline-none"
                    />
                    <p className="text-[10px] text-textSecondary mt-1">The amount of your own money assigned to this trade.</p>
                </div>

            </div>

            {/* Results */}
            <div className="bg-surface border border-border rounded-xl p-6 shadow-lg flex flex-col justify-center items-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                
                <h3 className="text-sm font-bold text-textSecondary uppercase tracking-widest mb-2">Estimated Liquidation Price</h3>
                <div className="text-4xl font-mono font-bold text-warning mb-6">
                    ${liqPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </div>

                <div className="w-full space-y-3">
                    <div className="flex justify-between text-xs border-b border-border pb-2">
                        <span className="text-textSecondary">Entry Price</span>
                        <span className="font-mono">{entryPrice.toLocaleString()}</span>
                    </div>
                     <div className="flex justify-between text-xs border-b border-border pb-2">
                        <span className="text-textSecondary">Position Value</span>
                        <span className="font-mono text-white">${(balance * leverage).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-border pb-2">
                        <span className="text-textSecondary">Bankruptcy Price</span>
                        <span className="font-mono text-danger">
                            ${(side === Side.LONG ? entryPrice * (1 - 1/leverage) : entryPrice * (1 + 1/leverage)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                    </div>
                </div>

                <div className="mt-8 p-3 bg-warning/10 border border-warning/20 rounded-lg text-[10px] text-warning text-left flex gap-2">
                    <ArrowRight className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                        This is an estimation based on Isolated Margin logic with a standard 0.5% Maintenance Margin Rate. 
                        Real-time market volatility and spread may affect actual execution.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
