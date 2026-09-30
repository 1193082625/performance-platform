<template>
  <div class="workspace-account">
    <span>欢迎你，{{ userName }}</span>
    <button
      class="sign-out-button"
      type="button"
      aria-label="退出登录"
      title="退出登录"
      @click="$emit('sign-out')"
    >
      <Icon name="logout" />
    </button>
  </div>
</template>
<script setup lang="ts">
import Icon from './Icon.vue'
const props = defineProps<{
  userName: string
}>()
</script>
<style scoped>
.workspace-account {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 20px;
  white-space: nowrap;
  font-size: 14px;
  color: #9eafc0;
}

.sign-out-button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 7px;
  border-color: #2a3c4c;
  background: transparent;
  color: #b7c8d7;
}
.sign-out-button:hover,
.sign-out-button:focus-visible {
  border-color: #67e7f6;
  color: #d8fcff;
}
.sign-out-button svg {
  width: 20px;
  height: 20px;
}
@media (max-width: 650px) {
  .workspace-account {
    gap: 12px;
  }
}
</style>
