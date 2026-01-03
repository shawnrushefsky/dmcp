<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { GameState, ImagePresetsResponse, Breadcrumb } from '../types'
import GameTabs from '../components/GameTabs.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getGame, getImageGenerationPresets, loading } = useApi()
const state = ref<GameState | null>(null)
const presetsData = ref<ImagePresetsResponse>({ presets: [], defaultPresetId: null })
const expandedPresets = ref<Set<string>>(new Set())

const gameId = computed(() => route.params.gameId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => [
  { label: 'Games', href: '/' },
  { label: state.value?.game.name || 'Loading...', href: `/games/${gameId.value}` },
  { label: 'Settings' },
])

const toolLabels: Record<string, string> = {
  dalle: 'DALL-E',
  sdxl: 'Stable Diffusion XL',
  midjourney: 'Midjourney',
  comfyui: 'ComfyUI',
  flux: 'Flux',
  other: 'Other',
}

const entityTypeLabels: Record<string, string> = {
  character: 'Characters',
  location: 'Locations',
  item: 'Items',
  scene: 'Scenes',
}

function togglePreset(presetId: string) {
  if (expandedPresets.value.has(presetId)) {
    expandedPresets.value.delete(presetId)
  } else {
    expandedPresets.value.add(presetId)
  }
}

function isExpanded(presetId: string): boolean {
  return expandedPresets.value.has(presetId)
}

