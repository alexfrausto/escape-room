/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { assets, immutable, prerendered } from '$app/manifest';
import { version } from '$app/env';
import { resolve } from '$app/paths';

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = `cypher-tracker-v${version}`;

// Helper to normalize asset entries into clean URL strings
function normalizePath(entry: string | { path: string }): string {
	const raw = typeof entry === 'string' ? entry : entry.path;
	return raw.startsWith('/') ? raw : '/' + raw;
}

// Comprehensive pre-cache manifest: root shell, immutable Vite chunks, static files, and prerendered routes
const rawAssets = [...immutable, ...assets, ...prerendered];
const PRECACHE_ASSETS = Array.from(
	new Set([
		resolve('/'),
		...rawAssets.map(normalizePath)
	])
);

self.addEventListener('install', (event) => {
	// Precache all resources during service worker installation
	event.waitUntil(
		caches.open(CACHE_NAME).then(async (cache) => {
			try {
				await Promise.all(
					PRECACHE_ASSETS.map((asset) =>
						cache.add(asset).catch((err) => {
							console.warn(`[SW] Precache skipped for ${asset}:`, err);
						})
					)
				);
			} catch (err) {
				console.warn('[SW] Precache batch error:', err);
			}
			return self.skipWaiting();
		})
	);
});

self.addEventListener('activate', (event) => {
	// Clean up stale caches from previous application versions
	event.waitUntil(
		caches.keys().then(async (keys) => {
			await Promise.all(
				keys.map((key) => {
					if (key !== CACHE_NAME) {
						return caches.delete(key);
					}
				})
			);
			return self.clients.claim();
		})
	);
});

self.addEventListener('fetch', (event) => {
	// Ignore non-GET requests or unsupported schemes
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (!url.protocol.startsWith('http')) return;

	// Navigation requests (HTML document shell)
	if (event.request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				// 1. Try cache first for instant offline mobile load
				const rootPath = resolve('/');
				const cachedShell = (await caches.match(event.request)) || (await caches.match(rootPath));
				if (cachedShell) {
					// Non-blocking background network refresh if online
					event.waitUntil(
						fetch(event.request)
							.then(async (response) => {
								if (response.ok) {
									const cache = await caches.open(CACHE_NAME);
									await cache.put(event.request, response);
								}
							})
							.catch(() => {
								// Offline - expected in escape rooms
							})
					);
					return cachedShell;
				}

				// 2. If not yet in cache (initial first load), fetch from network and cache
				try {
					const networkResponse = await fetch(event.request);
					if (networkResponse.ok) {
						const cache = await caches.open(CACHE_NAME);
						cache.put(event.request, networkResponse.clone());
					}
					return networkResponse;
				} catch {
					const fallback = await caches.match(rootPath);
					if (fallback) return fallback;
					return new Response('Terminal offline. Conexión requerida una vez.', {
						status: 503,
						headers: { 'Content-Type': 'text/plain; charset=utf-8' }
					});
				}
			})()
		);
		return;
	}

	// Static assets, scripts, stylesheets, and fonts: Cache-first
	event.respondWith(
		(async () => {
			const cached = await caches.match(event.request);
			if (cached) {
				return cached;
			}

			try {
				const response = await fetch(event.request);
				if (response.ok && response.type === 'basic') {
					const cache = await caches.open(CACHE_NAME);
					cache.put(event.request, response.clone());
				}
				return response;
			} catch {
				return new Response('', { status: 408 });
			}
		})()
	);
});
