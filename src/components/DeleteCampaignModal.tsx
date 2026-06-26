'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, Trash2, Users } from 'lucide-react';
import { deleteCampaignOnlyAction, deleteCampaignAndCharactersAction } from '@/app/actions/campaign-actions';

interface DeleteModalProps {
  campaignId: string;
  campaignName: string;
}

export default function DeleteCampaignModal({ campaignId, campaignName }: DeleteModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDeleteOnly = () => {
    startTransition(async () => {
      try {
        await deleteCampaignOnlyAction(campaignId);
        setIsOpen(false);
      } catch (error) {
        console.error("Failed to delete campaign:", error);
      }
    });
  };

  const handleDeleteAll = () => {
    startTransition(async () => {
      try {
        await deleteCampaignAndCharactersAction(campaignId);
        setIsOpen(false);
      } catch (error) {
        console.error("Failed to delete campaign and characters:", error);
      }
    });
  };

  // 1. UPDATED TRIGGER: Minimal hover icon
  if (!isOpen) {
    return (
      <button 
        onClick={(e) => {
          e.preventDefault(); // Prevents the card's <Link> from triggering
          setIsOpen(true);
        }}
        className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        title="Delete Campaign"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    );
  }

  // 2. MODAL REMAINS THE SAME, but we intercept clicks to prevent route changes
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} // Stop clicks from bubbling to the card
    >
      <div className="bg-neutral-950 border border-red-900/50 p-6 rounded-2xl max-w-md w-full shadow-2xl">
        
        <div className="flex items-center gap-3 mb-4 text-red-500">
          <AlertTriangle className="w-8 h-8" />
          <h2 className="text-xl font-black uppercase tracking-wider">Danger Zone</h2>
        </div>
        
        <p className="text-neutral-300 mb-6 leading-relaxed">
          You are about to permanently delete <strong className="text-white">{campaignName}</strong>. 
          This action will wipe the world state, lore, and history from the database forever. 
          <br/><br/>
          What would you like to do with the player characters?
        </p>

        <div className="space-y-3">
          <button 
            onClick={handleDeleteOnly}
            disabled={isPending}
            className="w-full flex items-start gap-4 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-left transition-all disabled:opacity-50"
          >
            <Users className="w-6 h-6 text-indigo-400 shrink-0 mt-1" />
            <div>
              <div className="font-bold text-indigo-300 mb-1">Delete Campaign, Save Characters</div>
              <div className="text-xs text-indigo-200/70">The world is destroyed, but the characters will be sent to your Vault.</div>
            </div>
          </button>

          <button 
            onClick={handleDeleteAll}
            disabled={isPending}
            className="w-full flex items-start gap-4 p-4 rounded-xl border border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-left transition-all disabled:opacity-50"
          >
            <Trash2 className="w-6 h-6 text-red-400 shrink-0 mt-1" />
            <div>
              <div className="font-bold text-red-400 mb-1">Total Annihilation</div>
              <div className="text-xs text-red-300/70">Destroy the world AND permanently delete all associated characters.</div>
            </div>
          </button>
        </div>

        <button 
          onClick={() => setIsOpen(false)}
          disabled={isPending}
          className="w-full mt-6 py-3 font-bold text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}