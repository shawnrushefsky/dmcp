import { z } from "zod";

// Reusable Zod schemas for image generation
export const subjectDescriptionSchema = z.object({
  type: z.enum(["character", "location", "item", "scene"]),
  primaryDescription: z.string(),
  physicalTraits: z.object({
    age: z.string().optional(),
    gender: z.string().optional(),
    bodyType: z.string().optional(),
    height: z.string().optional(),
    skinTone: z.string().optional(),
    hairColor: z.string().optional(),
    hairStyle: z.string().optional(),
    eyeColor: z.string().optional(),
    facialFeatures: z.string().optional(),
    distinguishingMarks: z.array(z.string()).optional(),
  }).optional(),
  attire: z.object({
    description: z.string(),
    colors: z.array(z.string()).optional(),
    materials: z.array(z.string()).optional(),
    accessories: z.array(z.string()).optional(),
  }).optional(),
  environment: z.object({
    setting: z.string(),
    timeOfDay: z.string().optional(),
    weather: z.string().optional(),
    lighting: z.string().optional(),
    architecture: z.string().optional(),
    vegetation: z.string().optional(),
    notableFeatures: z.array(z.string()).optional(),
  }).optional(),
  objectDetails: z.object({
    material: z.string().optional(),
    size: z.string().optional(),
    condition: z.string().optional(),
    glowOrEffects: z.string().optional(),
  }).optional(),
  pose: z.string().optional(),
  expression: z.string().optional(),
  action: z.string().optional(),
});

export const styleDescriptionSchema = z.object({
  artisticStyle: z.string(),
  genre: z.string(),
  mood: z.string(),
  colorScheme: z.string().optional(),
  influences: z.array(z.string()).optional(),
  qualityTags: z.array(z.string()).optional(),
  negativeElements: z.array(z.string()).optional(),
});

export const compositionDescriptionSchema = z.object({
  framing: z.string(),
  cameraAngle: z.string().optional(),
  aspectRatio: z.string().optional(),
  focusPoint: z.string().optional(),
  background: z.string().optional(),
  depth: z.string().optional(),
});

export const comfyUIPromptSchema = z.object({
  positive: z.string(),
  negative: z.string(),
  checkpoint: z.string().optional(),
  loras: z.array(z.object({
    name: z.string(),
    weight: z.number(),
  })).optional(),
  samplerSettings: z.object({
    sampler: z.string().optional(),
    scheduler: z.string().optional(),
    steps: z.number().optional(),
    cfg: z.number().optional(),
  }).optional(),
});

export const generatedImageSchema = z.object({
  id: z.string(),
  tool: z.string(),
  prompt: z.string(),
  url: z.string().optional(),
  base64: z.string().optional(),
  seed: z.number().optional(),
  timestamp: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const imageGenSchema = z.object({
  subject: subjectDescriptionSchema,
  style: styleDescriptionSchema,
  composition: compositionDescriptionSchema,
  prompts: z.object({
    generic: z.string().optional(),
    sdxl: z.string().optional(),
    dalle: z.string().optional(),
    midjourney: z.string().optional(),
    flux: z.string().optional(),
    comfyui: comfyUIPromptSchema.optional(),
  }).optional(),
  generations: z.array(generatedImageSchema).optional(),
  consistency: z.object({
    characterRef: z.string().optional(),
    seedImage: z.string().optional(),
    colorPalette: z.array(z.string()).optional(),
    styleRef: z.string().optional(),
  }).optional(),
}).describe("Image generation metadata for visual representation");

// Voice schema for characters
export const voiceSchema = z.object({
  pitch: z.enum(["very_low", "low", "medium", "high", "very_high"]).describe("Voice pitch"),
  speed: z.enum(["very_slow", "slow", "medium", "fast", "very_fast"]).describe("Speaking speed"),
  tone: z.string().describe("Voice tone (e.g., 'gravelly', 'melodic', 'nasal', 'breathy')"),
  accent: z.string().optional().describe("Accent (e.g., 'Scottish', 'French', 'Brooklyn')"),
  quirks: z.array(z.string()).optional().describe("Speech quirks (e.g., 'stutters when nervous')"),
  description: z.string().optional().describe("Free-form voice description for more nuance"),
});

// Random table entry schema
export const tableEntrySchema = z.object({
  minRoll: z.number().optional().describe("Minimum roll to get this result (for ranged tables)"),
  maxRoll: z.number().optional().describe("Maximum roll for this result"),
  weight: z.number().optional().describe("Weight for weighted random selection"),
  result: z.string().describe("The result text"),
  effects: z.record(z.unknown()).optional().describe("Optional structured effects"),
});
