<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { SessionState, ImageGenerationPreferences, Breadcrumb } from '../types'
import SessionTabs from '../components/SessionTabs.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const { getSession, getImageGenerationPreferences, loading } = useApi()
const state = ref<SessionState | null>(null)
const imagePrefs = ref<ImageGenerationPreferences | null>(null)

const sessionId = computed(() => route.params.sessionId as string)

const breadcrumbs = computed<Breadcrumb[]>(() => [
  { label: 'Games', href: '/' },
  { label: state.value?.session.name || 'Session', href: `/sessions/${sessionId.value}` },
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

onMounted(async () => {
  const [sessionResult, prefsResult] = await Promise.all([
    getSession(sessionId.value),
    getImageGenerationPreferences(sessionId.value),
  ])
  state.value = sessionResult
  imagePrefs.value = prefsResult
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

    <SessionTabs :session-id="sessionId" active="settings" :counts="state.counts" />

    <!-- Image Generation Preferences -->
    <section class="settings-section">
      <h3>Image Generation</h3>

      <template v-if="imagePrefs">
        <!-- Default Tool -->
        <div v-if="imagePrefs.defaultTool" class="card">
          <h4>Default Tool</h4>
          <div class="setting-value">{{ toolLabels[imagePrefs.defaultTool] || imagePrefs.defaultTool }}</div>
        </div>

        <!-- Default Style -->
        <div v-if="imagePrefs.defaultStyle" class="card">
          <h4>Default Style</h4>
          <div class="settings-grid">
            <div v-if="imagePrefs.defaultStyle.artisticStyle" class="stat">
              <span class="stat-label">Artistic Style</span>
              <span>{{ imagePrefs.defaultStyle.artisticStyle }}</span>
            </div>
            <div v-if="imagePrefs.defaultStyle.mood" class="stat">
              <span class="stat-label">Mood</span>
              <span>{{ imagePrefs.defaultStyle.mood }}</span>
            </div>
            <div v-if="imagePrefs.defaultStyle.colorScheme" class="stat">
              <span class="stat-label">Color Scheme</span>
              <span>{{ imagePrefs.defaultStyle.colorScheme }}</span>
            </div>
          </div>
          <div v-if="imagePrefs.defaultStyle.qualityTags?.length" class="mt-20">
            <strong>Quality Tags:</strong>
            <span v-for="tag in imagePrefs.defaultStyle.qualityTags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <div v-if="imagePrefs.defaultStyle.influences?.length" class="mt-20">
            <strong>Influences:</strong>
            <span v-for="inf in imagePrefs.defaultStyle.influences" :key="inf" class="tag">{{ inf }}</span>
          </div>
          <div v-if="imagePrefs.defaultStyle.negativePrompts?.length" class="mt-20">
            <strong>Negative Prompts:</strong>
            <span v-for="neg in imagePrefs.defaultStyle.negativePrompts" :key="neg" class="tag tag-danger">{{ neg }}</span>
          </div>
        </div>

        <!-- ComfyUI Settings -->
        <div v-if="imagePrefs.comfyui" class="card">
          <h4>ComfyUI Configuration</h4>
          <div class="settings-grid">
            <div v-if="imagePrefs.comfyui.endpoint" class="stat">
              <span class="stat-label">Endpoint</span>
              <span class="mono">{{ imagePrefs.comfyui.endpoint }}</span>
            </div>
            <div v-if="imagePrefs.comfyui.checkpoint" class="stat">
              <span class="stat-label">Checkpoint</span>
              <span>{{ imagePrefs.comfyui.checkpoint }}</span>
            </div>
            <div v-if="imagePrefs.comfyui.defaultWorkflow" class="stat">
              <span class="stat-label">Workflow</span>
              <span>{{ imagePrefs.comfyui.defaultWorkflow }}</span>
            </div>
          </div>
          <div v-if="imagePrefs.comfyui.loras?.length" class="mt-20">
            <strong>LoRAs:</strong>
            <div v-for="lora in imagePrefs.comfyui.loras" :key="lora.name" class="stat">
              <span class="stat-label">{{ lora.name }}</span>
              <span>Weight: {{ lora.weight }}</span>
            </div>
          </div>
          <div v-if="imagePrefs.comfyui.samplerSettings" class="mt-20">
            <strong>Sampler Settings:</strong>
            <div class="settings-grid">
              <div v-if="imagePrefs.comfyui.samplerSettings.sampler" class="stat">
                <span class="stat-label">Sampler</span>
                <span>{{ imagePrefs.comfyui.samplerSettings.sampler }}</span>
              </div>
              <div v-if="imagePrefs.comfyui.samplerSettings.scheduler" class="stat">
                <span class="stat-label">Scheduler</span>
                <span>{{ imagePrefs.comfyui.samplerSettings.scheduler }}</span>
              </div>
              <div v-if="imagePrefs.comfyui.samplerSettings.steps" class="stat">
                <span class="stat-label">Steps</span>
                <span>{{ imagePrefs.comfyui.samplerSettings.steps }}</span>
              </div>
              <div v-if="imagePrefs.comfyui.samplerSettings.cfg" class="stat">
                <span class="stat-label">CFG</span>
                <span>{{ imagePrefs.comfyui.samplerSettings.cfg }}</span>
              </div>
            </div>
          </div>

          <!-- Workflow Templates -->
          <div v-if="imagePrefs.comfyui.workflows && Object.keys(imagePrefs.comfyui.workflows).length > 0" class="mt-20">
            <strong>Workflow Templates:</strong>
            <div class="workflow-list">
              <div
                v-for="(workflow, id) in imagePrefs.comfyui.workflows"
                :key="id"
                class="workflow-card"
                :class="{ 'is-default': imagePrefs.comfyui.defaultWorkflowId === id }"
              >
                <div class="workflow-header">
                  <span class="workflow-name">{{ workflow.name }}</span>
                  <span v-if="imagePrefs.comfyui.defaultWorkflowId === id" class="workflow-badge">Default</span>
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
        <div v-if="imagePrefs.dalle" class="card">
          <h4>DALL-E Configuration</h4>
          <div class="settings-grid">
            <div v-if="imagePrefs.dalle.model" class="stat">
              <span class="stat-label">Model</span>
              <span>{{ imagePrefs.dalle.model }}</span>
            </div>
            <div v-if="imagePrefs.dalle.quality" class="stat">
              <span class="stat-label">Quality</span>
              <span>{{ imagePrefs.dalle.quality }}</span>
            </div>
            <div v-if="imagePrefs.dalle.style" class="stat">
              <span class="stat-label">Style</span>
              <span>{{ imagePrefs.dalle.style }}</span>
            </div>
            <div v-if="imagePrefs.dalle.size" class="stat">
              <span class="stat-label">Size</span>
              <span>{{ imagePrefs.dalle.size }}</span>
            </div>
          </div>
        </div>

        <!-- Midjourney Settings -->
        <div v-if="imagePrefs.midjourney" class="card">
          <h4>Midjourney Configuration</h4>
          <div class="settings-grid">
            <div v-if="imagePrefs.midjourney.version" class="stat">
              <span class="stat-label">Version</span>
              <span>{{ imagePrefs.midjourney.version }}</span>
            </div>
            <div v-if="imagePrefs.midjourney.stylize !== undefined" class="stat">
              <span class="stat-label">Stylize</span>
              <span>{{ imagePrefs.midjourney.stylize }}</span>
            </div>
            <div v-if="imagePrefs.midjourney.chaos !== undefined" class="stat">
              <span class="stat-label">Chaos</span>
              <span>{{ imagePrefs.midjourney.chaos }}</span>
            </div>
            <div v-if="imagePrefs.midjourney.quality !== undefined" class="stat">
              <span class="stat-label">Quality</span>
              <span>{{ imagePrefs.midjourney.quality }}</span>
            </div>
            <div v-if="imagePrefs.midjourney.aspectRatio" class="stat">
              <span class="stat-label">Aspect Ratio</span>
              <span>{{ imagePrefs.midjourney.aspectRatio }}</span>
            </div>
          </div>
        </div>

        <!-- SDXL Settings -->
        <div v-if="imagePrefs.sdxl" class="card">
          <h4>Stable Diffusion XL Configuration</h4>
          <div class="settings-grid">
            <div v-if="imagePrefs.sdxl.model" class="stat">
              <span class="stat-label">Model</span>
              <span>{{ imagePrefs.sdxl.model }}</span>
            </div>
            <div v-if="imagePrefs.sdxl.samplerName" class="stat">
              <span class="stat-label">Sampler</span>
              <span>{{ imagePrefs.sdxl.samplerName }}</span>
            </div>
            <div v-if="imagePrefs.sdxl.steps" class="stat">
              <span class="stat-label">Steps</span>
              <span>{{ imagePrefs.sdxl.steps }}</span>
            </div>
            <div v-if="imagePrefs.sdxl.cfg" class="stat">
              <span class="stat-label">CFG</span>
              <span>{{ imagePrefs.sdxl.cfg }}</span>
            </div>
            <div v-if="imagePrefs.sdxl.width && imagePrefs.sdxl.height" class="stat">
              <span class="stat-label">Size</span>
              <span>{{ imagePrefs.sdxl.width }} x {{ imagePrefs.sdxl.height }}</span>
            </div>
          </div>
          <div v-if="imagePrefs.sdxl.negativePrompt" class="mt-20">
            <strong>Negative Prompt:</strong>
            <p class="mono text-sm">{{ imagePrefs.sdxl.negativePrompt }}</p>
          </div>
        </div>

        <!-- Flux Settings -->
        <div v-if="imagePrefs.flux" class="card">
          <h4>Flux Configuration</h4>
          <div class="settings-grid">
            <div v-if="imagePrefs.flux.model" class="stat">
              <span class="stat-label">Model</span>
              <span>{{ imagePrefs.flux.model }}</span>
            </div>
            <div v-if="imagePrefs.flux.steps" class="stat">
              <span class="stat-label">Steps</span>
              <span>{{ imagePrefs.flux.steps }}</span>
            </div>
            <div v-if="imagePrefs.flux.guidance" class="stat">
              <span class="stat-label">Guidance</span>
              <span>{{ imagePrefs.flux.guidance }}</span>
            </div>
          </div>
        </div>

        <!-- Generation Defaults -->
        <div v-if="imagePrefs.defaults" class="card">
          <h4>Generation Defaults</h4>
          <div class="settings-grid">
            <div v-if="imagePrefs.defaults.aspectRatio" class="stat">
              <span class="stat-label">Aspect Ratio</span>
              <span>{{ imagePrefs.defaults.aspectRatio }}</span>
            </div>
            <div v-if="imagePrefs.defaults.generateOnCreate !== undefined" class="stat">
              <span class="stat-label">Auto-Generate</span>
              <span>{{ imagePrefs.defaults.generateOnCreate ? 'Yes' : 'No' }}</span>
            </div>
            <div v-if="imagePrefs.defaults.savePrompts !== undefined" class="stat">
              <span class="stat-label">Save Prompts</span>
              <span>{{ imagePrefs.defaults.savePrompts ? 'Yes' : 'No' }}</span>
            </div>
          </div>
          <div v-if="imagePrefs.defaults.framing" class="mt-20">
            <strong>Default Framing:</strong>
            <div class="settings-grid">
              <div v-if="imagePrefs.defaults.framing.character" class="stat">
                <span class="stat-label">Character</span>
                <span>{{ imagePrefs.defaults.framing.character }}</span>
              </div>
              <div v-if="imagePrefs.defaults.framing.location" class="stat">
                <span class="stat-label">Location</span>
                <span>{{ imagePrefs.defaults.framing.location }}</span>
              </div>
              <div v-if="imagePrefs.defaults.framing.item" class="stat">
                <span class="stat-label">Item</span>
                <span>{{ imagePrefs.defaults.framing.item }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Consistency Settings -->
        <div v-if="imagePrefs.consistency" class="card">
          <h4>Consistency Settings</h4>
          <div class="settings-grid">
            <div v-if="imagePrefs.consistency.maintainColorPalette !== undefined" class="stat">
              <span class="stat-label">Maintain Color Palette</span>
              <span>{{ imagePrefs.consistency.maintainColorPalette ? 'Yes' : 'No' }}</span>
            </div>
            <div v-if="imagePrefs.consistency.useCharacterRefs !== undefined" class="stat">
              <span class="stat-label">Use Character Refs</span>
              <span>{{ imagePrefs.consistency.useCharacterRefs ? 'Yes' : 'No' }}</span>
            </div>
            <div v-if="imagePrefs.consistency.styleReferenceImage" class="stat">
              <span class="stat-label">Style Reference</span>
              <span>{{ imagePrefs.consistency.styleReferenceImage }}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="imagePrefs.notes" class="card">
          <h4>Notes</h4>
          <p>{{ imagePrefs.notes }}</p>
        </div>
      </template>

      <!-- No Preferences Configured -->
      <div v-else class="empty-card">
        <div class="empty-icon">🎨</div>
        <div class="empty-title">No Image Generation Preferences</div>
        <div class="empty-description">
          Image generation preferences haven't been configured for this game yet.
          The DM agent can set these using the <code>set_image_generation_preferences</code> tool.
        </div>
      </div>
    </section>
  </div>
  <p v-else class="empty">Session not found.</p>
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
  margin-bottom: var(--space-4);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-2);
}

.setting-value {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--accent);
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
  background: var(--bg-elevated);
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
  background: var(--bg-secondary);
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