onMounted(async () => {
  const [gameResult, presetsResult] = await Promise.all([
    getGame(gameId.value),
    getImageGenerationPresets(gameId.value),
  ])
  state.value = gameResult
  presetsData.value = presetsResult
})
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="settings-loading">
    <SkeletonLoader variant="text" width="200px" />
    <SkeletonLoader variant="title" width="250px" />
    <div class="tabs-skeleton">
      <SkeletonLoader variant="button" v-for="i in 5" :key="i" width="80px" />
    </div>
    <SkeletonLoader variant="card" class="mt-4" />
    <SkeletonLoader variant="card" class="mt-4" />
  </div>

  <!-- Content -->
  <div v-else-if="state" class="animate-fade-in">
    <Breadcrumbs :items="breadcrumbs" />
    <h2>Settings</h2>

    <GameTabs :game-id="gameId" active="settings" :counts="state.counts" />

    <!-- Image Generation Presets -->
    <section class="settings-section">
      <h3>Image Generation Presets</h3>
      <p class="section-description">
        Different presets for different use cases - character portraits, location art, items with text, etc.
      </p>

      <template v-if="presetsData.presets.length > 0">
        <div class="presets-list">
          <div
            v-for="preset in presetsData.presets"
            :key="preset.id"
            class="preset-card"
            :class="{ 'is-default': preset.id === presetsData.defaultPresetId }"
          >
            <!-- Preset Header -->
            <div class="preset-header" @click="togglePreset(preset.id)">
              <div class="preset-info">
                <span class="preset-name">{{ preset.name }}</span>
                <span v-if="preset.id === presetsData.defaultPresetId" class="preset-badge">Default</span>
                <span v-if="preset.config.defaultTool" class="preset-tool">
                  {{ toolLabels[preset.config.defaultTool] || preset.config.defaultTool }}
                </span>
              </div>
              <div class="preset-meta">
                <span v-if="preset.entityTypes?.length" class="entity-types">
                  {{ preset.entityTypes.map(t => entityTypeLabels[t]).join(', ') }}
                </span>
                <span class="expand-icon">{{ isExpanded(preset.id) ? '▼' : '▶' }}</span>
              </div>
            </div>

            <p v-if="preset.description" class="preset-description">{{ preset.description }}</p>

            <!-- Expanded Content -->
            <div v-if="isExpanded(preset.id)" class="preset-details">
              <!-- Config Content -->
              <template v-if="preset.config">
                <!-- Default Style -->
                <div v-if="preset.config.defaultStyle" class="config-section">
                  <h5>Default Style</h5>
                  <div class="settings-grid">
                    <div v-if="preset.config.defaultStyle.artisticStyle" class="stat">
                      <span class="stat-label">Artistic Style</span>
                      <span>{{ preset.config.defaultStyle.artisticStyle }}</span>
                    </div>
                    <div v-if="preset.config.defaultStyle.mood" class="stat">
                      <span class="stat-label">Mood</span>
                      <span>{{ preset.config.defaultStyle.mood }}</span>
                    </div>
                    <div v-if="preset.config.defaultStyle.colorScheme" class="stat">
                      <span class="stat-label">Color Scheme</span>
                      <span>{{ preset.config.defaultStyle.colorScheme }}</span>
                    </div>
                  </div>
                  <div v-if="preset.config.defaultStyle.qualityTags?.length" class="mt-20">
                    <strong>Quality Tags:</strong>
                    <span v-for="tag in preset.config.defaultStyle.qualityTags" :key="tag" class="tag">{{ tag }}</span>
                  </div>
                  <div v-if="preset.config.defaultStyle.influences?.length" class="mt-20">
                    <strong>Influences:</strong>
                    <span v-for="inf in preset.config.defaultStyle.influences" :key="inf" class="tag">{{ inf }}</span>
                  </div>
                  <div v-if="preset.config.defaultStyle.negativePrompts?.length" class="mt-20">
                    <strong>Negative Prompts:</strong>
                    <span v-for="neg in preset.config.defaultStyle.negativePrompts" :key="neg" class="tag tag-danger">{{ neg }}</span>
                  </div>
                </div>

                <!-- ComfyUI Settings -->
                <div v-if="preset.config.comfyui" class="config-section">
                  <h5>ComfyUI Configuration</h5>
                  <div class="settings-grid">
                    <div v-if="preset.config.comfyui.endpoint" class="stat">
                      <span class="stat-label">Endpoint</span>
                      <span class="mono">{{ preset.config.comfyui.endpoint }}</span>
                    </div>
                    <div v-if="preset.config.comfyui.checkpoint" class="stat">
                      <span class="stat-label">Checkpoint</span>
                      <span>{{ preset.config.comfyui.checkpoint }}</span>
                    </div>
                    <div v-if="preset.config.comfyui.defaultWorkflow" class="stat">
                      <span class="stat-label">Workflow</span>
                      <span>{{ preset.config.comfyui.defaultWorkflow }}</span>
                    </div>
                  </div>
                  <div v-if="preset.config.comfyui.loras?.length" class="mt-20">
                    <strong>LoRAs:</strong>
                    <div v-for="lora in preset.config.comfyui.loras" :key="lora.name" class="stat">
                      <span class="stat-label">{{ lora.name }}</span>
                      <span>Weight: {{ lora.weight }}</span>
                    </div>
                  </div>
                  <div v-if="preset.config.comfyui.samplerSettings" class="mt-20">
                    <strong>Sampler Settings:</strong>
                    <div class="settings-grid">
                      <div v-if="preset.config.comfyui.samplerSettings.sampler" class="stat">
                        <span class="stat-label">Sampler</span>
                        <span>{{ preset.config.comfyui.samplerSettings.sampler }}</span>
                      </div>
                      <div v-if="preset.config.comfyui.samplerSettings.scheduler" class="stat">
                        <span class="stat-label">Scheduler</span>
                        <span>{{ preset.config.comfyui.samplerSettings.scheduler }}</span>
                      </div>
                      <div v-if="preset.config.comfyui.samplerSettings.steps" class="stat">
                        <span class="stat-label">Steps</span>
                        <span>{{ preset.config.comfyui.samplerSettings.steps }}</span>
                      </div>
                      <div v-if="preset.config.comfyui.samplerSettings.cfg" class="stat">
                        <span class="stat-label">CFG</span>
                        <span>{{ preset.config.comfyui.samplerSettings.cfg }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Workflow Templates -->
                  <div v-if="preset.config.comfyui.workflows && Object.keys(preset.config.comfyui.workflows).length > 0" class="mt-20">
                    <strong>Workflow Templates:</strong>
                    <div class="workflow-list">
                      <div
                        v-for="(workflow, id) in preset.config.comfyui.workflows"
                        :key="id"
                        class="workflow-card"
                        :class="{ 'is-default': preset.config.comfyui.defaultWorkflowId === id }"
                      >
                        <div class="workflow-header">
                          <span class="workflow-name">{{ workflow.name }}</span>
                          <span v-if="preset.config.comfyui.defaultWorkflowId === id" class="workflow-badge">Default</span>
                        </div>
                        <p v-if="workflow.description" class="workflow-description">{{ workflow.description }}</p>
                        <div v-if="workflow.inputNodes" class="workflow-nodes">
                          <span class="stat-label">Input Nodes:</span>
                          <div class="node-tags">
                            <span v-if="workflow.inputNodes.positivePrompt" class="node-tag">Positive: {{ workflow.inputNodes.positivePrompt }}</span>
                            <span v-if="workflow.inputNodes.negativePrompt" class="node-tag">Negative: {{ workflow.inputNodes.negativePrompt }}</span>
                            <span v-if="workflow.inputNodes.checkpoint" class="node-tag">Checkpoint: {{ workflow.inputNodes.checkpoint }}</span>
                            <span v-if="workflow.inputNodes.seed" class="node-tag">Seed: {{ workflow.inputNodes.seed }}</span>
                            <span v-if="workflow.inputNodes.steps" class="node-tag">Steps: {{ workflow.inputNodes.steps }}</span>
                            <span v-if="workflow.inputNodes.cfg" class="node-tag">CFG: {{ workflow.inputNodes.cfg }}</span>
                          </div>
                        </div>
                        <details class="workflow-json">
                          <summary>View Workflow JSON</summary>
                          <pre class="mono text-sm">{{ JSON.stringify(workflow.workflow, null, 2) }}</pre>
                        </details>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- DALL-E Settings -->
                <div v-if="preset.config.dalle" class="config-section">
                  <h5>DALL-E Configuration</h5>
                  <div class="settings-grid">
                    <div v-if="preset.config.dalle.model" class="stat">
                      <span class="stat-label">Model</span>
                      <span>{{ preset.config.dalle.model }}</span>
                    </div>
                    <div v-if="preset.config.dalle.quality" class="stat">
                      <span class="stat-label">Quality</span>
                      <span>{{ preset.config.dalle.quality }}</span>
                    </div>
                    <div v-if="preset.config.dalle.style" class="stat">
                      <span class="stat-label">Style</span>
                      <span>{{ preset.config.dalle.style }}</span>
                    </div>
                    <div v-if="preset.config.dalle.size" class="stat">
                      <span class="stat-label">Size</span>
                      <span>{{ preset.config.dalle.size }}</span>
                    </div>
                  </div>
                </div>

                <!-- Midjourney Settings -->
                <div v-if="preset.config.midjourney" class="config-section">
                  <h5>Midjourney Configuration</h5>
                  <div class="settings-grid">
                    <div v-if="preset.config.midjourney.version" class="stat">
                      <span class="stat-label">Version</span>
                      <span>{{ preset.config.midjourney.version }}</span>
                    </div>
                    <div v-if="preset.config.midjourney.stylize !== undefined" class="stat">
                      <span class="stat-label">Stylize</span>
                      <span>{{ preset.config.midjourney.stylize }}</span>
                    </div>
                    <div v-if="preset.config.midjourney.chaos !== undefined" class="stat">
                      <span class="stat-label">Chaos</span>
                      <span>{{ preset.config.midjourney.chaos }}</span>
                    </div>
                    <div v-if="preset.config.midjourney.quality !== undefined" class="stat">
                      <span class="stat-label">Quality</span>
                      <span>{{ preset.config.midjourney.quality }}</span>
                    </div>
                    <div v-if="preset.config.midjourney.aspectRatio" class="stat">
                      <span class="stat-label">Aspect Ratio</span>
                      <span>{{ preset.config.midjourney.aspectRatio }}</span>
                    </div>
                  </div>
                </div>

                <!-- SDXL Settings -->
                <div v-if="preset.config.sdxl" class="config-section">
                  <h5>Stable Diffusion XL Configuration</h5>
                  <div class="settings-grid">
                    <div v-if="preset.config.sdxl.model" class="stat">
                      <span class="stat-label">Model</span>
                      <span>{{ preset.config.sdxl.model }}</span>
                    </div>
                    <div v-if="preset.config.sdxl.samplerName" class="stat">
                      <span class="stat-label">Sampler</span>
                      <span>{{ preset.config.sdxl.samplerName }}</span>
                    </div>
                    <div v-if="preset.config.sdxl.steps" class="stat">
                      <span class="stat-label">Steps</span>
                      <span>{{ preset.config.sdxl.steps }}</span>
                    </div>
                    <div v-if="preset.config.sdxl.cfg" class="stat">
                      <span class="stat-label">CFG</span>
                      <span>{{ preset.config.sdxl.cfg }}</span>
                    </div>
                    <div v-if="preset.config.sdxl.width && preset.config.sdxl.height" class="stat">
                      <span class="stat-label">Size</span>
                      <span>{{ preset.config.sdxl.width }} x {{ preset.config.sdxl.height }}</span>
                    </div>
                  </div>
                  <div v-if="preset.config.sdxl.negativePrompt" class="mt-20">
                    <strong>Negative Prompt:</strong>
                    <p class="mono text-sm">{{ preset.config.sdxl.negativePrompt }}</p>
                  </div>
                </div>

                <!-- Flux Settings -->
                <div v-if="preset.config.flux" class="config-section">
                  <h5>Flux Configuration</h5>
                  <div class="settings-grid">
                    <div v-if="preset.config.flux.model" class="stat">
                      <span class="stat-label">Model</span>
                      <span>{{ preset.config.flux.model }}</span>
                    </div>
                    <div v-if="preset.config.flux.steps" class="stat">
                      <span class="stat-label">Steps</span>
                      <span>{{ preset.config.flux.steps }}</span>
                    </div>
                    <div v-if="preset.config.flux.guidance" class="stat">
                      <span class="stat-label">Guidance</span>
                      <span>{{ preset.config.flux.guidance }}</span>
                    </div>
                  </div>
                </div>

                <!-- Generation Defaults -->
                <div v-if="preset.config.defaults" class="config-section">
                  <h5>Generation Defaults</h5>
                  <div class="settings-grid">
                    <div v-if="preset.config.defaults.aspectRatio" class="stat">
                      <span class="stat-label">Aspect Ratio</span>
                      <span>{{ preset.config.defaults.aspectRatio }}</span>
                    </div>
                    <div v-if="preset.config.defaults.generateOnCreate !== undefined" class="stat">
                      <span class="stat-label">Auto-Generate</span>
                      <span>{{ preset.config.defaults.generateOnCreate ? 'Yes' : 'No' }}</span>
                    </div>
                    <div v-if="preset.config.defaults.savePrompts !== undefined" class="stat">
                      <span class="stat-label">Save Prompts</span>
                      <span>{{ preset.config.defaults.savePrompts ? 'Yes' : 'No' }}</span>
                    </div>
                  </div>
                  <div v-if="preset.config.defaults.framing" class="mt-20">
                    <strong>Default Framing:</strong>
                    <div class="settings-grid">
                      <div v-if="preset.config.defaults.framing.character" class="stat">
                        <span class="stat-label">Character</span>
                        <span>{{ preset.config.defaults.framing.character }}</span>
                      </div>
                      <div v-if="preset.config.defaults.framing.location" class="stat">
                        <span class="stat-label">Location</span>
                        <span>{{ preset.config.defaults.framing.location }}</span>
                      </div>
                      <div v-if="preset.config.defaults.framing.item" class="stat">
                        <span class="stat-label">Item</span>
                        <span>{{ preset.config.defaults.framing.item }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Consistency Settings -->
                <div v-if="preset.config.consistency" class="config-section">
                  <h5>Consistency Settings</h5>
                  <div class="settings-grid">
                    <div v-if="preset.config.consistency.maintainColorPalette !== undefined" class="stat">
                      <span class="stat-label">Maintain Color Palette</span>
                      <span>{{ preset.config.consistency.maintainColorPalette ? 'Yes' : 'No' }}</span>
                    </div>
                    <div v-if="preset.config.consistency.useCharacterRefs !== undefined" class="stat">
                      <span class="stat-label">Use Character Refs</span>
                      <span>{{ preset.config.consistency.useCharacterRefs ? 'Yes' : 'No' }}</span>
                    </div>
                    <div v-if="preset.config.consistency.styleReferenceImage" class="stat">
                      <span class="stat-label">Style Reference</span>
                      <span>{{ preset.config.consistency.styleReferenceImage }}</span>
                    </div>
                  </div>
                </div>

                <!-- Notes -->
                <div v-if="preset.config.notes" class="config-section">
                  <h5>Notes</h5>
                  <p>{{ preset.config.notes }}</p>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>

      <!-- No Presets Configured -->
      <div v-else class="empty-card">
        <div class="empty-icon">🎨</div>
        <div class="empty-title">No Image Generation Presets</div>
        <div class="empty-description">
          Image generation presets haven't been configured for this game yet.
          The DM agent can create presets using the <code>create_image_generation_preset</code> tool.
        </div>
      </div>
    </section>
  </div>
  <p v-else class="empty">Game not found.</p>
</template>

<style scoped>
.tabs-skeleton {
  display: flex;
  gap: var(--space-2);
  margin: var(--space-4) 0;
}

.settings-section {
  margin-top: var(--space-6);
}

.settings-section h3 {
  margin-bottom: var(--space-2);
}

.section-description {
  color: var(--text-muted);
  margin-bottom: var(--space-4);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-2);
}

/* Presets List */
.presets-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.preset-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
}

