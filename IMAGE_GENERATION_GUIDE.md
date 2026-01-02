# DMCP Image Generation Guide

This guide documents the process for generating and verifying images for game entities using DMCP and ComfyUI.

## 1. Identifying Visual Style Preferences

Before generating images, check the game session's image generation preferences:

```
mcp__dmcp__get_default_image_preset(sessionId)
```

This returns the configured style including:
- **artisticStyle**: e.g., "detailed graphic novel illustration, ink and color, comic book art"
- **mood**: e.g., "moody, atmospheric, dramatic"
- **colorScheme**: e.g., "rich saturated colors with deep shadows, jewel tones against dark backgrounds"
- **qualityTags**: e.g., ["highly detailed", "ink linework", "bold outlines", "dramatic shadows"]
- **influences**: e.g., ["Mike Mignola", "Blacksad", "Sin City color editions"]
- **negativePrompts**: things to avoid

The preset also contains the ComfyUI workflow configuration including:
- Model checkpoint to use (e.g., `flux1-schnell-fp8.safetensors`)
- Steps, CFG, sampler, scheduler settings
- Default dimensions

## 2. Crafting Prompts

### Prompt Structure
Combine entity-specific details with style tags from preferences:

```
[Entity description] + [Style tags from preferences]
```

### Example Prompts by Entity Type

**Character Portrait:**
```
Portrait of a [age] [gender] [role], [physical traits], [clothing], [expression],
[background context]. Detailed graphic novel illustration, ink and color, comic book art,
bold outlines, dramatic shadows, cinematic lighting, rich saturated colors, moody atmospheric,
Mike Mignola Blacksad style
```

**Location:**
```
[Location type] [key features], [atmosphere description], [architectural details].
Detailed graphic novel illustration, ink and color, comic book art, bold outlines,
dramatic shadows, cinematic lighting, rich saturated colors, moody atmospheric,
Mike Mignola Blacksad style
```

**Item:**
```
[Item type], [material], [distinctive features], [condition], [background/display context].
Detailed graphic novel illustration, ink and color, comic book art, bold outlines,
dramatic shadows, rich saturated colors, moody atmospheric, Mike Mignola Blacksad style
```

## 3. Aspect Ratios by Entity Type

- **Characters (portraits)**: 768x1024 (3:4 portrait)
- **Locations (landscapes)**: 1024x768 (4:3 landscape)
- **Items (objects)**: 768x768 (1:1 square)
- **Factions (emblems/banners)**: 768x768 (1:1 square)

## 4. Running the ComfyUI Workflow

Use `mcp__comfyui__run_workflow` with the workflow from the preset, modifying:
- Node "6" text input for the prompt
- Node "27" width/height for aspect ratio
- Node "31" seed (must be >= 0, use random positive integer)

Example:
```json
{
  "6": {"inputs": {"clip": ["30", 1], "text": "YOUR PROMPT HERE"}, "class_type": "CLIPTextEncode"},
  "27": {"inputs": {"width": 768, "height": 1024, "batch_size": 1}, "class_type": "EmptySD3LatentImage"},
  "31": {"inputs": {"cfg": 1, "seed": 12345, "model": ["30", 0], "steps": 4, ...}, "class_type": "KSampler"},
  ...
}
```

Set `sync: true` to wait for completion and see the image inline.

## 5. Visually Verifying Generated Images

### CRITICAL: How to Actually See Images

When MCP tools return base64 image data in JSON responses, **you do not visually see the image**. The base64 string is just text data.

**To actually view an image for visual verification:**

1. **Download the image to a temp file:**
   ```bash
   curl -s "http://localhost:3456/images/{imageId}/file" -o /tmp/filename.png
   ```

2. **Use the Read tool on the file:**
   ```
   Read(file_path="/tmp/filename.png")
   ```

   This renders the image visually, allowing actual visual analysis.

### Verification Checklist

Compare the generated image against the entity description:

**For Characters:**
- [ ] Correct apparent age
- [ ] Correct gender
- [ ] Key physical traits present (hair color, build, distinguishing marks)
- [ ] Appropriate clothing/attire
- [ ] Correct expression/demeanor
- [ ] Appropriate background context

**For Locations:**
- [ ] Key architectural features present
- [ ] Correct atmosphere/mood
- [ ] Appropriate lighting
- [ ] Notable features visible

**For Items:**
- [ ] Correct item type
- [ ] Right materials shown
- [ ] Distinctive features visible
- [ ] Appropriate scale/presentation

## 6. Storing Images

After verification, store the image:

```
mcp__dmcp__store_image({
  sessionId: "...",
  entityId: "...",
  entityType: "character" | "location" | "item" | "faction",
  url: "http://host.docker.internal:8000/view?filename=ComfyUI_MCP_Flux_XXXXX_.png",
  label: "Portrait" | "Interior" | "Exterior" | etc.,
  description: "Brief description of what the image shows",
  setAsPrimary: true,
  generationTool: "flux-schnell",
  generationPrompt: "The prompt used (optional)"
})
```

To get the filename, use:
```
mcp__comfyui__get_history(promptId)
```

## 7. Handling Mismatches

If an image doesn't match the entity description:

1. **Delete the mismatched image:**
   ```
   mcp__dmcp__delete_image(imageId)
   ```

2. **Regenerate with adjusted prompt** - try:
   - Different seed
   - More specific descriptors
   - Adjusted style emphasis

3. **Re-verify** using the curl + Read method

## 8. Batch Generation Workflow

For generating images for multiple entities:

1. **Get entities missing images:**
   ```
   mcp__dmcp__list_entities_missing_images(sessionId, entityType)
   ```

2. **Get entity details** to craft accurate prompts

3. **Generate images** one at a time with `sync: true`

4. **Verify each image** visually before storing

5. **Store verified images** immediately

## 9. Image Prompt Templates

For consistent style across a session, create prompt templates:

```
mcp__dmcp__create_image_prompt_template({
  sessionId: "...",
  name: "Character Portrait",
  entityType: "character",
  promptTemplate: "Portrait of {{name}}, {{notes}}. {{style.artisticStyle}}, {{style.mood}}...",
  promptSuffix: "highly detailed, masterwork",
  isDefault: true
})
```

Use `{{field.path}}` placeholders that get filled from entity data.

## 10. Common Issues

### Wrong Art Style
- Ensure style tags from preset are included in every prompt
- Check that influences (e.g., "Mike Mignola Blacksad style") are appended

### Inconsistent Style Across Images
- Use the same style suffix for all prompts
- Keep seed ranges similar for related entities

### Model/Workflow Errors
- Verify checkpoint exists: `mcp__comfyui__list_models()`
- Check workflow uses correct loader (CheckpointLoaderSimple vs UNETLoader)
- Ensure seed is >= 0 (not -1)

### Queue Blocked
- Cancel stuck jobs: `mcp__comfyui__cancel_job()`
- Check queue status: `mcp__comfyui__get_queue()`
