import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { db } from '@/db';
import { campaigns, characters } from '@/db/schema';
import { eq } from 'drizzle-orm';
import DeleteCampaignModal from '@/components/DeleteCampaignModal';

export default async function CampaignManager() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  const hostedCampaigns = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.dmId, userId));

  // 1. UPDATED QUERY: Fetch classAndLevel and createdAt
  const playingRecords = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      theme: campaigns.theme,
      createdAt: campaigns.createdAt,
      characterName: characters.name, 
      classAndLevel: characters.classAndLevel,
    })
    .from(characters)
    .innerJoin(campaigns, eq(characters.campaignId, campaigns.id))
    .where(eq(characters.userId, userId));

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 text-zinc-50 font-sans p-8 pb-24">
      <nav className="flex justify-between items-center mb-12 border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
          AI Dungeon Master
        </h1>
        <div className="flex items-center gap-6">
          <Link href="/settings" className="text-zinc-400 hover:text-zinc-100 transition-colors">
            API Settings (BYOK)
          </Link>
          <UserButton />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-widest text-zinc-100">Your Campaigns</h2>
            <p className="text-zinc-400 text-sm mt-2">Select a world to enter the Virtual Tabletop.</p>
          </div>
          <Link 
            href="/campaign/new" 
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-500 transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]"
          >
            + Forge New World
          </Link>
        </div>

        {hostedCampaigns.length === 0 && playingRecords.length === 0 && (
          <div className="text-center py-24 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
            <p className="text-zinc-400 text-lg mb-4 font-medium">You have not joined or created any campaigns yet.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* HOSTED CAMPAIGNS */}
          {hostedCampaigns.map((campaign) => (
            <div key={`dm-${campaign.id}`} className="relative bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-red-900/50 transition-all shadow-lg overflow-hidden group flex flex-col">
              
              {/* The discrete hover Delete button (z-20) */}
              <div className="absolute top-4 right-4 z-20">
                <DeleteCampaignModal campaignId={campaign.id} campaignName={campaign.name} />
              </div>

              {/* The rich card content (z-10) */}
              <Link href={`/campaign/${campaign.id}`} className="p-6 flex-1 hover:bg-zinc-800/30 transition-colors flex flex-col z-10">
                <div className="flex items-start mb-4 gap-2">
                  <span className="text-xs px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold tracking-wide">
                    Host (DM)
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold tracking-wide uppercase">
                    {campaign.theme || 'Custom'}
                  </span>
                </div>
                
                <h3 className="text-2xl font-black text-white group-hover:text-red-400 transition-colors mb-2 pr-8">{campaign.name}</h3>
                
                <div className="mt-auto pt-6 space-y-2 border-t border-zinc-800/50 mt-6">
                  <div className="flex justify-between text-sm text-zinc-400">
                    <span>World Forged:</span>
                    <span className="text-zinc-300 font-medium">
                      {new Date(campaign.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-red-400 mt-6 flex items-center gap-2 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Launch Tabletop <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </Link>
            </div>
          ))}

          {/* PLAYING CAMPAIGNS (No deletion logic, just players) */}
          {playingRecords.map((record) => (
            <div key={`player-${record.id}`} className="relative bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-indigo-900/50 transition-all shadow-lg overflow-hidden group flex flex-col">
              <Link href={`/campaign/${record.id}`} className="p-6 flex-1 hover:bg-zinc-800/30 transition-colors flex flex-col z-10">
                
                <div className="flex items-start mb-4 gap-2">
                  <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold tracking-wide">
                    Player
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold tracking-wide uppercase">
                    {record.theme || 'Custom'}
                  </span>
                </div>
                
                <h3 className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors mb-4">{record.name}</h3>
                
                {/* Embedded Character Block */}
                <div className="mt-2 p-4 rounded-xl border border-zinc-800 bg-zinc-950/50">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Your Character</p>
                  <p className="text-lg font-black text-emerald-400">{record.characterName}</p>
                  <p className="text-sm text-zinc-400">{record.classAndLevel || 'Level 1'}</p>
                </div>

                <div className="mt-auto pt-6 border-t border-zinc-800/50 space-y-2">
                  <div className="flex justify-between text-sm text-zinc-400">
                    <span>Journey Began:</span>
                    <span className="text-zinc-300 font-medium">
                       {new Date(record.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-indigo-400 mt-6 flex items-center gap-2 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Join Tabletop <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </Link>
            </div>
          ))}

        </div>
      </main>
    </div>
  );
}