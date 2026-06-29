'use client'

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai'; 
import { useState, useEffect, useRef } from 'react';
import { saveCharacter } from '@/app/campaign/[id]/character/new/actions';
import { useRouter } from 'next/navigation';

// Custom Text Formatter with ES5/ES6 compatible Regex
const FormattedMessage = ({ text }: { text: string }) => {
  const parts = text.split(/("[\s\S]*?")/g);

  return (
    <span className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
      {parts.map((part, i) => {
        if (part.startsWith('"') && part.endsWith('"')) {
          return (
            <span key={i} className="text-amber-400 font-medium">
              {part}
            </span>
          );
        }
        
        const boldParts = part.split(/(\*\*[\s\S]*?\*\*)/g);
        return (
          <span key={i}>
            {boldParts.map((bp, j) => {
              if (bp.startsWith('**') && bp.endsWith('**')) {
                return <strong key={j} className="text-white font-bold">{bp.replace(/\*\*/g, '')}</strong>;
              }
              return bp;
            })}
          </span>
        );
      })}
    </span>
  );
};

export default function CharacterBuilder({ campaign }: { campaign: any }) {
  const router = useRouter();
  
  const [localInput, setLocalInput] = useState('');
  
  const [characterDraft, setCharacterDraft] = useState({
    name: 'Unknown Adventurer',
    classAndLevel: 'Level 1 Wanderer',
    stats: {} as Record<string, number>,
    inventory: [] as string[],
    spellbook: [] as any[],
  });

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/character-build',
      body: () => ({ campaignContext: campaign })
    })
  });

  // Passively listen to the message stream for tool data
  useEffect(() => {
    // Cast to any to bypass strict checking on the outer array
    const lastMessage = messages[messages.length - 1] as any; 
    
    if (lastMessage?.role === 'assistant' && lastMessage.toolInvocations) {
      lastMessage.toolInvocations.forEach((invocation: any) => {
        if (invocation.toolName === 'update_character_sheet') {
          const newData = invocation.args;
          
          setCharacterDraft((prev) => {
             const updated = { ...prev, ...newData };
             if (JSON.stringify(prev) !== JSON.stringify(updated)) {
               return updated;
             }
             return prev;
          });
        }
      });
    }
  }, [messages]);

  const isLoading = status === 'submitted' || status === 'streaming';

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current && messages.length === 0) {
      hasInitialized.current = true;
      sendMessage({ text: 'INITIALIZE_DM_GREETING' });
    }
  }, [messages.length, sendMessage]);

  const visibleMessages = messages.filter((m: UIMessage) => {
    if (m.role === 'user') {
      // 🛠️ CRITICAL FIX: Use .some() with strict type guards to satisfy the compiler
      const isHiddenTrigger = m.parts?.some(
        (part) => part.type === 'text' && 'text' in part && typeof part.text === 'string' && part.text.includes('INITIALIZE_DM_GREETING')
      );
      if (isHiddenTrigger) return false; 
    }
    return true;
  });

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localInput.trim()) return;
    
    sendMessage({ text: localInput });
    setLocalInput(''); 
  };

  const handleFinalize = async () => {
    try {
      await saveCharacter(campaign.id, characterDraft);
      router.push(`/dashboard`); 
    } catch (err) {
      console.error("Failed to save character", err);
    }
  };

  return (
    <div className="flex h-full w-full bg-neutral-950 text-neutral-100 font-sans">
      
      {/* LEFT PANEL: Chat Interface */}
      <div className="w-1/2 flex flex-col border-r border-neutral-800 p-6 relative">
        <h2 className="text-xl font-bold mb-4 text-emerald-400">AI Dungeon Master</h2>
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          
          {visibleMessages.map((m: UIMessage) => (
            <div key={m.id} className={`p-4 rounded-xl max-w-[85%] ${m.role === 'user' ? 'bg-indigo-950/40 border border-indigo-900/50 self-end ml-auto' : 'bg-neutral-900/60 border border-neutral-800 self-start'}`}>
              <span className={`text-xs font-bold tracking-wider mb-2 uppercase block ${m.role === 'user' ? 'text-indigo-400' : 'text-amber-500'}`}>
                {m.role === 'user' ? 'You' : 'Dungeon Master'}
              </span>
              
              {/* 🛠️ CRITICAL FIX: Strict type checking ('text' in part) before rendering */}
              {m.parts?.map((part, index) => {
                if (part.type === 'text' && 'text' in part && typeof part.text === 'string') {
                  return <FormattedMessage key={index} text={part.text} />;
                }
                if (part.type === 'tool-invocation') {
                  return <p key={index} className="text-xs text-emerald-400/80 italic mt-3 font-medium border-t border-emerald-900/30 pt-2">
                    [The DM is updating your character sheet...]
                  </p>;
                }
                return null;
              })}
            </div>
          ))}

          {isLoading && visibleMessages.length === 0 && (
             <div className="text-center text-neutral-500 italic mt-12 animate-pulse">
               The DM is arranging their notes and setting the scene...
             </div>
          )}

          {isLoading && visibleMessages.length > 0 && (
            <p className="text-emerald-500 animate-pulse text-sm">The DM is thinking...</p>
          )}
        </div>

        <form onSubmit={handleCustomSubmit} className="flex gap-2 relative z-10">
          <input
            type="text"
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
            placeholder="Speak to the DM..."
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !localInput.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 px-6 rounded-lg font-semibold transition-colors disabled:bg-neutral-800 disabled:text-neutral-500"
          >
            Send
          </button>
        </form>
      </div>

      {/* RIGHT PANEL: Live Character Sheet */}
      <div className="w-1/2 p-8 bg-neutral-900 overflow-y-auto relative">
        <div className="absolute inset-0 opacity-5 bg-[url('/file.svg')] bg-center pointer-events-none"></div>
        <div className="relative z-10 max-w-lg mx-auto bg-neutral-950 p-8 rounded-2xl border border-neutral-800 shadow-2xl">
          <div className="border-b border-neutral-800 pb-4 mb-6">
            <h1 className="text-3xl font-black text-white uppercase tracking-wider">{characterDraft.name}</h1>
            <h3 className="text-lg text-indigo-400">{characterDraft.classAndLevel}</h3>
          </div>
          <div className="space-y-8">
            <div>
              <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-3">Attributes</h4>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(characterDraft.stats).map(([stat, val]) => (
                  <div key={stat} className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-center shadow-inner">
                    <span className="block text-2xl font-bold text-emerald-400">{val as React.ReactNode}</span>
                    <span className="text-xs text-neutral-400 uppercase">{stat}</span>
                  </div>
                ))}
                {Object.keys(characterDraft.stats).length === 0 && (
                  <p className="text-sm text-neutral-600 italic col-span-3">Stats will appear here as you discuss them...</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-3">Abilities & Spells</h4>
              <ul className="space-y-2">
                {characterDraft.spellbook.map((spell, i) => (
                  <li key={i} className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg shadow-inner">
                    <span className="font-bold text-indigo-300 block text-lg mb-1">{spell.name}</span>
                    <span className="text-sm text-neutral-400 leading-relaxed">{spell.effect}</span>
                  </li>
                ))}
                {characterDraft.spellbook.length === 0 && (
                  <p className="text-sm text-neutral-600 italic">No abilities assigned yet.</p>
                )}
              </ul>
            </div>
            <button 
              onClick={handleFinalize}
              className="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(52,211,153,0.2)]"
            >
              Sign Character Sheet & Begin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}