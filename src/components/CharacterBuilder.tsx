'use client'

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai'; 
import { useState, useEffect, useRef } from 'react';
import { saveCharacter } from '@/app/campaign/[id]/character/new/actions';
import { useRouter } from 'next/navigation';

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
    }),
    onToolCall({ toolCall }) {
      if (toolCall.toolName === 'update_character_sheet') {
        const newData = (toolCall as any).args;
        setCharacterDraft((prev) => ({ ...prev, ...newData }));
      }
    }
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // 1. ADD AUTO-INITIALIZATION LOGIC
  const hasInitialized = useRef(false);
  useEffect(() => {
    // Only fire once, and only if there are no messages yet
    if (!hasInitialized.current && messages.length === 0) {
      hasInitialized.current = true;
      sendMessage({ text: 'INITIALIZE_DM_GREETING' });
    }
  }, [messages.length, sendMessage]);

  // 2. FILTER OUT THE HIDDEN COMMAND FROM THE UI
  const visibleMessages = messages.filter((m: UIMessage) => {
    if (m.role === 'user') {
      const text = m.parts?.find(p => p.type === 'text');
      // Hide our secret initialization trigger from the player
      if (text && text.text === 'INITIALIZE_DM_GREETING') return false; 
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
      router.push(`/campaign/${campaign.id}`); 
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
          
          {/* Replace 'messages.map' with 'visibleMessages.map' */}
          {visibleMessages.map((m: UIMessage) => (
            <div key={m.id} className={`p-4 rounded-xl max-w-[85%] ${m.role === 'user' ? 'bg-indigo-900/50 self-end ml-auto' : 'bg-neutral-800 self-start'}`}>
              <span className="font-semibold block mb-1">{m.role === 'user' ? 'You' : 'DM'}</span>
              
              {m.parts?.map((part, index) => {
                if (part.type === 'text') {
                  return <p key={index} className="whitespace-pre-wrap text-sm leading-relaxed">{part.text}</p>;
                }
                if (part.type === 'tool-invocation') {
                  return <p key={index} className="text-xs text-emerald-400/80 italic mt-2 font-medium">
                    [The DM updates your character sheet...]
                  </p>;
                }
                return null;
              })}
            </div>
          ))}

          {/* Initial Loading State for the Greeting */}
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
            placeholder="Tell the DM about your character idea..."
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

      {/* RIGHT PANEL: Live Character Sheet (Unchanged) */}
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
                  <div key={stat} className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-center">
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
              <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-3">Abilities / Spells</h4>
              <ul className="space-y-2">
                {characterDraft.spellbook.map((spell, i) => (
                  <li key={i} className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg">
                    <span className="font-semibold text-indigo-300 block">{spell.name}</span>
                    <span className="text-sm text-neutral-400">{spell.effect}</span>
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