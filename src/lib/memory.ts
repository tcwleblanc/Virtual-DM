import { db } from '@/db';
import { campaignMemory } from '@/db/schema';
import { embed } from 'ai';
import { google } from '@ai-sdk/google';
import { eq, desc, sql, cosineDistance } from 'drizzle-orm';

export async function getRelevantLore(campaignId: string, userPrompt: string): Promise<string> {
  try {
    const { embedding } = await embed({
      model: google.embedding('gemini-embedding-2'),
      value: userPrompt,
    });

    // 🎲 ARCHITECT FIX: Matryoshka Truncation - Slice down to 768 to fit the HNSW Index
    const truncatedEmbedding = embedding.slice(0, 768);

    const similarityScore = sql<number>`1 - (${cosineDistance(campaignMemory.embedding, truncatedEmbedding)})`;

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

export async function saveToCampaignMemory(
  campaignId: string, 
  role: 'user' | 'assistant', 
  content: string
) {
  try {
    const { embedding } = await embed({
      model: google.embedding('gemini-embedding-2'),
      value: content,
    });

    // 🎲 ARCHITECT FIX: Matryoshka Truncation before insertion
    const truncatedEmbedding = embedding.slice(0, 768);

    await db.insert(campaignMemory).values({
      campaignId,
      role,
      content,
      embedding: truncatedEmbedding,
    });
  } catch (error) {
    console.error("Failed to commit memory chunk:", error);
  }
}