<script setup lang="ts">
import { Application } from '@pixi/app'
import { extensions } from '@pixi/extensions'
import { Ticker, TickerPlugin } from '@pixi/ticker'
import { Live2DModel } from 'pixi-live2d-display/cubism4'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  width: number
  height: number
  resolution?: number
  maxFps?: number
}>(), {
  resolution: 2,
  maxFps: 0,
})

const componentState = defineModel<'pending' | 'loading' | 'mounted'>('state', { default: 'pending' })

const containerRef = ref<HTMLDivElement>()
const isPixiCanvasReady = ref(false)
const pixiApp = ref<Application>()
const pixiAppCanvas = ref<HTMLCanvasElement>()
const initError = ref<string | null>(null)

function resolveMaxFps(limit?: number) {
  if (!limit || limit <= 0)
    return 0

  return Math.max(1, Math.round(limit))
}

function installRenderGuard(app: Application) {
  const guardedRender = () => {
    try {
      app.render()
    }
    catch (error) {
      console.error('[Live2D] Pixi render error.', error)
      app.ticker.stop()
    }
  }

  app.ticker.remove(app.render, app)
  app.ticker.add(guardedRender)
  app.ticker.maxFPS = resolveMaxFps(props.maxFps)
}

async function initLive2DPixiStage(parent: HTMLDivElement) {
  componentState.value = 'loading'
  isPixiCanvasReady.value = false

  // https://guansss.github.io/pixi-live2d-display/#package-importing
  Live2DModel.registerTicker(Ticker)
  extensions.add(TickerPlugin)
  // We handle the interactions (e.g., mouse-based focusing at) manually
  // extensions.add(InteractionManager)

  try {
    pixiApp.value = new Application({
      width: props.width * props.resolution,
      height: props.height * props.resolution,
      backgroundAlpha: 0,
      preserveDrawingBuffer: true,
      autoDensity: false,
      resolution: 1,
    })
    console.info('[Live2D] Pixi initialized successfully')
    initError.value = null
  }
  catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[Live2D] Failed to initialize Pixi stage:', error)
    console.error('[Live2D] WebGL initialization failed. This may be due to:')
    console.error('[Live2D] 1. Hardware acceleration is disabled')
    console.error('[Live2D] 2. GPU drivers are outdated')
    console.error('[Live2D] 3. GPU is blocklisted')
    console.error('[Live2D] Please check Electron GPU status at chrome://gpu')

    initError.value = `WebGL initialization failed: ${errorMsg}`

    // Set both flags to false to prevent rendering attempts
    isPixiCanvasReady.value = false
    componentState.value = 'mounted'

    // Don't throw - let the component mount in error state
    return
  }

  installRenderGuard(pixiApp.value)
  pixiApp.value.stage.scale.set(props.resolution)

  pixiAppCanvas.value = pixiApp.value.view

  // Set CSS styles to make canvas responsive to container
  pixiAppCanvas.value.style.width = '100%'
  pixiAppCanvas.value.style.height = '100%'
  pixiAppCanvas.value.style.objectFit = 'cover'
  pixiAppCanvas.value.style.display = 'block'

  parent.appendChild(pixiApp.value.view)

  isPixiCanvasReady.value = true
  componentState.value = 'mounted'
}

function handleResize() {
  if (pixiApp.value) {
    // Update the internal rendering resolution
    pixiApp.value.renderer.resize(props.width * props.resolution, props.height * props.resolution)
    pixiApp.value.stage.scale.set(props.resolution)
  }

  // The CSS styles handle the display size, so we don't need to manually set view dimensions
}

watch([() => props.width, () => props.height, () => props.resolution], handleResize)
watch(() => props.maxFps, (limit) => {
  if (pixiApp.value)
    pixiApp.value.ticker.maxFPS = resolveMaxFps(limit)
})

onMounted(async () => {
  if (containerRef.value) {
    await initLive2DPixiStage(containerRef.value)
  }
})
onUnmounted(() => pixiApp.value?.destroy())

async function captureFrame() {
  const frame = new Promise<Blob | null>((resolve) => {
    if (!pixiAppCanvas.value || !pixiApp.value)
      return resolve(null)

    try {
      pixiApp.value.render()
    }
    catch (error) {
      console.error('[Live2D] Pixi render error during capture.', error)
      return resolve(null)
    }

    pixiAppCanvas.value.toBlob(resolve)
  })

  return frame
}

function canvasElement() {
  return pixiAppCanvas.value
}

defineExpose({
  captureFrame,
  canvasElement,
})

import.meta.hot?.dispose(() => {
  console.warn('[Dev] Reload on HMR dispose is active for this component. Performing a full reload.')
  window.location.reload()
})
</script>

<template>
  <div ref="containerRef" h-full w-full>
    <div v-if="initError" flex="~ col" h-full items-center justify-center p-4 text-center>
      <div mb-2 text-red-500 font-bold>
        WebGL Initialization Failed
      </div>
      <div mb-4 text-sm text-gray-600 dark:text-gray-400>
        {{ initError }}
      </div>
      <div text-xs text-gray-500>
        <p>Please check:</p>
        <ul mt-2 text-left space-y-1>
          <li>• Hardware acceleration is enabled</li>
          <li>• GPU drivers are up to date</li>
          <li>• Visit chrome://gpu in DevTools for details</li>
        </ul>
      </div>
    </div>
    <slot v-else-if="isPixiCanvasReady" :app="pixiApp" />
  </div>
</template>
