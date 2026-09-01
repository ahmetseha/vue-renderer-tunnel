import { ref } from 'vue'

export const overlayClicks = ref(0)
export const mountedMeshCount = ref(0)
export const actualMaterialColor = ref('unmounted')
export const actualRotationY = ref<number | null>(null)
