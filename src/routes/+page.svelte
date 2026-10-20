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
	import { Camera } from '@lucide/svelte';

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

	function handleUnlockSuccess(station: StationDefinition) {
		audio.play('success');
	}

	function handleTriggerWinState() {
		hasCelebratedVictory = true;
		audio.play('victory');
		fireVictoryCelebration();
	}

</script>

<svelte:head>
	<title>ESCAPE ROOM</title>
</svelte:head>

{#if !$gameStore.gameStarted}
	<!-- Registration & Mission Start Screen -->
	<RegistrationPage />
{:else}
	<!-- Active Mission Terminal Dashboard -->
	<div class="flex min-h-screen flex-col bg-black text-neutral-100 crt-overlay">
		<!-- Fixed / Sticky Header -->
		<Header onOpenAdmin={() => (isAdminModalOpen = true)} />

		<!-- Main Terminal Body -->
		<main class="mx-auto flex-1 w-full max-w-4xl px-3 py-4 sm:px-4 sm:py-6 pb-24">
			<!-- Grand Win Mission Banner (if all 7 unlocked) -->
			{#if $gameStore.unlockedStationIds.length === stations.length}
				<div class="mb-5 hud-box overflow-hidden rounded-xl border-2 border-emerald-500 bg-emerald-950/40 p-4 text-center">
					<div class="flex items-center justify-center gap-2">
						<span class="text-xl">🏆</span>
						<span class="font-mono text-sm font-black tracking-widest text-emerald-300 text-glow-green">
							SE DESBLOQUEARON TODAS LAS ESTACIONES
						</span>
					</div>
				</div>
			{/if}

			<!-- 7-Station Interactive Responsive Grid -->
			<StationGrid {stations} />
		</main>

		<!-- Persistent Bottom CTA Bar -->
		<nav class="fixed bottom-0 left-0 right-0 z-30 p-3 backdrop-blur-md">
			<div class="flex flex-col items-center gap-3 mx-auto max-w-md">
				<button
					type="button"
					onclick={openQrScanner}
					class="flex w-full items-center justify-center gap-3 bg-amber-700/90 p-3 backdrop-blur-md font-mono font-bold text-amber-200 rounded cursor-pointer hover:bg-amber-600 transition" 
				>
					<Camera size={24} />
					<span>ESCANEAR QR</span>
				</button>

				<button 
					class="text-xs font-mono underline cursor-pointer text-neutral-300 hover:text-amber-300 transition"
					type="button"
					onclick={() => (isManualModalOpen = true)}
				>
					Accesso Manual
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
