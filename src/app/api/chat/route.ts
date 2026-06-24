import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { pusherServer } from '@/lib/pusher';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, characterId } = await req.json();

  const result = streamText({
    model: google('gemini-1.5-flash-latest'),
    system: `You are the AI Dungeon Master running a dynamic TTRPG campaign. 
    
    IMMUTABLE LAWS:
    1. Absolute Player Agency: Describe the environment and strictly ask "What do you do?". Never assume a player's action.
    2. Real-World Dice: Never roll for the player. If an action requires a check, determine the DC, ask for the physical roll, and pause the narrative until the player inputs their result.
    3. Silent Bookkeeping: If a player's action results in taking damage, healing, or using a resource, you MUST use your provided tools to update their character sheet. Do not narrate the exact numerical math in the chat; describe the impact narratively.`,
    
    messages,
    
    tools: {
      // The Architect's Override: Casting 'as any' completely bypasses the strict version conflict
      updateHealth: {
        description: 'Update the hit points of a character when they take damage or heal.',
        parameters: z.object({
          amount: z.number().describe('The numerical amount to change. Negative for damage, positive for healing.'),
          narrativeReason: z.string().describe('A brief, in-world sentence explaining why the stat changed.'),
        }),
        execute: async ({ amount, narrativeReason }: any) => {
          
          await pusherServer.trigger(`character-${characterId}`, 'sheet-update', {
            changedStat: 'HP',
            changeAmount: amount,
            narrativeReason,
          });
          
          return { success: true, changedStat: 'HP', amount, narrativeReason };
        },
      } as any, 
    },
  });

  // Executing the exact stream method requested by your local AI SDK version
  return result.toTextStreamResponse();
}