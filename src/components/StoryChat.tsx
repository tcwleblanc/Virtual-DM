'use client';

import { useChat } from '@ai-sdk/react';
// 1. Import the new DefaultChatTransport from the core 'ai' package
import { DefaultChatTransport, type UIMessage } from 'ai'; 
import { useEffect, useRef, useState } from 'react';

interface StoryChatProps {
  campaignId: string;
  characterId: string;
}

export default function StoryChat({ campaignId, characterId }: StoryChatProps) {
  // 2. Manage the input state locally
  const [input, setInput] = useState('');

  // 3. Destructure the new v6 properties: messages, sendMessage, and status
  const { messages, sendMessage, status } = useChat({
    // 4. Configure the API connection using the DefaultChatTransport layer
    transport: new DefaultChatTransport({
      api: '/api/chat',
      // We pass the body as a function so it always pulls the freshest React props
      body: () => ({
        characterId,
        campaignId,
      }),
    }),
  });

  // 5. Derive the loading state dynamically based on the network status
  const isLoading = status === 'submitted' || status === 'streaming';

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when a new token arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 6. Create our own submit handler to replace the deprecated 'handleSubmit'
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input || input.trim() === '') return;
    
    // Send the message payload and immediately clear the input box
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full relative bg-neutral-950 text-neutral-200">
      
      {/* Scrollable Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-neutral-500 italic mt-12 animate-pulse">
            The tavern quietens. The candles flicker. The Dungeon Master awaits your action...
          </div>
        )}

        {messages.map((m: any) => (
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
              {m.parts?.map((part: any, index: number) => (
                part.type === 'text' ? <span key={index}>{part.text}</span> : null
              ))}
            </p>

            {/* 2. Catch and render Tool Invocations */}
            {m.toolInvocations?.map((toolInvocation: any) => {
              // Check if it's our character sheet tool
              if (toolInvocation.toolName === 'update_character_sheet') {
                if (toolInvocation.state === 'result') {
                  return (
                    <div key={toolInvocation.toolCallId} className="p-2 mt-2 bg-green-900/20 border border-green-700/30 rounded text-xs text-green-400">
                       Character sheet updated for: {toolInvocation.result.name}
                    </div>
                  );
                } else {
                  return (
                    <div key={toolInvocation.toolCallId} className="p-2 mt-2 bg-indigo-900/20 border border-indigo-700/30 rounded text-xs text-indigo-400">
                      Updating character data...
                    </div>
                  );
                }
              }
              return null;
            })}
          </div>
        ))}
        
        {/* Dummy div to anchor our auto-scroll */}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar Sticky Bottom */}
      {/* 7. Attach our custom onSubmit handler to the form */}
      <form onSubmit={onSubmit} className="p-4 bg-neutral-900 border-t border-neutral-800">
        <div className="flex gap-2">
          <input
            value={input}
            // 8. Update our local input state when the user types
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? "The DM is writing history..." : "Type your action or enter a physical dice roll..."}
            disabled={isLoading}
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-200 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 placeholder-neutral-600 text-sm"
          />
          <button 
            type="submit"
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