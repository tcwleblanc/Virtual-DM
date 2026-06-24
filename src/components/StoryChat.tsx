'use client';

import { useChat } from 'ai/react';
import { type Message } from 'ai';
import { useEffect, useRef } from 'react';

interface StoryChatProps {
  campaignId: string;
  characterId: string;
}

export default function StoryChat({ campaignId, characterId }: StoryChatProps) {
  // 1. Initialize the Vercel AI SDK Chat Hook
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    // We send our campaign and character IDs in the body so the backend can use them
    body: {
      characterId,
      campaignId,
    },
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when a new token arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full relative bg-neutral-950 text-neutral-200">
      
      {/* Scrollable Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-neutral-500 italic mt-12 animate-pulse">
            The tavern quietens. The candles flicker. The Dungeon Master awaits your action...
          </div>
        )}

        {messages.map((m: Message) => (
          <div 
            key={m.id} 
            className={`flex flex-col max-w-[85%] rounded-lg p-4 shadow-md ${
              m.role === 'user' 
                ? 'bg-indigo-950/40 border border-indigo-900/50 ml-auto' 
                : 'bg-neutral-900/60 border border-neutral-800 mr-auto'
            }`}
          >
            {/* Sender Label */}
            <span className={`text-xs font-bold tracking-wider mb-1 uppercase ${
              m.role === 'user' ? 'text-indigo-400' : 'text-amber-500'
            }`}>
              {m.role === 'user' ? 'Player' : 'Dungeon Master'}
            </span>
            
            {/* Message Body */}
            <p className="text-sm leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30">
              {m.content}
            </p>
          </div>
        ))}
        
        {/* Dummy div to anchor our auto-scroll */}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar Sticky Bottom */}
      <form onSubmit={handleSubmit} className="p-4 bg-neutral-900 border-t border-neutral-800">
        <div className="flex gap-2">
          <input
            value={input || ''} // Safety fallback: if undefined, use empty string
            onChange={handleInputChange}
            placeholder={isLoading ? "The DM is writing history..." : "Type your action or enter a physical dice roll..."}
            disabled={isLoading}
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-200 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 placeholder-neutral-600 text-sm"
          />
          <button 
            type="submit"
            // Safe evaluation: check if input exists before trimming
            disabled={isLoading || !input || input.trim() === ''}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white font-medium px-5 rounded-lg transition-colors text-sm"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}