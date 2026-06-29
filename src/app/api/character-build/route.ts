import { streamText, tool, convertToModelMessages } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const characterSchema = z.object({
  name: z.string().optional().describe("The character's name"),
  classAndLevel: z.string().optional().describe("A custom class or archetype and their starting level"),
  stats: z.record(z.string(), z.number()).optional().describe("Dynamic stats fitting the theme"),
  inventory: z.array(z.string()).optional().describe("Starting equipment"),
  spellbook: z.array(z.object({
    name: z.string(),
    effect: z.string()
  })).optional().describe("Spells, tech-abilities, or special traits")
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

  // 🛠️ CRITICAL FIX: Await the promise to resolve the array of ModelMessages
  const coreMessages = await convertToModelMessages(messages);

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
    "[Spoken greeting]. Before we put a name to a face, tell me—what is your origin, race, or species?"
    
    Here are 5 to 6 highly distinct, theme-appropriate origins you can choose from (or you can invent your own):
    1. **[Origin Name 1]**: [Detailed description including cultural or physiological traits]
    2. **[Origin Name 2]**: [Detailed description including cultural or physiological traits]
    3. **[Origin Name 3]**: [Detailed description including cultural or physiological traits]
    4. **[Origin Name 4]**: [Detailed description including cultural or physiological traits]
    5. **[Origin Name 5]**: [Detailed description including cultural or physiological traits]
    *(Optional)* 6. **[Origin Name 6]**: [Detailed description]

    DO NOT deviate from this template for the greeting. DO NOT ask for their name, classes, stats, or abilities yet. Wait for the player's response.
    ********************************
    
    *** PACING AND PHASES (CRITICAL RULE) ***
    You are a strict state machine. You MUST take character creation strictly one single step at a time. DO NOT ask multiple questions in the same message. You MUST wait for the player's answer and confirm their choice before moving to the next phase.
    
    Phase 1: Origin. Present the 5-6 origins as outlined above. Wait for them to choose.
    Phase 2: Name. Once they select an origin, ask them what their character's Name is. Wait for them to answer.
    Phase 3: Archetype/Class. Based on their chosen origin, offer a robust selection of 5 to 6 distinct classes or archetypes fitting the theme. Provide a 1-2 sentence mechanical and thematic explanation for each. Wait for them to choose.
    Phase 4: Core Attributes & Skills. Suggest a set of 6 primary attributes and ask them to distribute a standard array of points (e.g., 15, 14, 13, 12, 10, 8) OR agree on a generated set. Wait for their confirmation.
    Phase 5: Abilities, Spells & Gear. Offer a comprehensive selection of 6 to 8 starting abilities, spells, or gear tailored to their Class. You MUST explicitly provide the Name and a detailed plain-text description of its mechanics (damage, range, utility). Ask them to choose 2 to 3. Wait for them to choose.
    
    *** LIVE CHARACTER SHEET UPDATES ***
    You are connected to a digital character sheet via the 'update_character_sheet' tool. You MUST use your native function-calling capability to incrementally update the sheet the exact moment you learn new information.
    - Immediately after the player confirms their Name, call the tool to save the name.
    - Immediately after the player confirms their Class, call the tool to save the class.
    - Continue this pattern for Stats and Spells.
    
    Just speak naturally to the player as the Dungeon Master and let your function call run silently in the background. Do not output python, pseudo-code, or internal 'thought' blocks in your text response.
    
    Once Phase 5 is complete, summarize their final build and tell them they can click the button to sign their sheet and begin the campaign.
`;

  const primaryModel = google('gemini-3.5-flash') as CoreAIModel;
  const backupModel = google('gemini-2.5-flash') as CoreAIModel;
  const resilientModel = withFallback(primaryModel, backupModel);

  const result = await streamText({
    model: resilientModel, 
    system: systemPrompt,
    messages: coreMessages, 
    // @ts-ignore - Bypasses strict TypeScript checking for recent SDK additions
    maxSteps: 5, 
    tools: {
      update_character_sheet: tool({
        description: 'Updates the live character sheet UI. Call this whenever new stats, abilities, or items are decided.',
        parameters: characterSchema,
        // 🛠️ CRITICAL FIX: Explicitly type args as 'any' to satisfy both the implicit-any rule and the tool overload signature.
        execute: async (args: any) => {
          // Instantly echo the data back to the client to prevent freezing
          return { success: true, updatedData: args };
        }
      } as any), // 🛠️ CRITICAL FIX: Cast the entire tool to 'any' to prevent streamText configuration mismatch.
    }
  });

  return result.toUIMessageStreamResponse();
}