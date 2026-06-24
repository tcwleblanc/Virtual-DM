'use client';

import { useEffect, useState } from 'react';
import { pusherClient } from '@/lib/pusher-client';

interface CharacterHubProps {
  characterId: string;
}

export default function CharacterHub({ characterId }: CharacterHubProps) {
  // Temporary hardcoded initial stats (we will pull these from Neon DB later)
  const [hp, setHp] = useState(45);
  const maxHp = 50;
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // 1. Subscribe to this specific character's socket channel
    const channelName = `character-${characterId}`;
    const channel = pusherClient.subscribe(channelName);

    // 2. Listen for the 'sheet-update' event broadcasted by the backend AI tool
    channel.bind('sheet-update', (data: { changedStat: string; changeAmount: number; narrativeReason: string }) => {
      if (data.changedStat === 'HP') {
        setHp((currentHp) => Math.min(maxHp, Math.max(0, currentHp + data.changeAmount)));
        setLogs((prev) => [`[HP Change] ${data.changeAmount > 0 ? '+' : ''}${data.changeAmount}: "${data.narrativeReason}"`, ...prev]);
      }
    });

    // Clean up subscription when leaving the page
    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [characterId]);

  // Calculate HP bar percentage safely
  const hpPercentage = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  return (
    <div className="flex flex-col h-full bg-neutral-900 text-neutral-200">
      
      {/* Hub Header */}
      <div className="p-4 border-b border-neutral-800 shadow-sm bg-neutral-950 flex justify-between items-center">
        <h2 className="font-bold text-indigo-400 tracking-wider text-sm">CHARACTER SHEET</h2>
        <span className="text-xs text-neutral-500 font-mono">ID: {characterId.slice(0, 8)}...</span>
      </div>

      {/* Main Stats Controls */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Health Tracker Card */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 shadow-inner">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Hit Points</span>
            <span className="text-xl font-mono font-bold text-emerald-400">{hp} <span className="text-neutral-600 text-sm">/ {maxHp}</span></span>
          </div>
          
          {/* Outer Progress Bar */}
          <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 p-[2px]">
            {/* Inner Animated Bar */}
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${hpPercentage}%` }}
            />
          </div>
        </div>

        {/* Real-time System Feed Log */}
        <div className="space-y-2">
          <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block">Audit Log (Live Feed)</span>
          <div className="h-48 bg-neutral-950 border border-neutral-800 rounded-lg p-4 font-mono text-xs overflow-y-auto space-y-2 text-neutral-400">
            {logs.length === 0 ? (
              <div className="text-neutral-700 italic text-center pt-16">No recent modifications recorded.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="border-b border-neutral-900 pb-2 last:border-0 animate-fadeIn">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}