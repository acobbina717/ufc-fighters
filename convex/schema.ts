import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  fighters: defineTable({
    name: v.string(),
    nickname: v.optional(v.string()),
    weightClass: v.string(),
    division: v.union(v.literal("mens"), v.literal("womens")),
    ranking: v.optional(v.number()),
    record: v.object({
      wins: v.number(),
      losses: v.number(),
      draws: v.number(),
      noContests: v.number(),
    }),
    stats: v.object({
      slpm: v.number(),
      strikingAccuracy: v.number(),
      sapm: v.number(),
      strikingDefense: v.number(),
      takedownAvg: v.number(),
      takedownAccuracy: v.number(),
      takedownDefense: v.number(),
      submissionAvg: v.number(),
    }),
    country: v.optional(v.string()),
    weight: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    ufcUrl: v.string(),
    ufcStatsUrl: v.string(),
    lastSynced: v.number(),
    videoUrl: v.optional(v.string()),      // permanent Convex File Storage URL
  })
    .index("by_weight_class", ["weightClass"])
    .index("by_weight_class_division", ["weightClass", "division"])
    .index("by_weight_class_ranking", ["weightClass", "ranking"])
    .index("by_ufc_url", ["ufcUrl"]),

  // One record per UFC event (upcoming and past). Past events are kept
  // indefinitely to power fight history. Indexed by date for "next event".
  events: defineTable({
    name: v.string(),            // e.g. "UFC 314"
    date: v.number(),            // Unix timestamp (ms)
    venue: v.string(),
    location: v.string(),
    slug: v.string(),            // ufc.com/event/{slug} — used for idempotent upsert
    lastSynced: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_slug", ["slug"]),

  // One record per scheduled fight within an event. Separate table (not embedded
  // in events) so per-fighter indexed queries answer "next fight" without scanning.
  bouts: defineTable({
    eventId: v.id("events"),
    fighterAId: v.id("fighters"),               // always the known fighter
    fighterBId: v.optional(v.id("fighters")),   // absent = TBA opponent
    weightClass: v.string(),
    cardTier: v.union(
      v.literal("main"),
      v.literal("prelim"),
      v.literal("early_prelim")
    ),
    boutOrder: v.number(),                       // 1 = main event, ascending down the card
  })
    .index("by_event", ["eventId"])
    .index("by_fighter_a", ["fighterAId"])
    .index("by_fighter_b", ["fighterBId"]),
});
