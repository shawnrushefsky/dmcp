import { getCharacter, listCharacters } from "./character.js";
import { getLocation } from "./world.js";
import { getItem } from "./inventory.js";
import { getFaction } from "./faction.js";
import { getDefaultImagePreset, getDefaultImagePromptTemplate, getImagePromptTemplate } from "./session.js";
import { listEntityImages } from "./images.js";
import type { ImageGeneration, ImageGenerationPreferences, ImagePromptTemplate, Character, Location, Item, Faction } from "../types/index.js";

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
    fromTemplate: boolean;
  };
  templateUsed?: string;  // Template name if used
}

// ============================================================================
// Template Processing
// ============================================================================

/**
 * Get a nested value from an object using dot notation path.
 * E.g., getNestedValue(obj, "subject.physicalTraits.gender")
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Fill a template string with values from data object.
 * Supports:
 * - {{field.path}} - simple value substitution
 * - {{field.path|"default"}} - value with default if undefined/null
 * - {{field.path|}} - value or empty string if undefined
 */
export function fillTemplate(
  template: string,
  data: Record<string, unknown>,
  defaults?: Record<string, string>,
  aliases?: Record<string, string>
): string {
  // Pattern matches: {{path}} or {{path|"default"}} or {{path|}}
  const pattern = /\{\{([^}|]+)(?:\|(?:"([^"]*)"|([^}]*)))?\}\}/g;

  return template.replace(pattern, (match, path: string, quotedDefault?: string, bareDefault?: string) => {
    const trimmedPath = path.trim();

    // Check aliases first
    const resolvedPath = aliases?.[trimmedPath] || trimmedPath;

    // Get value from data
    let value = getNestedValue(data, resolvedPath);

    // Handle arrays by joining
    if (Array.isArray(value)) {
      value = value.join(", ");
    }

    // If value exists and is not empty, return it
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }

    // Check template defaults
    if (defaults?.[trimmedPath] !== undefined) {
      return defaults[trimmedPath];
    }

    // Use inline default if provided
    if (quotedDefault !== undefined) {
      return quotedDefault;
    }
    if (bareDefault !== undefined) {
      return bareDefault.trim();
    }

    // No value, no default - return empty string
    return "";
  });
}

/**
 * Clean up a filled template by removing extra commas, spaces, etc.
 */
function cleanFilledTemplate(text: string): string {
  return text
    .replace(/,\s*,/g, ",")           // Remove double commas
    .replace(/,\s*$/g, "")            // Remove trailing comma
    .replace(/^\s*,/g, "")            // Remove leading comma
    .replace(/\s+/g, " ")             // Normalize spaces
    .replace(/\s+,/g, ",")            // Remove space before comma
    .trim();
}

/**
 * Build data context for template filling from entity and imageGen.
 */
function buildTemplateContext(
  entity: Character | Location | Item | Faction,
  entityType: "character" | "location" | "item" | "faction",
  imageGen: ImageGeneration | null,
  notes: string
): Record<string, unknown> {
  // Start with imageGen data (the primary source)
  const context: Record<string, unknown> = {
    entity: entity,
    entityType,
    name: (entity as { name: string }).name,
    notes,
    ...(imageGen || {}),
  };

  // Add convenience aliases at top level for common fields
  if (imageGen?.subject) {
    context.subject = imageGen.subject;
    if (imageGen.subject.physicalTraits) {
      context.physicalTraits = imageGen.subject.physicalTraits;
    }
    if (imageGen.subject.attire) {
      context.attire = imageGen.subject.attire;
    }
    if (imageGen.subject.environment) {
      context.environment = imageGen.subject.environment;
    }
    if (imageGen.subject.objectDetails) {
      context.objectDetails = imageGen.subject.objectDetails;
    }
  }

  if (imageGen?.style) {
    context.style = imageGen.style;
  }

  if (imageGen?.composition) {
    context.composition = imageGen.composition;
  }

  return context;
}

/**
 * Build a prompt using a template.
 */
