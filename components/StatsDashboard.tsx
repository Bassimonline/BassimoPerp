
import React from 'react';
import { ClosedTrade, AccountInfo } from '../types';
import { TrendingUp, TrendingDown, Target, Clock, DollarSign, History } from 'lucide-react';

interface StatsDashboardProps {
  history: ClosedTrade[];
  account: AccountInfo;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ history, account }) => {
  
  // Calculate Stats
  const totalTrades = history.length;
  const winningTrades = history.filter(t => t.pnl > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalPnL = history.reduce((acc, curr) => acc + curr.pnl, 0);
  const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;
  
  // Find best trade
  const bestTrade = history.reduce((prev, current) => (prev.pnl > current.pnl) ? prev : current, { pnl: 0 } as ClosedTrade);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><DollarSign size={20} /></div>
                    <span className="text-textSecondary text-xs uppercase font-bold">Total PnL</span>
                </div>
                <div className={`text-2xl font-mono font-bold ${totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                    {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} USDT
                </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-success/10 rounded-lg text-success"><Target size={20} /></div>
                    <span className="text-textSecondary text-xs uppercase font-bold">Win Rate</span>
                </div>
                <div className="text-2xl font-mono font-bold text-textPrimary">
                    {winRate.toFixed(1)}%
                </div>
                <div className="text-[10px] text-textSecondary mt-1">
                    {winningTrades}W / {totalTrades - winningTrades}L
                </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><TrendingUp size={20} /></div>
                    <span className="text-textSecondary text-xs uppercase font-bold">Best Trade</span>
                </div>
                <div className="text-2xl font-mono font-bold text-success">
                    +{bestTrade.pnl.toFixed(2)}
                </div>
                <div className="text-[10px] text-textSecondary mt-1 font-mono">
                    {bestTrade.symbol || '--'}
                </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><History size={20} /></div>
                    <span className="text-textSecondary text-xs uppercase font-bold">Total Trades</span>
                </div>
                <div className="text-2xl font-mono font-bold text-textPrimary">
                    {totalTrades}
                </div>
            </div>
        </div>

        {/* History Table */}
        <div className="bg-surface border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surfaceHighlight/10">
                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                    <Clock className="w-4 h-4 text-textSecondary" />
                    Trade History
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-background text-[10px] text-textSecondary uppercase tracking-wider font-bold">
                        <tr>
                            <th className="p-3">Time</th>
                            <th className="p-3">Symbol</th>
                            <th className="p-3">Side</th>
                            <th className="p-3">Entry</th>
                            <th className="p-3">Exit</th>
                            <th className="p-3">Size</th>
                            <th className="p-3">Close Reason</th>
                            <th className="p-3 text-right">Realized PnL</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs font-mono">
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-textSecondary italic">
                                    No closed trades yet.
                                </td>
                            </tr>
                        ) : (
                            [...history].reverse().map(trade => (
                                <tr key={trade.id} className="border-b border-border/50 hover:bg-surfaceHighlight/50 transition-colors">
                                    <td className="p-3 text-textSecondary">{new Date(trade.timestamp).toLocaleString()}</td>
                                    <td className="p-3 font-bold text-textPrimary">{trade.symbol}</td>
                                    <td className={`p-3 font-bold ${trade.side === 'LONG' ? 'text-success' : 'text-danger'}`}>{trade.side}</td>
                                    <td className="p-3 text-textSecondary">${trade.entryPrice.toFixed(2)}</td>
                                    <td className="p-3 text-textSecondary">${trade.exitPrice.toFixed(2)}</td>
                                    <td className="p-3 text-textSecondary">${trade.size.toLocaleString()}</td>
                                    <td className="p-3">
                                        <span className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] uppercase font-bold">
                                            {trade.closeReason}
                                        </span>
                                    </td>
                                    <td className={`p-3 text-right font-bold ${trade.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
