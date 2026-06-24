import { 
  pgTable, 
  text, 
  timestamp, 
  uuid, 
  varchar, 
  jsonb, 
  integer, 
  boolean 
} from "drizzle-orm/pg-core";

// 1. PROFILES: Linked to Clerk Authentication
export const profiles = pgTable("profiles", {
  id: varchar("id", { length: 255 }).primaryKey(), // Clerk User ID
  username: varchar("username", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. CAMPAIGNS: The World State
export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  theme: varchar("theme", { length: 50 }).notNull(), // e.g., 'Classic D&D', 'Sci-Fi'
  levelingSystem: varchar("leveling_system", { length: 50 }).notNull(), // 'Milestone' or 'XP'
  ageRating: varchar("age_rating", { length: 10 }).notNull(), // 'PG-13', 'R', etc.
  stateSummary: text("state_summary"), // The AI's running context memory
  dmId: varchar("dm_id", { length: 255 }).references(() => profiles.id).notNull(), // Owner
  inviteCode: varchar("invite_code", { length: 20 }).unique().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. CHARACTERS: The Player's Avatar
export const characters = pgTable("characters", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id", { length: 255 }).references(() => profiles.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  classAndLevel: varchar("class_and_level", { length: 255 }),
  // JSONB is perfect here so we can inject dynamic stats based on the chosen Theme
  stats: jsonb("stats").notNull().$type<Record<string, any>>(), 
  inventory: jsonb("inventory").default([]).$type<Array<any>>(),
  spellbook: jsonb("spellbook").default([]).$type<Array<any>>(),
  isAlive: boolean("is_alive").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 4. CHARACTER HISTORY: The Audit Log & History Tab Source
export const characterHistory = pgTable("character_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  characterId: uuid("character_id").references(() => characters.id, { onDelete: 'cascade' }).notNull(),
  actor: varchar("actor", { length: 50 }).notNull(), // 'AI_DM' or 'PLAYER'
  changedStat: varchar("changed_stat", { length: 100 }).notNull(), // e.g., 'HP', 'Gold', 'Spell_Slot'
  changeAmount: integer("change_amount").notNull(), // e.g., -8, +50
  narrativeReason: text("narrative_reason").notNull(), // e.g., "Took fire damage from the Dragon's breath."
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});