export function buildPromptFromTemplate(
  template: ImagePromptTemplate,
  entity: Character | Location | Item | Faction,
  entityType: "character" | "location" | "item" | "faction",
  imageGen: ImageGeneration | null,
  notes: string
): { prompt: string; negativePrompt: string } {
  const context = buildTemplateContext(entity, entityType, imageGen, notes);

  // Fill the main template
  let prompt = fillTemplate(
    template.promptTemplate,
    context,
    template.defaults,
    template.fieldAliases
  );

  // Clean up the filled template
  prompt = cleanFilledTemplate(prompt);

  // Add prefix and suffix
  if (template.promptPrefix) {
    prompt = template.promptPrefix + " " + prompt;
  }
  if (template.promptSuffix) {
    prompt = prompt + ", " + template.promptSuffix;
  }

  // Build negative prompt
  let negativePrompt = "";
  if (template.negativePromptTemplate) {
    negativePrompt = fillTemplate(
      template.negativePromptTemplate,
      context,
      template.defaults,
      template.fieldAliases
    );
    negativePrompt = cleanFilledTemplate(negativePrompt);
  }

  return {
    prompt: cleanFilledTemplate(prompt),
    negativePrompt: negativePrompt || "low quality, blurry, distorted, deformed",
  };
}

/**
 * Build an image generation prompt from an entity's structured data.
 * If a template exists for the entity type, uses that. Otherwise uses default logic.
 * Combines imageGen schema, notes, and session preset to create a ready-to-use prompt.
 */
export function buildImagePrompt(
  entityId: string,
  entityType: "character" | "location" | "item" | "faction",
  sessionId?: string,
  templateId?: string
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

  // Get session ID for template/preset lookup
  const effectiveSessionId = sessionId || (entity as { sessionId?: string }).sessionId;

  // Check for a template to use
  let template: ImagePromptTemplate | null = null;
  if (effectiveSessionId) {
    if (templateId) {
      // Use specific template if provided
      template = getImagePromptTemplate(effectiveSessionId, templateId);
    } else {
      // Try to find default template for this entity type
      template = getDefaultImagePromptTemplate(effectiveSessionId, entityType);
    }
  }

  // If we have a template, use template-based building
  if (template) {
    const { prompt, negativePrompt } = buildPromptFromTemplate(
      template,
      entity,
      entityType,
      imageGen,
      notes
    );

    // Build summary
    const summaryParts: string[] = [
      `Type: ${entityType}`,
      `Name: ${entityName}`,
      `Template: ${template.name}`,
    ];

    if (imageGen?.subject?.physicalTraits?.gender) {
      summaryParts.push(`Gender: ${imageGen.subject.physicalTraits.gender}`);
    }
    if (imageGen?.subject?.physicalTraits?.age) {
      summaryParts.push(`Age: ${imageGen.subject.physicalTraits.age}`);
    }

    return {
      entityId,
      entityType,
      entityName,
      prompt,
      negativePrompt,
      summary: summaryParts.join("\n"),
      source: {
        fromImageGen: !!imageGen,
        fromNotes: !!notes && !imageGen,
        fromPreset: false,
        fromTemplate: true,
      },
      templateUsed: template.name,
    };
  }

  // No template - use default logic
  // Get session preset for style defaults
  let preset: { config: ImageGenerationPreferences } | null = null;
  if (effectiveSessionId) {
    preset = getDefaultImagePreset(effectiveSessionId);
  }

  // Build the prompt
  const promptParts: string[] = [];
  const negativeParts: string[] = [];
  const summaryParts: string[] = [];
  const source = { fromImageGen: false, fromNotes: false, fromPreset: false, fromTemplate: false };

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

    // Clean and truncate notes for use as prompt
    const cleanNotes = notes
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);

    if (cleanNotes) {
      promptParts.push(cleanNotes);
    }

    // Warn that we're using notes which may lack visual specificity
    summaryParts.push("⚠️ WARNING: Using notes/description as prompt source");
    summaryParts.push("Notes may contain biographical info rather than visual description.");
    summaryParts.push("Consider populating imageGen schema or writing a custom prompt.");
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
  const characters = listCharacters(sessionId);

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
