<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, onUpdated, shallowRef } from 'vue'
import type { Mesh, MeshStandardMaterial } from 'three'
import {
  actualMaterialColor,
  actualRotationY,
  mountedMeshCount,
} from './state'

defineProps<{
  color: string
  rotationY: number
}>()

const meshRef = shallowRef<Mesh | null>(null)
const materialRef = shallowRef<MeshStandardMaterial | null>(null)

function publishHostState(): void {
  actualMaterialColor.value = materialRef.value
    ? `#${materialRef.value.color.getHexString()}`
    : 'unmounted'
  actualRotationY.value = meshRef.value?.rotation.y ?? null
}

function publishAfterPatch(): void {
  void nextTick(publishHostState)
}

onMounted(() => {
  mountedMeshCount.value += 1
  publishAfterPatch()
})
onUpdated(publishAfterPatch)
onUnmounted(() => {
  mountedMeshCount.value -= 1
  actualMaterialColor.value = 'unmounted'
  actualRotationY.value = null
})
</script>

<template>
  <TresMesh
    ref="meshRef"
    name="tunneled-box"
    :rotation-y="rotationY"
  >
    <TresBoxGeometry :args="[1.4, 1.4, 1.4]" />
    <TresMeshStandardMaterial
      ref="materialRef"
      :color="color"
    />
  </TresMesh>
</template>
