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
	<div class="fixed inset-0 z-50 flex flex-col bg-[#020510]/92 backdrop-blur-md">
		<!-- Scanner Top Header -->
		<div class="flex items-center justify-between border-b border-blue-900/60 bg-[#040a1a]/95 px-4 py-3">
			<div class="flex items-center gap-2.5">
				<div class="h-2.5 w-2.5 animate-ping rounded-full bg-sky-400"></div>
				<h2 class="font-tech text-xs sm:text-sm font-extrabold tracking-[0.18em] text-sky-300 text-glow-cyan uppercase">
					ESCÁNER ÓPTICO
				</h2>
			</div>

			<button
				type="button"
				class="btn-tactile rounded-md border border-blue-800/80 bg-blue-950/60 px-3 py-1 font-mono text-xs font-bold text-slate-200 hover:border-sky-400/70 hover:text-white cursor-pointer"
				onclick={handleClose}
			>
				[ ✕ CERRAR ]
			</button>
		</div>

		<!-- Camera Viewport Container -->
		<div class="relative flex flex-1 flex-col items-center justify-center p-4">
			<p class="mb-3 font-mono text-[10px] font-bold tracking-[0.2em] text-sky-300/80 uppercase">
				ALINEA EL CÓDIGO QR DENTRO DE LA RETÍCULA
			</p>

			<!-- Video element target container -->
			<div class="hud-box mi-corners relative max-h-[380px] w-full max-w-[340px] overflow-hidden rounded-xl border border-sky-400/60 bg-black shadow-[0_0_42px_rgba(56,189,248,0.28)]">
				<!-- Sweeping Cyan-Blue Laser Scan Line -->
				<div class="mi-scan-laser" aria-hidden="true"></div>
				<div id={scannerElementId} class="w-full"></div>
			</div>

			<!-- Status Feedback Notices -->
			<div class="mt-4 text-center">
				{#if scannedFeedback}
					<p class="rounded-md border border-red-500/50 bg-red-950/40 px-3 py-1.5 font-mono text-xs font-bold text-red-300 text-glow-crimson">
						{scannedFeedback}
					</p>
				{:else if errorMessage}
					<p class="rounded-md border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 font-mono text-xs text-amber-300">
						{errorMessage}
					</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
