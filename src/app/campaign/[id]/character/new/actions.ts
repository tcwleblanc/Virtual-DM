'use server'

import { db } from "@/db";
import { campaigns, characters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function getCampaignContext(campaignId: string) {
  const session = await auth();
  if (!session.userId) throw new Error("Unauthorized");

  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, campaignId),
  });

  if (!campaign) throw new Error("Campaign not found");
  return campaign;
}

export async function saveCharacter(
  campaignId: string, 
  characterData: {
    name: string;
    classAndLevel: string;
    stats: Record<string, any>;
    inventory: Array<any>;
    spellbook: Array<any>;
  }
) {
  const session = await auth();
  if (!session.userId) throw new Error("Unauthorized");

  const [newCharacter] = await db.insert(characters).values({
    campaignId,
    userId: session.userId,
    name: characterData.name,
    classAndLevel: characterData.classAndLevel,
    stats: characterData.stats,
    inventory: characterData.inventory,
    spellbook: characterData.spellbook,
    isAlive: true,
  }).returning();

  return newCharacter.id;
}