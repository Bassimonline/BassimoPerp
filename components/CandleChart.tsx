import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { Candle } from '../types';

interface CandleChartProps {
  data: Candle[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isUp = data.close >= data.open;
    return (
      <div className="bg-surface border border-border p-3 rounded shadow-xl backdrop-blur-md bg-opacity-95 z-50">
        <p className="text-textSecondary text-xs mb-1 font-mono">{new Date(data.time).toLocaleString()}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
          <span className="text-textSecondary">Open</span>
          <span className={isUp ? 'text-success' : 'text-danger'}>{data.open.toFixed(2)}</span>
          
          <span className="text-textSecondary">High</span>
          <span className={isUp ? 'text-success' : 'text-danger'}>{data.high.toFixed(2)}</span>
          
          <span className="text-textSecondary">Low</span>
          <span className={isUp ? 'text-success' : 'text-danger'}>{data.low.toFixed(2)}</span>
          
          <span className="text-textSecondary">Close</span>
          <span className={isUp ? 'text-success' : 'text-danger'}>{data.close.toFixed(2)}</span>
          
          <span className="text-textSecondary">Vol</span>
          <span className="text-textPrimary">{data.volume.toFixed(2)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const CandleChart: React.FC<CandleChartProps> = ({ data }) => {
  if (data.length === 0) return null;
  
  const minPrice = Math.min(...data.map(d => d.low));
  const maxPrice = Math.max(...data.map(d => d.high));
  const padding = (maxPrice - minPrice) * 0.1;
  const domain = [minPrice - padding, maxPrice + padding];
  
  const lastPrice = data[data.length - 1].close;
  const isLastUp = data.length > 1 && lastPrice >= data[data.length - 2].close;
  const strokeColor = isLastUp ? '#0ECB81' : '#F6465D';
  const fillColor = isLastUp ? 'url(#colorGreen)' : 'url(#colorRed)';

  return (
    <div className="h-full w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ECB81" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#0ECB81" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F6465D" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#F6465D" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid stroke="#2B3139" strokeDasharray="3 3" vertical={false} />
          
          <XAxis 
            dataKey="time" 
            tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            stroke="#2B3139" 
            tick={{fill: '#848E9C', fontSize: 10, fontFamily: 'JetBrains Mono'}}
            minTickGap={50}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          
          <YAxis 
            domain={domain} 
            orientation="right" 
            stroke="#2B3139"
            tick={{fill: '#848E9C', fontSize: 10, fontFamily: 'JetBrains Mono'}}
            tickFormatter={(val) => val.toFixed(1)}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: '#848E9C', strokeWidth: 1, strokeDasharray: '4 4' }}
            isAnimationActive={false}
          />
          
          <ReferenceLine 
            y={lastPrice} 
            stroke={strokeColor} 
            strokeDasharray="3 3" 
            label={{ 
                value: lastPrice.toFixed(2), 
                position: 'right', 
                fill: '#fff', 
                fontSize: 10, 
                fontWeight: 'bold',
                className: isLastUp ? 'bg-success px-1' : 'bg-danger px-1' 
            }} 
          />

          <Area 
            type="monotone" 
            dataKey="close" 
            stroke={strokeColor} 
            strokeWidth={2}
            fill={fillColor} 
            isAnimationActive={false}
          />
          
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};