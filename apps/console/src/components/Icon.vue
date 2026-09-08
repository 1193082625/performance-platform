<script setup>
defineProps({ name: String });
</script>
<template>
  <svg
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    stroke-width="2.4"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'pulse'">
      <path d="M32 3 49 8 60 23 60 41 49 56 32 61 15 56 4 41 4 23 15 8Z" />
      <path d="M12 32h9l5-12 7 25 7-18 4 7h8" />
    </template>
    <template v-else-if="name === 'shield'">
      <path d="m32 5 23 9v19c0 13-15 23-23 27C24 56 9 46 9 33V14Z" />
      <path d="m22 33 7 7 14-16" stroke-width="4" />
    </template>
    <template v-else-if="name === 'chip'">
      <rect x="13" y="10" width="38" height="44" rx="4" />
      <rect x="21" y="18" width="22" height="28" rx="2" />
      <path
        d="M21 4v6m11-6v6m11-6v6M21 54v6m11-6v6m11-6v6M7 18h6M7 27h6M7 36h6M7 45h6m38-27h6m-6 9h6m-6 9h6m-6 9h6"
      />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="32" cy="32" r="25" />
      <path d="M32 14v19l13 7" />
    </template>
    <template v-else>
      <circle cx="32" cy="32" r="25" />
      <path d="M32 29v15m0-24v1" />
    </template>
  </svg>
</template>
