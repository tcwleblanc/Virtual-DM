import { streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const characterSchema = z.object({
  name: z.string().describe("The character's name"),
  classAndLevel: z.string().describe("A custom class or archetype and their starting level"),
  stats: z.record(z.string(), z.number()).describe("Dynamic stats fitting the theme"),
  inventory: z.array(z.string()).describe("Starting equipment"),
  spellbook: z.array(z.object({
    name: z.string(),
    effect: z.string()
  })).describe("Spells, tech-abilities, or special traits")
});

type CoreAIModel = ReturnType<typeof google>;

function withFallback(primary: CoreAIModel, backup: CoreAIModel): CoreAIModel {
  return {
    ...primary,
    doStream: async (options: Parameters<CoreAIModel['doStream']>[0]) => {
      try {
        return await primary.doStream(options);
      } catch (error) {
        console.warn("Primary model disrupted. Rerouting to backup model...");
        return await backup.doStream(options);
      }
    },
    doGenerate: async (options: Parameters<CoreAIModel['doGenerate']>[0]) => {
      try {
        return await primary.doGenerate(options);
      } catch (error) {
        console.warn("Primary model disrupted. Rerouting to backup model...");
        return await backup.doGenerate(options);
      }
    }
  };
}

export async function POST(req: Request) {
  const { messages, campaignContext } = await req.json();

  const coreMessages = messages.map((m: any) => ({
    ...m,
    content: m.content || (m.parts?.map((p: any) => p.text || '').join('')) || ''
  }));

  // 1. ADD THE GREETING INSTRUCTION TO THE SYSTEM PROMPT
  const systemPrompt = `
    You are an expert Game Master guiding a player through character creation for a tabletop RPG. 
    The current campaign theme is: ${campaignContext.theme}.
    The age rating is: ${campaignContext.ageRating}. 
    
    *** INITIALIZATION DIRECTIVE ***
    If the user's message is exactly "INITIALIZE_DM_GREETING", you must immediately set the scene. 
    Write 2-3 highly immersive, evocative sentences describing the world's atmosphere based heavily on the "${campaignContext.theme}" theme. 
    Then, warmly welcome the player to the character creation process and ask them what kind of character they envision playing. 
    Do NOT acknowledge the INITIALIZE_DM_GREETING command to the player. Just act as the DM starting the session.
    ********************************
    
    You are NOT bound by standard D&D 5e or 3.5 rules. You must invent or adapt classes, origins, abilities, 
    and spells that perfectly fit the campaign's specific theme. 
    
    Goal: Interview the player to figure out who they want to play.
    - If they are a veteran, ask for specifics.
    - If they are a novice, offer them 3 evocative, theme-appropriate archetypes to choose from.
    
    As you agree on details (name, archetype, abilities, stats), you MUST call the 'update_character_sheet' tool 
    to visually update the player's sheet on the screen. 
    
    Once the character is fully fleshed out, ask the player if they are ready to finalize and start the campaign.
  `;

  const primaryModel = google('gemini-3.5-flash') as CoreAIModel;
  const backupModel = google('gemini-2.5-flash') as CoreAIModel;
  const resilientModel = withFallback(primaryModel, backupModel);

  const result = await streamText({
    model: resilientModel, 
    system: systemPrompt,
    messages: coreMessages, 
    tools: {
      update_character_sheet: tool({
        description: 'Updates the live character sheet UI. Call this whenever new stats, abilities, or items are decided.',
        parameters: characterSchema,
      } as any),
    }
  });

  return result.toUIMessageStreamResponse();
}