<script lang="ts">
	import { untrack } from 'svelte';
	import Header from '../components/Header.svelte';
	import StationGrid from '../components/StationGrid.svelte';
	import LockContainer from '../components/LockContainer.svelte';
	import QRScanner from '../components/QRScanner.svelte';
	import AdminModal from '../components/AdminModal.svelte';
	import RegistrationPage from '../components/RegistrationPage.svelte';
	import ManualStationModal from '../components/ManualStationModal.svelte';
	import { getAllStations } from '../services/verifier';
	import { gameStore } from '../services/storage';
	import { audio } from '../services/audio';
	import { fireVictoryCelebration } from '../services/confetti';
	import type { StationDefinition } from '../types';
	import { KeyRound, ScanLine, ShieldCheck } from '@lucide/svelte';

	const stations = getAllStations();

	// Modal state
	let activeStation = $state<StationDefinition | null>(null);
	let isLockModalOpen = $state<boolean>(false);
	let isQrScannerOpen = $state<boolean>(false);
	let isManualModalOpen = $state<boolean>(false);
	let isAdminModalOpen = $state<boolean>(false);
	let hasCelebratedVictory = $state<boolean>(false);

	$effect(() => {
		if ($gameStore.gameStarted && $gameStore.unlockedStationIds.length === stations.length && stations.length > 0) {
			if (!hasCelebratedVictory) {
				untrack(() => {
					hasCelebratedVictory = true;
					audio.play('victory');
					fireVictoryCelebration();
				});
			}
		} else if (!$gameStore.gameStarted || $gameStore.unlockedStationIds.length < stations.length) {
			if (hasCelebratedVictory) {
				untrack(() => {
					hasCelebratedVictory = false;
				});
			}
		}
	});

	function openStationLock(station: StationDefinition) {
		activeStation = station;
		isLockModalOpen = true;
	}

	function closeStationLock() {
		isLockModalOpen = false;
		activeStation = null;
	}

	function openQrScanner() {
		audio.play('beep');
		isQrScannerOpen = true;
	}

	function closeQrScanner() {
		isQrScannerOpen = false;
	}

	function handleQrStationDetected(station: StationDefinition) {
		isQrScannerOpen = false;
		openStationLock(station);
	}

	function handleUnlockSuccess(_station: StationDefinition) {
		audio.play('success');
	}

	function handleTriggerWinState() {
		hasCelebratedVictory = true;
		audio.play('victory');
		fireVictoryCelebration();
	}
</script>

<svelte:head>
	<title>MISIÓN IMPOSIBLE // CODEXTEC</title>
</svelte:head>

{#if !$gameStore.gameStarted}
	<!-- Registration & Mission Briefing Screen -->
	<RegistrationPage />
{:else}
	<!-- Active Mission Terminal Dashboard -->
	<div class="relative flex min-h-screen flex-col mi-grid-bg text-slate-100 crt-overlay">
		<!-- Subtle Ambient Cyber Light Beams -->
		<div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
			<div class="mi-laser-line animate-mi-laser top-[28%] opacity-45" style="--laser-angle: -6deg;"></div>
			<div class="mi-laser-line animate-mi-laser top-[72%] opacity-35" style="--laser-angle: 5deg; animation-delay: -3.5s;"></div>
		</div>

		<!-- Fixed / Sticky Header -->
		<Header onOpenAdmin={() => (isAdminModalOpen = true)} />

		<!-- Main Terminal Body -->
		<main class="relative z-10 mx-auto flex-1 w-full max-w-4xl px-3 py-4 sm:px-4 sm:py-6 pb-32">
			<!-- Grand Win Mission Banner (if all stations unlocked) -->
			{#if $gameStore.unlockedStationIds.length === stations.length}
				<div class="mb-5 hud-box mi-corners mi-corners-emerald overflow-hidden rounded-xl border border-emerald-400/70 bg-emerald-950/35 p-4 text-center shadow-[0_0_38px_rgba(16,185,129,0.28)]">
					<div class="flex flex-col items-center justify-center gap-1.5">
						<div class="flex items-center justify-center gap-2 text-emerald-300">
							<ShieldCheck size={22} class="text-emerald-400 drop-shadow-[0_0_10px_#10b981]" />
							<span
								class="font-glitch mi-glitch text-lg sm:text-xl tracking-[0.18em] text-emerald-300 text-glow-green uppercase"
								data-text="MISIÓN CUMPLIDA"
							>
								MISIÓN CUMPLIDA
							</span>
						</div>
						<p class="font-mono text-[11px] font-bold tracking-widest text-emerald-300/90 uppercase">
							SE VULNERARON TODAS LAS ESTACIONES DE SEGURIDAD
						</p>
					</div>
				</div>
			{/if}

			<!-- Station Interactive Responsive Grid -->
			<StationGrid {stations} />
		</main>

		<!-- Persistent Bottom Tactical Command Dock -->
		<nav class="fixed bottom-0 left-0 right-0 z-30 border-t border-blue-900/60 bg-gradient-to-t from-[#020510] via-[#040a1a]/95 to-[#040a1a]/85 px-4 pt-3 pb-4 backdrop-blur-md shadow-[0_-12px_35px_rgba(2,6,23,0.9)]">
			<div class="mx-auto flex max-w-md flex-col items-center gap-2.5">
				<button
					type="button"
					onclick={openQrScanner}
					class="btn-tactile mi-btn-primary font-tech flex w-full items-center justify-center gap-3 rounded-lg py-3.5 px-4 text-sm font-extrabold tracking-[0.18em] uppercase cursor-pointer"
				>
					<ScanLine size={20} class="text-sky-200" />
					<span>ESCANEAR QR</span>
				</button>

				<button
					class="inline-flex items-center gap-1.5 py-1 font-mono text-[11px] font-bold tracking-widest text-slate-400 uppercase hover:text-sky-300 transition cursor-pointer"
					type="button"
					onclick={() => (isManualModalOpen = true)}
				>
					<KeyRound size={12} />
					<span>ACCESO MANUAL</span>
				</button>
			</div>
		</nav>

		<!-- In-Page QR Optical Scanner Overlay -->
		<QRScanner
			isOpen={isQrScannerOpen}
			onClose={closeQrScanner}
			onStationDetected={handleQrStationDetected}
		/>

		<!-- Manual Station Input Modal -->
		<ManualStationModal
			isOpen={isManualModalOpen}
			onClose={() => (isManualModalOpen = false)}
			onStationSelect={openStationLock}
		/>

		<!-- Dynamic Lock Container Modal Frame -->
		<LockContainer
			isOpen={isLockModalOpen}
			station={activeStation}
			onClose={closeStationLock}
			onUnlockSuccess={handleUnlockSuccess}
		/>
	</div>
{/if}

<!-- Secret GM Admin Modal (accessible from both screens) -->
<AdminModal
	isOpen={isAdminModalOpen}
	onClose={() => (isAdminModalOpen = false)}
	onTriggerWinState={handleTriggerWinState}
/>
