import { streamText } from 'ai'; 
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { getRelevantLore, saveToCampaignMemory } from '@/lib/memory';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const maxDuration = 60;
const FREE_TIER_DAILY_LIMIT = 50; 

// 🎲 ARCHITECT FIX: Dynamically extract the perfect model interface directly from Google.
// This completely bypasses the 'ai' package type conflicts.
type CoreAIModel = ReturnType<typeof google>;

function withFallback(primary: CoreAIModel, backup: CoreAIModel): CoreAIModel {
  return {
    ...primary,
    // We use Parameters<T> to dynamically inherit the exact argument types Google expects
    doStream: async (options: Parameters<CoreAIModel['doStream']>[0]) => {
      try {
        return await primary.doStream(options);
      } catch (error) {
        console.warn("Primary weave disrupted (High Demand). Rerouting to backup weave...");
        return await backup.doStream(options);
      }
    },
    doGenerate: async (options: Parameters<CoreAIModel['doGenerate']>[0]) => {
      try {
        return await primary.doGenerate(options);
      } catch (error) {
        console.warn("Primary weave disrupted. Rerouting to backup weave...");
        return await backup.doGenerate(options);
      }
    }
  };
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { messages, campaignId } = await req.json();

  const [userProfile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  
  if (!userProfile) return new Response('Profile not found', { status: 404 });

  const today = new Date().toDateString();
  const lastMessageDay = new Date(userProfile.lastMessageDate).toDateString();
  let currentUsage = userProfile.dailyMessageCount;

  if (today !== lastMessageDay) currentUsage = 0; 

  if (!userProfile.customApiKey && currentUsage >= FREE_TIER_DAILY_LIMIT) {
    return new Response(
      JSON.stringify({ error: "Daily limit reached. Please upgrade or provide your own API Key in Settings." }), 
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  Promise.resolve(
    db.update(profiles)
      .set({ dailyMessageCount: currentUsage + 1, lastMessageDate: new Date() })
      .where(eq(profiles.id, userId))
  ).catch(err => console.error("Failed to update rate limit:", err));

  const aiProvider = userProfile.customApiKey 
    ? createGoogleGenerativeAI({ apiKey: userProfile.customApiKey })
    : google; 

  const currentMessage = messages[messages.length - 1];
  const userText = currentMessage?.content || 
                   currentMessage?.parts?.map((p: any) => p.text).join('') || '';

  const deepLoreContext = await getRelevantLore(campaignId, userText);
  
  const shortTermHistory = messages.slice(-8).map((m: any) => ({
    role: m.role,
    content: m.content || m.parts?.map((p: any) => p.text).join('') || ''
  }));

  const dynamicSystemPrompt = `
    You are the AI Dungeon Master running a dynamic TTRPG campaign.
    CRITICAL LONG-TERM LORE CONTEXT:
    ${deepLoreContext}
    CORE RULE: Do not repeat these fragments verbatim unless asked.
  `;

// Initialize our custom fallback chain with strict typing
  const primaryModel = aiProvider('gemini-3.5-flash') as CoreAIModel;
  const backupModel = aiProvider('gemini-2.5-flash') as CoreAIModel;
  const resilientModel = withFallback(primaryModel, backupModel);

  try {
    const result = streamText({
      model: resilientModel,
      system: dynamicSystemPrompt,
      messages: shortTermHistory,
      onFinish: async (response) => {
        await saveToCampaignMemory(campaignId, 'user', userText);
        await saveToCampaignMemory(campaignId, 'assistant', response.text);
      }
    });

    return result.toUIMessageStreamResponse();
    
  } catch (error: any) {
    console.error("AI Generation Failed entirely:", error);
    return new Response(
      JSON.stringify({ 
        error: "The Weave of magic is temporarily disrupted. The Dungeon Master needs a moment to gather their thoughts. Please try again." 
      }), 
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}