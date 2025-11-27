
import React, { useEffect, useRef } from 'react';
import { AiLog } from '../types';
import { Terminal, Radio } from 'lucide-react';

interface AiThinkingFeedProps {
  logs: AiLog[];
}

export const AiThinkingFeed: React.FC<AiThinkingFeedProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [logs]);

  // Only show the last 4 logs
  const recentLogs = logs.slice(-4);

  return (
    <div className="flex flex-col h-full bg-surface rounded-xl border border-border overflow-hidden shadow-lg font-mono">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-border bg-[#050505] flex items-center justify-between">
        <h3 className="text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
          <Terminal className="w-4 h-4" />
          AI Logic Core v2.0
        </h3>
        <div className="flex items-center gap-2">
           <Radio className="w-3 h-3 text-success animate-pulse" />
           <span className="text-[10px] text-textSecondary">ONLINE</span>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 overflow-y-auto p-4 bg-black space-y-2 custom-scrollbar font-mono text-xs leading-relaxed min-h-0">
        {logs.length === 0 ? (
            <div className="text-textSecondary/50 italic p-2 text-center mt-2">
                Initializing AI Neural Net...
            </div>
        ) : (
            recentLogs.map((log) => (
            <div key={log.id} className="flex gap-3 animate-fade-in hover:bg-white/5 p-0.5 rounded transition-colors">
                <span className="text-textSecondary shrink-0 opacity-50 select-none">
                    [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}]
                </span>
                <span className={`
                    ${log.type === 'execution' ? 'text-primary font-bold' : ''}
                    ${log.type === 'alert' ? 'text-danger font-bold' : ''}
                    ${log.type === 'decision' ? 'text-success' : ''}
                    ${log.type === 'scan' ? 'text-textSecondary' : ''}
                    ${log.type === 'info' ? 'text-blue-400' : ''}
                `}>
                    {log.type === 'execution' && '> EXECUTE: '}
                    {log.type === 'alert' && '! ALERT: '}
                    {log.message}
                </span>
            </div>
            ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Simulation (Visual only) */}
      <div className="flex-shrink-0 p-2 bg-[#050505] border-t border-border flex items-center gap-2">
        <span className="text-primary text-sm font-bold">{'>'}</span>
        <span className="w-2 h-5 bg-primary animate-pulse"></span>
      </div>
    </div>
  );
};
