
import React from 'react';
import { OrderBookData } from '../types';

interface OrderBookProps {
  data: OrderBookData | null;
  currentPrice: number;
}

export const OrderBook: React.FC<OrderBookProps> = ({ data, currentPrice }) => {
  if (!data) return <div className="h-full flex items-center justify-center text-xs text-textSecondary">Loading Book...</div>;

  return (
    <div className="h-full flex flex-col text-[10px] font-mono select-none overflow-hidden bg-surface/50">
        {/* Header */}
        <div className="flex justify-between px-3 py-2 text-textSecondary border-b border-border bg-surface">
            <span>Price (USDT)</span>
            <span>Size</span>
        </div>

        {/* Asks (Sell Orders) - Reverse order to show lowest ask at bottom */}
        <div className="flex-1 overflow-hidden flex flex-col justify-end">
            {[...data.asks].reverse().slice(0, 15).map((ask, i) => (
                <div key={i} className="flex justify-between px-3 py-0.5 relative hover:bg-surfaceHighlight">
                    <div 
                        className="absolute top-0 right-0 h-full bg-danger/10 z-0 transition-all duration-300" 
                        style={{ width: `${ask.depthPercent}%` }}
                    />
                    <span className="text-danger z-10">{ask.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</span>
                    <span className="text-textSecondary z-10">{ask.amount.toFixed(4)}</span>
                </div>
            ))}
        </div>

        {/* Spread / Current Price */}
        <div className="py-2 px-3 my-1 bg-surface border-y border-border flex justify-between items-center font-bold">
            <span className={currentPrice >= data.bids[0]?.price ? 'text-success text-sm' : 'text-danger text-sm'}>
                {currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}
            </span>
            <span className="text-[9px] text-textSecondary">
                Spread: {data.spreadPercent.toFixed(3)}%
            </span>
        </div>

        {/* Bids (Buy Orders) */}
        <div className="flex-1 overflow-hidden">
            {data.bids.slice(0, 15).map((bid, i) => (
                <div key={i} className="flex justify-between px-3 py-0.5 relative hover:bg-surfaceHighlight">
                    <div 
                        className="absolute top-0 right-0 h-full bg-success/10 z-0 transition-all duration-300" 
                        style={{ width: `${bid.depthPercent}%` }}
                    />
                    <span className="text-success z-10">{bid.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</span>
                    <span className="text-textSecondary z-10">{bid.amount.toFixed(4)}</span>
                </div>
            ))}
        </div>
    </div>
  );
};
