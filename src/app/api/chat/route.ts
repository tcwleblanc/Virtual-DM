import { streamText } from 'ai';
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { getRelevantLore, saveToCampaignMemory } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const maxDuration = 60;
const FREE_TIER_DAILY_LIMIT = 50; 

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { messages, campaignId, characterId } = await req.json();

  const [userProfile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  
  if (!userProfile) {
      return new Response('Profile not found', { status: 404 });
  }

  const today = new Date().toDateString();
  const lastMessageDay = new Date(userProfile.lastMessageDate).toDateString();
  let currentUsage = userProfile.dailyMessageCount;

  if (today !== lastMessageDay) {
    currentUsage = 0; 
  }

  if (!userProfile.customApiKey && currentUsage >= FREE_TIER_DAILY_LIMIT) {
    return new Response(
      JSON.stringify({ error: "Daily limit reached. Please upgrade or provide your own API Key in Settings." }), 
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  Promise.resolve(
    db.update(profiles)
      .set({ 
        dailyMessageCount: currentUsage + 1, 
        lastMessageDate: new Date() 
      })
      .where(eq(profiles.id, userId))
  ).catch(err => console.error("Failed to update rate limit:", err));

  const aiProvider = userProfile.customApiKey 
    ? createGoogleGenerativeAI({ apiKey: userProfile.customApiKey })
    : google; 

  const currentMessage = messages[messages.length - 1];
  const userText = currentMessage?.content || '';

  const deepLoreContext = await getRelevantLore(campaignId, userText);
  const shortTermHistory = messages.slice(-8);

  const dynamicSystemPrompt = `
    You are the AI Dungeon Master running a dynamic TTRPG campaign.
    CRITICAL LONG-TERM LORE CONTEXT:
    ${deepLoreContext}
    CORE RULE: Do not repeat these fragments verbatim unless asked.
  `;

  const result = streamText({
    // FIX: Reverted to 3.5-flash and cast as any to bypass the V1/V3 interface mismatch
    model: aiProvider('gemini-3.5-flash') as any, 
    system: dynamicSystemPrompt,
    messages: shortTermHistory,
    onFinish: async (response) => {
      await saveToCampaignMemory(campaignId, 'user', userText);
      await saveToCampaignMemory(campaignId, 'assistant', response.text);
    }
  });

  return result.toTextStreamResponse();
}