
import React, { useEffect, useRef } from 'react';
import { AiLog } from '../types';
import { Terminal, Cpu, Play } from 'lucide-react';

interface AiThinkingFeedProps {
  logs: AiLog[];
  onScan?: () => void;
  isScanning?: boolean;
}

export const AiThinkingFeed: React.FC<AiThinkingFeedProps> = ({ logs, onScan, isScanning }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [logs]);

  // Last 4 logs
  const recentLogs = logs.slice(-4);

  return (
    <div className="flex flex-col h-full bg-[#050505] rounded-2xl border border-border overflow-hidden shadow-2xl font-mono relative">
      {/* Scan Line Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_4px,3px_100%]"></div>
      
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-border bg-black flex items-center justify-between z-20 relative">
        <h3 className="text-xs font-bold text-primary flex items-center gap-2 uppercase tracking-widest">
          <Terminal className="w-3.5 h-3.5" />
          Core Logic v2.0
        </h3>
        <div className="flex items-center gap-2">
           <Cpu className="w-3 h-3 text-primary animate-pulse" />
           <span className="text-[9px] text-textSecondary">SYSTEM ONLINE</span>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 overflow-y-auto p-4 bg-black space-y-3 custom-scrollbar font-mono text-xs leading-relaxed min-h-0 z-20 relative">
        {logs.length === 0 ? (
            <div className="text-primary/30 italic p-4 text-center mt-2 text-[10px] animate-pulse">
                &gt; Initializing Neural Network...<br/>
                &gt; Connecting to Market Feeds...
            </div>
        ) : (
            recentLogs.map((log) => (
            <div key={log.id} className="flex gap-3 animate-fade-in group">
                <span className="text-border shrink-0 select-none text-[10px] pt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                </span>
                <span className={`
                    break-words
                    ${log.type === 'execution' ? 'text-white font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : ''}
                    ${log.type === 'alert' ? 'text-danger font-bold drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' : ''}
                    ${log.type === 'decision' ? 'text-primary' : ''}
                    ${log.type === 'scan' ? 'text-textSecondary opacity-70' : ''}
                    ${log.type === 'info' ? 'text-blue-400' : ''}
                `}>
                    {log.type === 'execution' && <span className="text-success mr-1">&gt;&gt; EXECUTE:</span>}
                    {log.type === 'alert' && <span className="text-danger mr-1">!! ALERT:</span>}
                    {log.type === 'decision' && <span className="text-primary mr-1">&gt;</span>}
                    {log.message}
                </span>
            </div>
            ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Manual Scan Trigger */}
      {onScan && (
        <div className="flex-shrink-0 p-3 bg-black border-t border-border z-20 relative">
            <button 
                onClick={onScan}
                disabled={isScanning}
                className="w-full py-3 bg-gradient-to-r from-primary to-orange-600 text-black font-bold text-xs rounded-xl shadow-glow hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 uppercase tracking-wide border-b-4 border-orange-800 active:border-b-0 active:translate-y-1"
            >
                {isScanning ? <span className="animate-pulse">Running Diagnostics...</span> : <><Play className="w-3.5 h-3.5 fill-current"/> Scan Market Now</>}
            </button>
        </div>
      )}
    </div>
  );
};
