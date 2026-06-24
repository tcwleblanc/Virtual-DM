import { db } from '@/db';
import { campaignMemory } from '@/db/schema';
import { embed } from 'ai';
import { google } from '@ai-sdk/google';
import { eq, desc, sql, cosineDistance } from 'drizzle-orm';

/**
 * Searches the campaign memory for the top 5 most relevant historical interactions
 */
export async function getRelevantLore(campaignId: string, userPrompt: string): Promise<string> {
  try {
    // 1. Generate the mathematical vector using Google's embedding engine
    const { embedding } = await embed({
      model: google.embedding('text-embedding-004') as any,
      value: userPrompt,
    });

    // 2. Query Neon using pgvector cosine distance
    const similarityScore = sql<number>`1 - (${cosineDistance(campaignMemory.embedding, embedding)})`;

    const records = await db
      .select({
        role: campaignMemory.role,
        content: campaignMemory.content,
        similarity: similarityScore,
      })
      .from(campaignMemory)
      .where(eq(campaignMemory.campaignId, campaignId))
      .orderBy(desc(similarityScore))
      .limit(5);

    if (records.length === 0) return "No ancient memories match this context.";

    // ARCHITECT FIX: Explicitly typed 'r' to prevent implicit 'any' error
    return records
      .map((r: { role: string; content: string; similarity: number }) => 
        `[Past Event - Role: ${r.role} (Similarity: ${Math.round(Number(r.similarity) * 100)}%)]: "${r.content}"`
      )
      .join('\n');
  } catch (error) {
    console.error("RAG Retrieval Failed:", error);
    return "Failed to retrieve historical lore layers.";
  }
}

/**
 * Permanently saves an interaction and indexes its vector embedding
 */
export async function saveToCampaignMemory(
  campaignId: string, 
  role: 'user' | 'assistant', 
  content: string
) {
  try {
    const { embedding } = await embed({
      model: google.embedding('text-embedding-004') as any,
      value: content,
    });

    await db.insert(campaignMemory).values({
      campaignId,
      role,
      content,
      embedding,
    });
  } catch (error) {
    console.error("Failed to commit memory chunk:", error);
  }
}