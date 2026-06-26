'use server';

import { db } from "@/db";
import { campaigns, characters } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// Helper to verify ownership
async function verifyCampaignOwnership(campaignId: string, userId: string) {
  const campaign = await db.query.campaigns.findFirst({
    where: and(eq(campaigns.id, campaignId), eq(campaigns.dmId, userId))
  });
  if (!campaign) throw new Error("Unauthorized: You do not own this campaign.");
}

// Option A: Delete Campaign, Vault Characters
export async function deleteCampaignOnlyAction(campaignId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await verifyCampaignOwnership(campaignId, userId);

  // 1. Detach characters (Move to Vault) by setting campaignId to null
  await db.update(characters)
    .set({ campaignId: null })
    .where(eq(characters.campaignId, campaignId));

  // 2. Delete the campaign
  await db.delete(campaigns).where(eq(campaigns.id, campaignId));

  revalidatePath('/'); // Refresh the dashboard
}

// Option B: Total Wipe
export async function deleteCampaignAndCharactersAction(campaignId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await verifyCampaignOwnership(campaignId, userId);

  // 1. Permanently delete all characters in this campaign
  await db.delete(characters).where(eq(characters.campaignId, campaignId));

  // 2. Delete the campaign
  await db.delete(campaigns).where(eq(campaigns.id, campaignId));

  revalidatePath('/'); // Refresh the dashboard
}