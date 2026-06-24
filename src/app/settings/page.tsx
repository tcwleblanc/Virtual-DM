import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { db } from '@/db';
import { campaigns, characters, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function CampaignManager() {
  const { userId } = await auth();
  const user = await currentUser();
  
  if (!userId || !user) {
    redirect('/sign-in');
  }

  // --- LAZY PROFILE CREATION ---
  let [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));

  if (!profile) {
    await db.insert(profiles).values({
      id: userId,
      username: user.username || user.firstName || 'Adventurer',
      avatarUrl: user.imageUrl,
      dailyMessageCount: 0,
    });
  }
  // -----------------------------

  const hostedCampaigns = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.dmId, userId));

  const playingRecords = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      theme: campaigns.theme,
      characterName: characters.name, 
    })
    .from(characters)
    .innerJoin(campaigns, eq(characters.campaignId, campaigns.id))
    .where(eq(characters.userId, userId));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans p-8">
      <nav className="flex justify-between items-center mb-16 border-b border-zinc-800 pb-4">
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
            <h2 className="text-2xl font-semibold">Your Campaigns</h2>
            <p className="text-zinc-400 text-sm mt-1">Select a world to enter the Virtual Tabletop.</p>
          </div>
          <Link 
            href="/campaign/new" 
            className="bg-white text-black px-5 py-2.5 rounded-md font-medium hover:bg-zinc-200 transition-colors"
          >
            + Forge New World
          </Link>
        </div>

        {hostedCampaigns.length === 0 && playingRecords.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-xl">
            <p className="text-zinc-500 mb-4">You have not joined or created any campaigns yet.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hostedCampaigns.map((campaign) => (
            <Link href={`/campaign/${campaign.id}`} key={`dm-${campaign.id}`} 
                  className="block group bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-red-900/50 transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {campaign.theme || 'Custom'}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Host
                </span>
              </div>
              <h3 className="text-xl font-bold group-hover:text-red-400 transition-colors">{campaign.name}</h3>
              <p className="text-sm text-zinc-400 mt-4 flex items-center gap-2">
                Launch Session <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </p>
            </Link>
          ))}

          {playingRecords.map((record) => (
            <Link href={`/campaign/${record.id}`} key={`player-${record.id}`} 
                  className="block group bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-blue-900/50 transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {record.theme || 'Custom'}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Player
                </span>
              </div>
              <h3 className="text-xl font-bold group-hover:text-blue-400 transition-colors">{record.name}</h3>
              <p className="text-sm text-zinc-400 mt-2">Playing as: <span className="text-zinc-300">{record.characterName}</span></p>
              <p className="text-sm text-zinc-400 mt-4 flex items-center gap-2">
                Join Table <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}