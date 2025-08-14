const CACHE_NAME = 'people-network-cache-v1';
const ASSETS = [
	'/', // root
	'/src/index.html',
	'/manifest.json',
	'/src/components/App.vue',
	'/src/components/ExportImportManager.vue',
	'/src/index.ts',
	'/src/style.css',
	// Add any other assets or dependencies here
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(ASSETS);
		}),
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.map((key) => {
				if (key !== CACHE_NAME) return caches.delete(key);
			})),
		),
	);
});

self.addEventListener('fetch', (event) => {
	event.respondWith(
		caches.match(event.request).then((cached) => {
			return cached || fetch(event.request);
		}),
	);
});
