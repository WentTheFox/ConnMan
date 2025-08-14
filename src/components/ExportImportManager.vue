<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Connection, Entity } from '../util/types';

// Props
const props = defineProps<{
  entities: Entity[]
  connections: Connection[]
}>();

// Emits
const emit = defineEmits<{
  (e: 'update:entities', value: Entity[]): void
  (e: 'update:connections', value: Connection[]): void
}>();

// State
const password = ref('');
const lastSaved = ref<Date | null>(null);
const opfsFileHandle = ref<FileSystemFileHandle | null>(null);

const isEncrypted = (text: string): boolean => {
  const firstChar = text.trim()[0];
  return firstChar !== '{' && firstChar !== '[' && firstChar !== '"';
};


onMounted(async () => {
  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle('network.json', { create: true });
  opfsFileHandle.value = handle;

  try {
    const file = await handle.getFile();
    const text = await file.text();

    if (!text.trim()) {
      console.log("File is blank, skipping load.");
      return;
    }

    let data: any;
    if (isEncrypted(text)) {
      // Show password prompt before proceeding
      while (!password.value) {
        password.value = prompt("This file is encrypted. Please enter your password to continue:") || '';
      }

      data = await decryptData(text, password.value);
    } else {
      data = JSON.parse(text);
    }
    emit('update:entities', data.entities || []);
    emit('update:connections', data.connections || []);
    lastSaved.value = new Date(data.lastSaved);
  } catch (err) {
    console.warn("Failed to load OPFS file:", err);
  }
});

// Auto-save to OPFS
watch(() => [props.entities, props.connections], async () => {
  console.info('EIM watch');
  if (!opfsFileHandle.value) {
    console.warn('Missing opfsFileHandle');
    return;
  }
  const writable = await opfsFileHandle.value.createWritable();
  const data = {
    entities: props.entities,
    connections: props.connections,
    lastSaved: new Date().toISOString(),
  };
  const content = password.value
      ? await encryptData(data, password.value)
      : JSON.stringify(data);
  await writable.write(content);
  await writable.close();
  lastSaved.value = new Date(data.lastSaved);
}, { immediate: true });

// Export to file
const exportToFile = async () => {
  const data = {
    people: props.entities,
    connections: props.connections,
  };
  const content = password.value
      ? await encryptData(data, password.value)
      : JSON.stringify(data);

  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = password.value ? 'network.encrypted' : 'network.json';
  a.click();
};

// Import from file
const importFromFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const text = await file.text();
  let data;
  try {
    data = password.value
        ? await decryptData(text, password.value)
        : JSON.parse(text);
  } catch {
    alert('Failed to parse or decrypt file.');
    return;
  }
  emit('update:entities', data.people);
  emit('update:connections', data.connections);
};

// Encryption helpers (basic AES-GCM with subtle crypto)
const encryptData = async (data: any, password: string): Promise<string> => {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: iv,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
  );
  const encoded = enc.encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded,
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
};

const decryptData = async (text: string, password: string): Promise<any> => {
  const raw = Uint8Array.from(atob(text), c => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: iv,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
  );
  const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data,
  );
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted));
};
</script>

<template>
  <div class="export-import-manager">
    <div style="margin-bottom: 1em;" hidden>
      <label>
        Optional Password:
        <input type="password" v-model="password" placeholder="Leave blank for plaintext" />
      </label>
    </div>
    <div>
      <button @click="exportToFile">Export to File</button>
      <input type="file" @change="importFromFile" />
    </div>
    <div v-if="lastSaved" class="last-saved">
      Last saved: {{ lastSaved.toLocaleString() }}
    </div>

  </div>
</template>

<style scoped>
.export-import-manager {
  padding: 1em;
  border: 1px solid #ccc;
  border-radius: 8px;
  max-width: 400px;
}
input[type="password"] {
  width: 100%;
  margin-top: 0.5em;
}
button {
  margin-right: 1em;
}
</style>
