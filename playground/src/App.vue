<script setup lang="ts">
import { computed, ref } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { Vector3 } from 'three'
import OverlaySource from './OverlaySource.vue'
import TunneledMesh from './TunneledMesh.vue'
import {
  actualMaterialColor,
  actualRotationY,
  mountedMeshCount,
  overlayClicks,
} from './state'
import { HtmlTunnel, ThreeTunnel } from './tunnels'

const showMesh = ref(true)
const color = ref('#f97316')
const canvasReady = ref(false)
const rotationY = computed(() => overlayClicks.value * 0.25)
const cameraPosition = new Vector3(3, 3, 4)
const lightPosition = new Vector3(2, 3, 2)

function toggleMesh(): void {
  showMesh.value = !showMesh.value
}
</script>

<template>
  <main>
    <section class="controls">
      <h1>vue-renderer-tunnel</h1>
      <p>DOM → Tres and Tres → DOM, through two independent tunnels.</p>

      <label>
        Box color
        <input
          v-model="color"
          data-testid="color-input"
          type="color"
        >
      </label>
      <button
        data-testid="toggle-mesh"
        type="button"
        @click="toggleMesh"
      >
        {{ showMesh ? 'Remove' : 'Add' }} tunneled mesh
      </button>

      <dl class="status">
        <div>
          <dt>Canvas ready</dt>
          <dd data-testid="canvas-ready">
            {{ canvasReady }}
          </dd>
        </div>
        <div>
          <dt>Mounted mesh count</dt>
          <dd data-testid="scene-mesh-count">
            {{ mountedMeshCount }}
          </dd>
        </div>
        <div>
          <dt>Overlay clicks</dt>
          <dd data-testid="overlay-click-count">
            {{ overlayClicks }}
          </dd>
        </div>
        <div>
          <dt>Actual material color</dt>
          <dd data-testid="actual-material-color">
            {{ actualMaterialColor }}
          </dd>
        </div>
        <div>
          <dt>Actual rotation Y</dt>
          <dd data-testid="actual-rotation-y">
            {{ actualRotationY === null ? 'unmounted' : actualRotationY.toFixed(3) }}
          </dd>
        </div>
      </dl>
    </section>

    <!-- This component is declared in the DOM renderer but never rendered there. -->
    <ThreeTunnel.In v-if="showMesh">
      <TunneledMesh
        :color="color"
        :rotation-y="rotationY"
      />
    </ThreeTunnel.In>

    <section class="canvas-shell">
      <TresCanvas
        clear-color="#111827"
        data-testid="tres-canvas"
        @ready="canvasReady = true"
      >
        <TresPerspectiveCamera :position="cameraPosition" />
        <TresAmbientLight :intensity="1.5" />
        <TresDirectionalLight
          :position="lightPosition"
          :intensity="2"
        />
        <ThreeTunnel.Out />
        <OverlaySource
          :clicks="overlayClicks"
          @click="overlayClicks += 1"
        />
      </TresCanvas>
    </section>

    <!-- Its source is inside Tres; this is the actual DOM render location. -->
    <HtmlTunnel.Out />
  </main>
</template>
