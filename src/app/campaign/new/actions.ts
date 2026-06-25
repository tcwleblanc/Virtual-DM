'use server';

import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export async function createCampaignAction(formData: FormData) {
  // 1. Authenticate the User
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // 2. Extract Data from Form
  const name = formData.get('name') as string;
  const theme = formData.get('theme') as string;
  const levelingSystem = formData.get('levelingSystem') as string;
  const ageRating = formData.get('ageRating') as string;

  // 3. Generate a random invite code (e.g., 'X9F2K1L')
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  // 4. Insert into Neon via Drizzle
  const [newCampaign] = await db.insert(campaigns).values({
    name,
    // Note: The schema sets theme to varchar(50), so we truncate just in case they combined many themes
    theme: theme.substring(0, 50), 
    levelingSystem,
    ageRating,
    dmId: userId,
    inviteCode,
    stateSummary: "The world has been forged. The adventure is about to begin...",
  }).returning({ id: campaigns.id });

  // 5. Redirect the user to their new campaign's dashboard
  redirect(`/campaign/${newCampaign.id}`);
}