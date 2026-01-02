import { getCharacter } from "./character.js";
import { getLocation } from "./world.js";
import { getItem } from "./inventory.js";
import { getFaction } from "./faction.js";
import { getDefaultImagePreset } from "./session.js";
import type { ImageGeneration, ImageGenerationPreferences, Character, Location, Item, Faction } from "../types/index.js";

export interface PromptBuilderResult {
  entityId: string;
  entityType: "character" | "location" | "item" | "faction";
  entityName: string;
  prompt: string;
  negativePrompt: string;
  summary: string;  // Human-readable summary for verification
  source: {
    fromImageGen: boolean;
    fromNotes: boolean;
    fromPreset: boolean;
  };
}

/**
 * Build an image generation prompt from an entity's structured data.
 * Combines imageGen schema, notes, and session preset to create a ready-to-use prompt.
 */
export function buildImagePrompt(
  entityId: string,
  entityType: "character" | "location" | "item" | "faction",
  sessionId?: string
): PromptBuilderResult | null {
  // Get the entity
  let entity: Character | Location | Item | Faction | null = null;
  let entityName = "";
  let imageGen: ImageGeneration | null = null;
  let notes = "";

  switch (entityType) {
    case "character": {
      const char = getCharacter(entityId);
      if (!char) return null;
      entity = char;
      entityName = char.name;
      imageGen = char.imageGen || null;
      notes = char.notes || "";
      break;
    }
    case "location": {
      const loc = getLocation(entityId);
      if (!loc) return null;
      entity = loc;
      entityName = loc.name;
      imageGen = loc.imageGen || null;
      notes = loc.description || "";
      break;
    }
    case "item": {
      const item = getItem(entityId);
      if (!item) return null;
      entity = item;
      entityName = item.name;
      imageGen = item.imageGen || null;
      notes = item.properties?.description || "";
      break;
    }
    case "faction": {
      const faction = getFaction(entityId);
      if (!faction) return null;
      entity = faction;
      entityName = faction.name;
      imageGen = (faction as unknown as { imageGen?: ImageGeneration }).imageGen || null;
      notes = faction.description || "";
      break;
    }
  }

  if (!entity) return null;

  // Get session preset for style defaults
  const effectiveSessionId = sessionId || (entity as { sessionId?: string }).sessionId;
  let preset: { config: ImageGenerationPreferences } | null = null;
  if (effectiveSessionId) {
    preset = getDefaultImagePreset(effectiveSessionId);
  }

  // Build the prompt
  const promptParts: string[] = [];
  const negativeParts: string[] = [];
  const summaryParts: string[] = [];
  const source = { fromImageGen: false, fromNotes: false, fromPreset: false };

  // 1. Start with imageGen structured data if available
  if (imageGen) {
    source.fromImageGen = true;

    // Subject description
    if (imageGen.subject) {
      const subj = imageGen.subject;

      // Primary description
      if (subj.primaryDescription) {
        promptParts.push(subj.primaryDescription);
      }

      // Physical traits (for characters)
      if (subj.physicalTraits) {
        const traits = subj.physicalTraits;
        const traitParts: string[] = [];

        if (traits.gender) traitParts.push(traits.gender);
        if (traits.age) traitParts.push(traits.age);
        if (traits.bodyType) traitParts.push(traits.bodyType);
        if (traits.skinTone) traitParts.push(`${traits.skinTone} skin`);
        if (traits.hairColor && traits.hairStyle) {
          traitParts.push(`${traits.hairColor} ${traits.hairStyle} hair`);
        } else if (traits.hairColor) {
          traitParts.push(`${traits.hairColor} hair`);
        } else if (traits.hairStyle) {
          traitParts.push(`${traits.hairStyle} hair`);
        }
        if (traits.eyeColor) traitParts.push(`${traits.eyeColor} eyes`);
        if (traits.facialFeatures) traitParts.push(traits.facialFeatures);
        if (traits.distinguishingMarks?.length) {
          traitParts.push(traits.distinguishingMarks.join(", "));
        }

        if (traitParts.length > 0) {
          promptParts.push(traitParts.join(", "));
          summaryParts.push(`Physical: ${traitParts.join(", ")}`);
        }
      }

      // Attire
      if (subj.attire) {
        const attireParts: string[] = [];
        if (subj.attire.description) attireParts.push(subj.attire.description);
        if (subj.attire.colors?.length) attireParts.push(subj.attire.colors.join(" and ") + " colors");
        if (subj.attire.materials?.length) attireParts.push(subj.attire.materials.join(" and "));
        if (subj.attire.accessories?.length) attireParts.push(`wearing ${subj.attire.accessories.join(", ")}`);

        if (attireParts.length > 0) {
          promptParts.push(attireParts.join(", "));
        }
      }

      // Environment (for locations)
      if (subj.environment) {
        const envParts: string[] = [];
        if (subj.environment.setting) envParts.push(subj.environment.setting);
        if (subj.environment.timeOfDay) envParts.push(subj.environment.timeOfDay);
        if (subj.environment.weather) envParts.push(subj.environment.weather);
        if (subj.environment.lighting) envParts.push(subj.environment.lighting);
        if (subj.environment.architecture) envParts.push(subj.environment.architecture);
        if (subj.environment.notableFeatures?.length) {
          envParts.push(subj.environment.notableFeatures.join(", "));
        }

        if (envParts.length > 0) {
          promptParts.push(envParts.join(", "));
        }
      }

      // Object details (for items)
      if (subj.objectDetails) {
        const objParts: string[] = [];
        if (subj.objectDetails.material) objParts.push(subj.objectDetails.material);
        if (subj.objectDetails.size) objParts.push(subj.objectDetails.size);
        if (subj.objectDetails.condition) objParts.push(subj.objectDetails.condition);
        if (subj.objectDetails.glowOrEffects) objParts.push(subj.objectDetails.glowOrEffects);

        if (objParts.length > 0) {
          promptParts.push(objParts.join(", "));
        }
      }

      // Pose/expression (for characters)
      if (subj.pose) promptParts.push(subj.pose);
      if (subj.expression) promptParts.push(subj.expression);
      if (subj.action) promptParts.push(subj.action);
    }

    // Style
    if (imageGen.style) {
      const style = imageGen.style;
      if (style.artisticStyle) promptParts.push(style.artisticStyle);
      if (style.mood) promptParts.push(`${style.mood} mood`);
      if (style.colorScheme) promptParts.push(`${style.colorScheme} colors`);
      if (style.qualityTags?.length) promptParts.push(style.qualityTags.join(", "));
      if (style.influences?.length) promptParts.push(`in the style of ${style.influences.join(", ")}`);
      if (style.negativeElements?.length) negativeParts.push(...style.negativeElements);
    }

    // Composition
    if (imageGen.composition) {
      const comp = imageGen.composition;
      if (comp.framing) promptParts.push(comp.framing);
      if (comp.cameraAngle) promptParts.push(comp.cameraAngle);
      if (comp.background) promptParts.push(`${comp.background} background`);
      if (comp.depth) promptParts.push(comp.depth);
    }

    // Use cached prompts if available
    if (imageGen.prompts?.generic && promptParts.length === 0) {
      promptParts.push(imageGen.prompts.generic);
    }
  }

  // 2. Fall back to notes if no imageGen or very sparse
  if (promptParts.length < 3 && notes) {
    source.fromNotes = true;
    // Extract visual descriptors from notes
    const cleanNotes = notes
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500); // Limit notes length

    if (cleanNotes) {
      promptParts.push(cleanNotes);
    }
  }

  // 3. Apply preset style defaults
  if (preset?.config?.defaultStyle) {
    source.fromPreset = true;
    const style = preset.config.defaultStyle;
    if (style.artisticStyle && !promptParts.some(p => p.includes(style.artisticStyle!))) {
      promptParts.push(style.artisticStyle);
    }
    if (style.mood && !promptParts.some(p => p.includes(style.mood!))) {
      promptParts.push(`${style.mood} mood`);
    }
    if (style.qualityTags?.length) {
      const newTags = style.qualityTags.filter(t => !promptParts.some(p => p.includes(t)));
      if (newTags.length) promptParts.push(newTags.join(", "));
    }
    if (style.negativePrompts?.length) {
      negativeParts.push(...style.negativePrompts.filter(n => !negativeParts.includes(n)));
    }
  }

  // Build summary for verification
  summaryParts.unshift(`Name: ${entityName}`);
  summaryParts.unshift(`Type: ${entityType}`);
  if (imageGen?.subject?.physicalTraits?.gender) {
    summaryParts.push(`Gender: ${imageGen.subject.physicalTraits.gender}`);
  }
  if (imageGen?.subject?.physicalTraits?.age) {
    summaryParts.push(`Age: ${imageGen.subject.physicalTraits.age}`);
  }

  // Default negative prompt if none specified
  if (negativeParts.length === 0) {
    negativeParts.push("low quality", "blurry", "distorted", "deformed");
  }

  return {
    entityId,
    entityType,
    entityName,
    prompt: promptParts.join(", "),
    negativePrompt: negativeParts.join(", "),
    summary: summaryParts.join("\n"),
    source,
  };
}

