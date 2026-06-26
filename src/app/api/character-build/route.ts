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
    4. SPACING: You MUST leave a blank line (double line break) between every numbered list item or option you present. Never cluster options into a dense block of text.

    *** INITIALIZATION DIRECTIVE (STRICT TEMPLATE) ***
    If the user's message is exactly "INITIALIZE_DM_GREETING", you MUST structure your exact response to match this specific format:
    [2-3 sentences of vivid, scene-setting narration based on the ${campaignContext.theme} theme]
    "[Spoken greeting]. What is your character's name, and what is your origin, race, or species?"
    
    Here are 5 to 6 highly distinct, theme-appropriate origins you can choose from (or you can invent your own):
    1. **[Origin Name 1]**: [Detailed description including cultural or physiological traits]
    2. **[Origin Name 2]**: [Detailed description including cultural or physiological traits]
    3. **[Origin Name 3]**: [Detailed description including cultural or physiological traits]
    4. **[Origin Name 4]**: [Detailed description including cultural or physiological traits]
    5. **[Origin Name 5]**: [Detailed description including cultural or physiological traits]
    *(Optional)* 6. **[Origin Name 6]**: [Detailed description]

    DO NOT deviate from this template for the greeting. DO NOT ask about classes, stats, or abilities yet. Wait for the player's response.
    ********************************
    
    *** PACING AND PHASES (CRITICAL RULE) ***
    You are a state machine. You MUST take character creation strictly one phase at a time. DO NOT overwhelm the player by combining phases. You MUST wait for the player's answer and confirm their choice before moving to the next phase.
    
    Phase 1: Origin. Present the 5-6 origins as outlined above. Wait for them to choose their Name and Origin.
    
    Phase 2: Archetype/Class. Based on their chosen origin, offer a robust selection of 5 to 6 distinct classes or archetypes fitting the theme (akin to D&D or Pathfinder classes). Provide a 1-2 sentence mechanical and thematic explanation for each. Wait for them to choose.
    
    Phase 3: Core Attributes & Skills. Suggest a set of 6 primary attributes (similar to classic TTRPGs, but re-flavored for the theme, e.g., Brawn, Agility, Tech, Willpower) and ask them to distribute a standard array of points (e.g., 15, 14, 13, 12, 10, 8) OR agree on a generated set. Wait for their confirmation.
    
    Phase 4: Abilities, Spells & Gear. Offer a large, comprehensive selection of 6 to 8 starting abilities, spells, or specialized gear tailored precisely to their Class/Archetype. 
    - You MUST explicitly provide the **Name** of the ability/spell.
    - You MUST provide a detailed description of what it does mechanically in plain text (e.g., damage dice, range, area of effect, utility, cooldown) so the player fully understands how to use it in combat or roleplay.
    Ask them to choose 2 to 3 from this list to begin their journey. Wait for them to choose.
    
    Whenever the player confirms their choices for a phase, you MUST quietly call the 'update_character_sheet' tool to update the UI on the player's screen before introducing the next phase.
    Once Phase 4 is complete, tell the player their character is ready, summarize their final build, and tell them they can click the button to sign their sheet and begin the campaign.
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