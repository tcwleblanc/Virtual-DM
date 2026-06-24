import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { getRelevantLore, saveToCampaignMemory } from '@/lib/memory';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, campaignId, characterId } = await req.json();

  // 1. Isolate the player's immediate, current message
  const currentMessage = messages[messages.length - 1];
  const userText = currentMessage?.content || '';

  // 2. Perform the Semantic RAG Search across deep history
  const deepLoreContext = await getRelevantLore(campaignId, userText);

  // 3. Keep only the last 8 messages for temporal continuity (Short-Term Stream)
  const shortTermHistory = messages.slice(-8);

  // 4. Forge the System Prompt using the RAG injection
  const dynamicSystemPrompt = `
    You are the AI Dungeon Master running a dynamic TTRPG campaign.
    
    CRITICAL LONG-TERM LORE CONTEXT:
    The following fragments were retrieved from deep campaign history based on semantic relevance to the player's current action. Use them to maintain deep narrative consistency:
    ${deepLoreContext}
    
    CORE RULE: Do not repeat these fragments verbatim unless asked. Use them to silently inform your world state, NPC reactions, and environmental details.
  `;

  // 5. Fire up the Gemini Engine
  const result = streamText({
    model: google('gemini-3.5-flash') as any,
    system: dynamicSystemPrompt,
    messages: shortTermHistory,
    onFinish: async (response) => {
      // 6. Async Event: Fire and forget memory writes so the user experience stays fast
      // Save the user's input
      await saveToCampaignMemory(campaignId, 'user', userText);
      // Save the AI's generated response
      await saveToCampaignMemory(campaignId, 'assistant', response.text);
    }
  });

  return result.toTextStreamResponse();
}