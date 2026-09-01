<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { mountedMeshCount } from './state'

defineProps<{
  color: string
  rotationY: number
}>()

onMounted(() => mountedMeshCount.value += 1)
onUnmounted(() => mountedMeshCount.value -= 1)
</script>

<template>
  <TresMesh
    name="tunneled-box"
    :rotation-y="rotationY"
  >
    <TresBoxGeometry :args="[1.4, 1.4, 1.4]" />
    <TresMeshStandardMaterial :color="color" />
  </TresMesh>
</template>
