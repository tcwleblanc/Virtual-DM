'use client';

import { useState, useTransition } from 'react';
import { createCampaignAction } from './actions';
import Link from 'next/link';

// Pre-defined options with their AI DM implications
const THEMES = [
  { id: 'Fantasy', icon: '🗡️' },
  { id: 'Classic D&D', icon: '🐉' },
  { id: 'Pathfinder', icon: '🧭' },
  { id: 'Sci-Fi', icon: '🚀' },
  { id: 'Western', icon: '🤠' },
  { id: 'Detective', icon: '🕵️' },
  { id: 'Cyberpunk', icon: '🦾' },
  { id: 'Horror', icon: '🧟' }
];

const AGE_RATINGS = [
  { id: 'E', title: 'E (Everyone)', desc: 'Light fantasy elements. The AI will avoid gore, mature themes, and harsh language.' },
  { id: 'T', title: 'T (Teen)', desc: 'Standard RPG experience. The AI allows combat violence, mild language, and complex morality.' },
  { id: 'M', title: 'M (Mature)', desc: 'Gritty and dark. The AI will freely describe intense violence, blood, and mature themes.' }
];

const LEVELING_SYSTEMS = [
  { id: 'Milestone', title: 'Milestone', desc: 'Story-based progression. The AI prompts level-ups after major narrative arcs.' },
  { id: 'XP', title: 'Experience (XP)', desc: 'Mathematical progression. The AI awards specific XP points after combat and encounters.' }
];

export default function ForgeWorldPage() {
  const [name, setName] = useState('');
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [ageRating, setAgeRating] = useState('T');
  const [leveling, setLeveling] = useState('Milestone');
  
  const [isPending, startTransition] = useTransition();

  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev => {
      if (prev.includes(theme)) return prev.filter(t => t !== theme);
      // Optional: limit to 3 themes so we don't breach the varchar(50) limit in the DB
      if (prev.length >= 3) return prev; 
      return [...prev, theme];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('theme', selectedThemes.length > 0 ? selectedThemes.join(', ') : 'Custom');
    formData.append('levelingSystem', leveling);
    formData.append('ageRating', ageRating);

    startTransition(() => {
      createCampaignAction(formData);
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 text-zinc-50 font-sans p-8 pb-24">
      <nav className="mb-12">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          &larr; Back to Campaigns
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-3">
            Forge a New World
          </h1>
          <p className="text-zinc-400">Establish the rules, tone, and setting for your AI Dungeon Master.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10 bg-zinc-900 border border-zinc-800 p-8 rounded-2xl">
          
          {/* CAMPAIGN NAME */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Campaign Name</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., The Mines of Phandelver..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
            />
          </div>

          {/* THEMES */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              World Theme <span className="text-zinc-500 text-xs font-normal">(Select up to 3)</span>
            </label>
            <p className="text-xs text-zinc-500 mb-4">The AI will build lore, NPCs, and environments based on these tags.</p>
            <div className="flex flex-wrap gap-3">
              {THEMES.map((t) => {
                const isSelected = selectedThemes.includes(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => toggleTheme(t.id)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all flex items-center gap-2 ${
                      isSelected 
                        ? 'bg-red-500/10 border-red-500/50 text-red-400' 
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                    }`}
                  >
                    <span>{t.icon}</span> {t.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AGE RATING */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-4">ESRB Content Rating</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AGE_RATINGS.map((rating) => (
                <button
                  type="button"
                  key={rating.id}
                  onClick={() => setAgeRating(rating.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    ageRating === rating.id 
                      ? 'bg-red-500/10 border-red-500 text-white' 
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-bold mb-1">{rating.title}</div>
                  <div className="text-xs opacity-80 leading-relaxed">{rating.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* LEVELING SYSTEM */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-4">Progression Mechanics</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LEVELING_SYSTEMS.map((sys) => (
                <button
                  type="button"
                  key={sys.id}
                  onClick={() => setLeveling(sys.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    leveling === sys.id 
                      ? 'bg-blue-500/10 border-blue-500 text-white' 
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-bold mb-1">{sys.title}</div>
                  <div className="text-xs opacity-80 leading-relaxed">{sys.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-6 border-t border-zinc-800">
            <button
              type="submit"
              disabled={isPending || !name}
              className="w-full bg-white text-black font-bold text-lg py-4 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isPending ? 'Forging World...' : 'Initialize Campaign Engine'}
            </button>
          </div>
          
        </form>
      </main>
    </div>
  );
}