import { createApp } from "vue";
import App from "./components/App.vue";

createApp(App).mount("#app");

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('./sw.ts', import.meta.url)).then(() => {
      console.log('Service Worker registered')
    }).catch((err) => {
      console.error('Service Worker registration failed:', err)
    })
  })
}
