import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import StoryChat from '@/components/StoryChat';
import CharacterHub from '@/components/CharacterHub';

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Ensure player security clearance
  const user = await currentUser();
  if (!user) {
    redirect('/');
  }

  const { id: campaignId } = await params;
  
  // A clean placeholder ID for testing. 
  const mockCharacterId = "mock-character-123";

  return (
    <div className="flex h-[calc(100vh-73px)] w-full bg-neutral-950 text-neutral-200 overflow-hidden">
      
      {/* LEFT PANE: The Narrative Stream (65%) */}
      <section className="w-[65%] border-r border-neutral-800 h-full">
        <StoryChat campaignId={campaignId} characterId={mockCharacterId} />
      </section>

      {/* RIGHT PANE: The Real-Time Character Sheet Dashboard (35%) */}
      <section className="w-[35%] h-full">
        <CharacterHub characterId={mockCharacterId} />
      </section>

    </div>
  );
}