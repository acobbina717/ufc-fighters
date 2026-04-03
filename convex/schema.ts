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
    isActive: v.boolean(),
    videoUrl: v.optional(v.string()),      // permanent Convex File Storage URL
  })
    .index("by_weight_class", ["weightClass"])
    .index("by_weight_class_division", ["weightClass", "division"])
    .index("by_weight_class_ranking", ["weightClass", "ranking"])
    .index("by_ufc_url", ["ufcUrl"]),
});
