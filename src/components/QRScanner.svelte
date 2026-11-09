<script lang="ts">
	import { onDestroy, tick, untrack } from 'svelte';
	import type { Html5Qrcode } from 'html5-qrcode';
	import { getStationByQr } from '../services/verifier';
	import type { StationDefinition } from '../types';
	import { audio } from '../services/audio';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onStationDetected: (station: StationDefinition) => void;
	}

	let { isOpen, onClose, onStationDetected }: Props = $props();

	let scannerElementId = 'cypher-qr-reader';
	let html5QrCode: Html5Qrcode | null = null;
	let isScanning = $state<boolean>(false);
	let isVisible = $state<boolean>(false);
	let isStarting = false;
	let isStopping = false;
	let errorMessage = $state<string | null>(null);
	let scannedFeedback = $state<string | null>(null);

	async function startScanner() {
		if (isStarting || isScanning) return;
		isStarting = true;
		errorMessage = null;
		scannedFeedback = null;

		try {
			await tick();
			const container = document.getElementById(scannerElementId);
			if (!container) {
				console.warn('[QRScanner] Container not found in DOM');
				isStarting = false;
				return;
			}

			// Clean existing container content
			container.innerHTML = '';

			const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

			if (html5QrCode) {
				await stopScanner();
			}

			html5QrCode = new Html5Qrcode(scannerElementId, {
				formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
				verbose: false
			});

			const config = {
				fps: 10,
				qrbox: { width: 250, height: 250 },
				aspectRatio: 1.0
			};

			await html5QrCode.start(
				{ facingMode: 'environment' },
				config,
				onScanSuccess,
				onScanFailure
			);

			isScanning = true;
		} catch (err: unknown) {
			console.warn('[QRScanner] Camera start error:', err);
			// Try fallback to any available camera (e.g. front camera on laptop)
			try {
				if (html5QrCode) {
					await html5QrCode.start(
						{ facingMode: 'user' },
						{ fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
						onScanSuccess,
						onScanFailure
					);
					isScanning = true;
					return;
				}
			} catch (fallbackErr: unknown) {
				const error = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
				errorMessage = `Error de cámara: ${error}. Puedes usar acceso manual.`;
				isScanning = false;
			}
		} finally {
			isStarting = false;
		}
	}

	function onScanSuccess(decodedText: string) {
		const matchedStation = getStationByQr(decodedText);

		if (matchedStation) {
			audio.play('beep');
			stopScanner().then(() => {
				onStationDetected(matchedStation);
			});
		} else {
			audio.play('error');
			scannedFeedback = `Código no reconocido: "${decodedText}"`;
			setTimeout(() => {
				if (scannedFeedback) scannedFeedback = null;
			}, 3000);
		}
	}

	function onScanFailure(_error: unknown) {
		// Normal frame without QR - quiet ignore
	}

	async function stopScanner() {
		if (isStopping) return;
		isStopping = true;

		try {
			if (html5QrCode) {
				try {
					const state = html5QrCode.getState?.();
					// Html5QrcodeScannerState: 2 is SCANNING, 3 is PAUSED
					if (html5QrCode.isScanning || state === 2 || state === 3) {
						await html5QrCode.stop();
					}
				} catch (err) {
					console.warn('[QRScanner] Stop scanner error:', err);
				}

				try {
					const container = document.getElementById(scannerElementId);
					if (container) {
						html5QrCode.clear();
					}
				} catch (err) {
					console.warn('[QRScanner] Clear error:', err);
				}

				html5QrCode = null;
			}
		} finally {
			isScanning = false;
			isStopping = false;
		}
	}

	function handleClose() {
		audio.play('click');
		onClose();
	}

	$effect(() => {
		if (isOpen) {
			isVisible = true;
			untrack(() => {
				startScanner();
			});
		} else {
			untrack(() => {
				stopScanner().then(() => {
					isVisible = false;
				});
			});
		}
	});

	onDestroy(() => {
		stopScanner();
	});
</script>

{#if isVisible}
	<div class="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-md">
		<!-- Scanner Top Header -->
		<div class="flex items-center justify-between border-b border-emerald-800 px-4 py-3">
			<div class="flex items-center gap-2">
				<div class="h-2 w-2 animate-ping rounded-full bg-emerald-500"></div>
				<h2 class="font-mono text-sm font-bold tracking-widest text-emerald-400">
					ESCANER QR
				</h2>
			</div>

			<button
				type="button"
				class="rounded border border-neutral-700 bg-neutral-900 px-3 py-1 font-mono text-xs font-bold hover:bg-neutral-800 cursor-pointer text-neutral-200"
				onclick={handleClose}
			>
				[ ✕ CERRAR ]
			</button>
		</div>

		<!-- Camera Viewport Container -->
		<div class="relative flex flex-1 flex-col items-center justify-center p-4">
			<!-- Video element target container -->
			<div class="hud-box relative max-h-[380px] w-full max-w-[340px] overflow-hidden rounded-lg border-2 border-emerald-500/50 bg-black shadow-[0_0_30px_rgba(34,197,94,0.15)]">
				<div id={scannerElementId} class="w-full"></div>
			</div>

			<!-- Status Feedback Notices -->
			<div class="mt-3 text-center">
				{#if scannedFeedback}
					<p class="font-mono text-xs font-semibold text-rose-400 text-glow-crimson">
						{scannedFeedback}
					</p>
				{:else if errorMessage}
					<p class="font-mono text-xs text-amber-400">
						{errorMessage}
					</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
