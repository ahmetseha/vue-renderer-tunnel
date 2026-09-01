<script setup lang="ts">
import { HtmlTunnel } from './tunnels'

defineProps<{ clicks: number }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <HtmlTunnel.In>
    <button
      class="overlay"
      data-testid="tunneled-overlay"
      type="button"
      @click="$emit('click')"
    >
      Clicks from tunneled DOM: {{ clicks }}
    </button>
  </HtmlTunnel.In>
</template>
