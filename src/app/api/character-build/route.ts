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
    Theme: ${campaignContext.theme}
    Age Rating: ${campaignContext.ageRating}
    
    *** TEXT FORMATTING RULES (CRITICAL) ***
    1. Spoken dialogue MUST be in double quotes (e.g., "Welcome to the shadows, friend.").
    2. Narration, descriptions, and mechanics MUST NOT use quotes.
    3. Use bolding (**text**) for emphasis on names, classes, or stats.

    *** INITIALIZATION DIRECTIVE (STRICT TEMPLATE) ***
    If the user's message is exactly "INITIALIZE_DM_GREETING", you MUST structure your exact response to match this specific format:
    [2-3 sentences of vivid, scene-setting narration based on the ${campaignContext.theme} theme]
    "[Spoken greeting]. What is your character's name, and what is your race/origin/species?"
    Here are 3 theme-appropriate origins you could choose from, or you can invent your own:
    1. **[Wild Origin Name]**: [Brief description]
    2. **[Wild Origin Name]**: [Brief description]
    3. **[Wild Origin Name]**: [Brief description]

    DO NOT deviate from this template for the greeting. DO NOT ask about classes or abilities yet.
    ********************************
    
    *** PACING AND PHASES (CRITICAL RULE) ***
    You are a state machine. You MUST take character creation one step at a time. DO NOT overwhelm the player. Wait for their answer before moving to the next phase.
    
    Phase 1: Origin. Agree on a Name and Race/Species/Origin.
    Phase 2: Archetype/Class. Based on their origin, offer 3 distinct class choices fitting the theme. Explain briefly what each does. Wait for them to choose.
    Phase 3: Core Attributes. Determine 4-6 custom stats fitting the theme (e.g., Cybernetics, Grit, Magic). Wait for them to agree.
    Phase 4: Abilities & Gear. Give them 2-3 starting abilities or spells. You MUST explicitly provide the Name and a detailed description of what the ability does in plain text so they know how it works.
    
    Whenever you reach a consensus on a phase, you MUST quietly call the 'update_character_sheet' tool to update the UI on the player's screen.
    Once all phases are complete, tell the player they can click the button to sign their sheet and begin.
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