/**
 * List characters with summary info for quick identification.
 */
export interface CharacterSummary {
  id: string;
  name: string;
  isPlayer: boolean;
  summary: string;  // One-line summary: "Female, 40s, merchant's wife"
  hasImageGen: boolean;
  hasImages: boolean;
}

export function listCharacterSummaries(sessionId: string): CharacterSummary[] {
  // Import here to avoid circular dependency
  const { listCharacters } = require("./character.js");
  const { listEntityImages } = require("./images.js");

  const characters = listCharacters(sessionId) as Character[];

  return characters.map(char => {
    // Build summary from imageGen or notes
    const summaryParts: string[] = [];

    if (char.imageGen?.subject?.physicalTraits) {
      const traits = char.imageGen.subject.physicalTraits;
      if (traits.gender) summaryParts.push(traits.gender);
      if (traits.age) summaryParts.push(traits.age);
      if (traits.bodyType) summaryParts.push(traits.bodyType);
    }

    // Extract role/occupation from notes if available
    if (char.notes) {
      // Look for common role patterns
      const roleMatch = char.notes.match(/(?:is a|works as|serves as|the) ([a-z]+ ?[a-z]*)/i);
      if (roleMatch && roleMatch[1]) {
        summaryParts.push(roleMatch[1].trim());
      }
    }

    // Check if has images
    const images = listEntityImages(char.id, "character");

    return {
      id: char.id,
      name: char.name,
      isPlayer: char.isPlayer,
      summary: summaryParts.length > 0 ? summaryParts.join(", ") : char.isPlayer ? "Player Character" : "NPC",
      hasImageGen: !!char.imageGen,
      hasImages: images.images.length > 0,
    };
  });
}
