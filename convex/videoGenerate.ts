/**
 * videoGenerate.ts — fal.ai video generation actions.
 *
 * Flow per fighter:
 *   1. generateVideo — calls fal.subscribe() which handles queue submission,
 *                      internal polling, and result retrieval in one blocking call.
 *                      Downloads the MP4 and stores it in Convex File Storage.
 *                      Sets fighter.videoUrl reactively when done.
 */

import { action } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'
import { fal } from '@fal-ai/client'

// Kling 2.5 Turbo Pro — best quality/speed ratio for 5-second clips
const FAL_MODEL = 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video'

// Fighter performs a move then returns to original pose — gives a cinematic
// "intro" feel while keeping the final freeze frame match the source image
const POSITIVE_PROMPT =
  'Cinematic UFC fighter intro. Dark dramatic background with subtle volumetric lighting. ' +
  'Fighter starts in their original pose, performs a brief powerful movement — a strike, ' +
  'aggressive step forward, or intimidating gesture — then settles back into their original ' +
  'stance and freezes. Slow dramatic camera push-in throughout. High contrast. ' +
  'Broadcast quality. No text overlays.'

const NEGATIVE_PROMPT =
  'blurry, cartoon, animated, text, watermark, logo, distorted face, extra limbs, ' +
  'crowd, octagon visible, low quality, shaky camera'

function configureFal() {
  const apiKey = process.env.FAL_API_KEY
  if (!apiKey) throw new Error('FAL_API_KEY not set')
  fal.config({ credentials: apiKey })
}

// ── Submit a video generation request for a single fighter ───────────────────
export const generateVideo = action({
  args: { fighterId: v.id('fighters') },
  handler: async (ctx, { fighterId }): Promise<void> => {
    configureFal()

    const fighter = await ctx.runQuery(api.fighters.getFighter, { fighterId })
    if (!fighter) throw new Error(`Fighter ${fighterId} not found`)
    if (!fighter.photoUrl) throw new Error(`Fighter ${fighter.name} has no photo`)

    // fal.subscribe handles queue submission + internal polling + result retrieval
    const result = await fal.subscribe(FAL_MODEL, {
      input: {
        image_url: fighter.photoUrl,
        prompt: POSITIVE_PROMPT,
        negative_prompt: NEGATIVE_PROMPT,
        duration: '5',
        cfg_scale: 0.5,
      },
      pollInterval: 5000,
      onQueueUpdate: (update) =>
        console.log(`${fighter.name}: ${update.status}`),
    })

    const tempVideoUrl = result.data.video.url

    // Download MP4 from fal CDN and persist in Convex File Storage
    const res = await fetch(tempVideoUrl)
    if (!res.ok) throw new Error(`Video download failed: ${res.status}`)
    const blob = await res.blob()
    const storageId = await ctx.storage.store(blob)
    const permanentUrl = (await ctx.storage.getUrl(storageId)) ?? ''

    await ctx.runMutation(api.fighters.setVideoUrl, {
      fighterId,
      videoUrl: permanentUrl,
    })
  },
})