.preset-card.is-default {
  border-color: var(--accent);
}

.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.preset-header:hover {
  background: var(--bg-elevated);
}

.preset-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.preset-name {
  font-weight: 600;
  font-size: var(--text-base);
}

.preset-badge {
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--accent);
  color: white;
}

.preset-tool {
  font-size: var(--text-sm);
  color: var(--text-muted);
  padding: 2px 8px;
  background: var(--bg-elevated);
  border-radius: 4px;
}

.preset-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.entity-types {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.expand-icon {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.preset-description {
  color: var(--text-muted);
  font-size: var(--text-sm);
  padding: 0 var(--space-4) var(--space-3);
  margin: 0;
}

.preset-details {
  padding: var(--space-4);
  border-top: 1px solid var(--border-color);
  background: var(--bg-elevated);
}

.config-section {
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-color);
}

.config-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.config-section h5 {
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.empty-card {
  text-align: center;
  padding: var(--space-8);
  background: var(--bg-secondary);
  border-radius: var(--border-radius);
  border: 1px dashed var(--border-color);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: var(--space-4);
}

.empty-title {
  font-size: var(--text-lg);
  font-weight: 600;
  margin-bottom: var(--space-2);
}

.empty-description {
  color: var(--text-muted);
  max-width: 400px;
  margin: 0 auto;
}

.empty-description code {
  background: var(--bg-elevated);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: var(--text-sm);
}

.mono {
  font-family: var(--font-mono);
}

.tag-danger {
  background: var(--danger-color);
  color: white;
}

/* Workflow Templates */
.workflow-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.workflow-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--space-3);
}

.workflow-card.is-default {
  border-color: var(--accent);
}

.workflow-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.workflow-name {
  font-weight: 600;
  font-size: var(--text-base);
}

.workflow-badge {
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--accent);
  color: white;
}

.workflow-description {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: var(--space-2) 0;
}

.workflow-nodes {
  margin-top: var(--space-2);
}

.node-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-1);
}

.node-tag {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  padding: 2px 6px;
  background: var(--bg-elevated);
  border-radius: 4px;
  color: var(--text-muted);
}

.workflow-json {
  margin-top: var(--space-3);
}

.workflow-json summary {
  cursor: pointer;
  color: var(--accent);
  font-size: var(--text-sm);
}

.workflow-json summary:hover {
  color: var(--accent-hover);
}

.workflow-json pre {
  margin-top: var(--space-2);
  padding: var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--border-radius);
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}
</style>
