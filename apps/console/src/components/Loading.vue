<template>
  <main class="session-loader" aria-live="polite">
    <div class="loader-mark"><span></span><span></span><span></span></div>
    <p>正在建立安全会话</p>
  </main>
</template>

<style scoped>
@keyframes signal {
  0%,
  100% {
    transform: scaleY(0.35);
    opacity: 0.35;
  }
  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}
.session-loader {
  min-height: 100vh;
  display: grid;
  place-content: center;
  gap: 18px;
  text-align: center;
  background: #05090f;
  color: #92a1b7;
}
.loader-mark {
  display: flex;
  gap: 7px;
  justify-content: center;
}
.loader-mark span {
  width: 7px;
  height: 24px;
  background: #35d8f1;
  animation: signal 1s ease-in-out infinite;
}
.loader-mark span:nth-child(2) {
  animation-delay: 0.15s;
}
.loader-mark span:nth-child(3) {
  animation-delay: 0.3s;
}
@media (prefers-reduced-motion: reduce) {
  .loader-mark span {
    animation: none;
  }
}
</style>
