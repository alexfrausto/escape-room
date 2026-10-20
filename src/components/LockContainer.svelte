<script lang="ts">
	import { onDestroy } from 'svelte';
	import gsap from 'gsap';
	import type { StationDefinition } from '../types';
	import { verifyStationCode, getAllStations } from '../services/verifier';
	import { gameStore } from '../services/storage';
	import { audio } from '../services/audio';
	import { fireUnlockConfetti } from '../services/confetti';
	import { getLockInstruction } from '../config/instructions';
	import TumblerLock from './locks/TumblerLock.svelte';
	import CryptexLock from './locks/CryptexLock.svelte';
	import SafeDialLock from './locks/SafeDialLock.svelte';
	import BreakerLock from './locks/BreakerLock.svelte';
	import CompassLock from './locks/CompassLock.svelte';
	import SlidersLock from './locks/SlidersLock.svelte';
	import TerminalLock from './locks/TerminalLock.svelte';
	import PatternLock from './locks/PatternLock.svelte';
	import PatchbayLock from './locks/PatchbayLock.svelte';
	import FrequencyLock from './locks/FrequencyLock.svelte';
	import PianoLock from './locks/PianoLock.svelte';

	interface Props {
		isOpen: boolean;
		station: StationDefinition | null;
		onClose: () => void;
		onUnlockSuccess: (station: StationDefinition) => void;
	}

	let { isOpen, station, onClose, onUnlockSuccess }: Props = $props();

	const allStations = getAllStations();
	const stationIndex = $derived(
		station ? allStations.findIndex((s) => s.id === station.id) + 1 : 1
	);

	let containerEl: HTMLElement | null = $state(null);
	let fallbackInput = $state<string>('');
	let isLockedOut = $state<boolean>(false);
	let lockoutSeconds = $state<number>(3);
	let lockoutInterval: ReturnType<typeof setInterval> | null = null;
	let errorMessage = $state<string | null>(null);

	function triggerShake() {
		if (!containerEl) return;
		gsap.fromTo(
			containerEl,
			{ x: -12 },
			{
				x: 12,
				duration: 0.05,
				repeat: 5,
				yoyo: true,
				ease: 'power2.inOut',
				onComplete: () => {
					if (containerEl) gsap.set(containerEl, { x: 0 });
				}
			}
		);
	}

	function startLockout() {
		isLockedOut = true;
		lockoutSeconds = 3;
		if (lockoutInterval) clearInterval(lockoutInterval);

		lockoutInterval = setInterval(() => {
			lockoutSeconds -= 1;
			if (lockoutSeconds <= 0) {
				if (lockoutInterval) clearInterval(lockoutInterval);
				lockoutInterval = null;
				isLockedOut = false;
				errorMessage = null;
			}
		}, 1000);
	}

	function handleCodeAttempt(code: string) {
		if (!station || isLockedOut) return;

		const result = verifyStationCode(station.id, code);

		if (result.success) {
			audio.play('clunk');
			audio.play('success');
			fireUnlockConfetti();
			gameStore.unlockStation(station.id);
			errorMessage = null;
			fallbackInput = '';
			onUnlockSuccess(station);
			setTimeout(() => {
				onClose();
			}, 700);
		} else {
			audio.play('error');
			errorMessage = `CÓDIGO INCORRECTO`;
			triggerShake();
			startLockout();
		}
	}

	function handleFallbackSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!fallbackInput.trim()) return;
		handleCodeAttempt(fallbackInput.trim());
	}

	function handleClose() {
		audio.play('click');
		fallbackInput = '';
		errorMessage = null;
		if (lockoutInterval) {
			clearInterval(lockoutInterval);
			lockoutInterval = null;
		}
		isLockedOut = false;
		onClose();
	}

	onDestroy(() => {
		if (lockoutInterval) clearInterval(lockoutInterval);
	});

	$effect(() => {
		if (isOpen && station) {
			if ($gameStore.unlockedStationIds.includes(station.id)) {
				fallbackInput = station.code;
			} else {
				fallbackInput = '';
			}
		}
	});
</script>

{#if isOpen && station}
	{@const isAlreadyUnlocked = $gameStore.unlockedStationIds.includes(station.id)}
	<div
		role="dialog"
		aria-modal="true"
		class="fixed inset-0 z-50 flex flex-col bg-black text-neutral-100 overflow-y-auto"
	>
		<!-- Fullscreen Top Header Bar -->
		<header class="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-800 bg-neutral-950/95 px-4 py-3.5 backdrop-blur-md">
			<div class="flex items-center gap-2.5">
				<div class="h-2.5 w-2.5 rounded-full {isAlreadyUnlocked ? 'bg-emerald-400 shadow-[0_0_8px_#22c55e]' : 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'}"></div>
				<span class="font-mono text-sm font-bold tracking-widest text-neutral-200 uppercase">
					ESTACIÓN 0{stationIndex}
				</span>
			</div>
			<button
				type="button"
				class="rounded-lg border border-neutral-800 bg-neutral-900 px-3.5 py-1.5 font-mono text-xs font-bold text-neutral-300 hover:border-neutral-700 hover:text-white transition cursor-pointer"
				onclick={handleClose}
			>
				[ ✕ CERRAR ]
			</button>
		</header>

		<!-- Fullscreen Main Content Container (Centered Vertically and Horizontally) -->
		<main
			bind:this={containerEl}
			class="mx-auto flex flex-1 w-full max-w-lg flex-col justify-center px-4 py-6 space-y-4 my-auto"
		>
			<!-- Instruction Header (Mapped by Lock Type in Spanish) -->
			<div class="rounded-xl border border-neutral-800 bg-neutral-950 p-3.5 text-center shadow-inner">
				<p class="font-mono text-xs sm:text-sm font-semibold text-neutral-300 leading-relaxed">
					{station.instruction || getLockInstruction(station.type)}
				</p>
			</div>

			<!-- Lockout Warning Alert if active -->
			{#if isLockedOut}
				<div class="rounded-xl border border-rose-500/80 bg-rose-950/40 px-4 py-3 text-center font-mono text-xs font-bold text-rose-300 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]">
					⚠️ CÓDIGO INCORRECTO {lockoutSeconds}s
				</div>
			{:else if errorMessage}
				<div class="rounded-xl border border-rose-500/40 bg-rose-950/20 px-4 py-2.5 text-center font-mono text-xs font-semibold text-rose-400">
					{errorMessage}
				</div>
			{/if}

			<!-- Lock presentation based on station.type -->
			{#if station.type === 'tumbler' || station.type === '1'}
				<TumblerLock
					targetCode={station.code}
					isUnlocked={isAlreadyUnlocked}
					{isLockedOut}
					onSubmit={handleCodeAttempt}
				/>
			{:else if station.type === 'cryptex' || station.type === '2'}
				<CryptexLock
					targetCode={station.code}
					isUnlocked={isAlreadyUnlocked}
					{isLockedOut}
					onSubmit={handleCodeAttempt}
				/>
			{:else if station.type === 'safedial' || station.type === '3'}
				<SafeDialLock
					targetCode={station.code}
					isUnlocked={isAlreadyUnlocked}
					{isLockedOut}
					onSubmit={handleCodeAttempt}
				/>
			{:else if station.type === 'breaker' || station.type === '4'}
				<BreakerLock
					targetCode={station.code}
					isUnlocked={isAlreadyUnlocked}
					{isLockedOut}
					onSubmit={handleCodeAttempt}
				/>
			{:else if station.type === 'compass' || station.type === '5'}
				<CompassLock
					targetCode={station.code}
					isUnlocked={isAlreadyUnlocked}
					{isLockedOut}
					onSubmit={handleCodeAttempt}
				/>
			{:else if station.type === 'sliders' || station.type === '6'}
				<SlidersLock
					targetCode={station.code}
					isUnlocked={isAlreadyUnlocked}
					{isLockedOut}
					onSubmit={handleCodeAttempt}
				/>
			{:else if station.type === 'terminal' || station.type === '7'}
				<TerminalLock
					targetCode={station.code}
					isUnlocked={isAlreadyUnlocked}
					{isLockedOut}
					onSubmit={handleCodeAttempt}
				/>
			{:else if station.type === 'pattern' || station.type === '8'}
				<PatternLock
					targetCode={station.code}
					isUnlocked={isAlreadyUnlocked}
					{isLockedOut}
					onSubmit={handleCodeAttempt}
				/>
			{:else if station.type === 'patchbay' || station.type === '9'}
				<PatchbayLock
					targetCode={station.code}
					isUnlocked={isAlreadyUnlocked}
					{isLockedOut}
					onSubmit={handleCodeAttempt}
				/>
			{:else if station.type === 'frequency' || station.type === '10'}
				<FrequencyLock
					targetCode={station.code}
					isUnlocked={isAlreadyUnlocked}
					{isLockedOut}
					onSubmit={handleCodeAttempt}
				/>
			{:else if station.type === 'piano' || station.type === '11'}
				<PianoLock
					targetCode={station.code}
					isUnlocked={isAlreadyUnlocked}
					{isLockedOut}
					onSubmit={handleCodeAttempt}
				/>
			{:else}
				<!-- Placeholder for other locks without revealing internal lock type to user -->
				<div class="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-center space-y-4 shadow-[0_15px_35px_rgba(0,0,0,0.85)]">
					<div class="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-neutral-800 bg-black text-3xl shadow-inner">
						🔒
					</div>
					<p class="font-mono text-xs text-neutral-400">
						Ingresa el código para desbloquear la estación:
					</p>

					<!-- Code entry for testing remaining stations -->
					<form onsubmit={handleFallbackSubmit} class="pt-2 space-y-2.5 max-w-xs mx-auto">
						<input
							type="text"
							bind:value={fallbackInput}
							disabled={isLockedOut || isAlreadyUnlocked}
							placeholder="Código"
							class="w-full rounded-lg border border-neutral-700 bg-black px-3.5 py-2.5 font-mono text-xs text-neutral-100 text-center uppercase tracking-wider focus:border-amber-500 focus:outline-none"
						/>
						<button
							type="submit"
							disabled={isLockedOut || isAlreadyUnlocked || !fallbackInput.trim()}
							class="w-full rounded-xl border border-amber-600 bg-amber-700 py-3 font-mono text-xs font-bold text-amber-100 hover:bg-amber-600 disabled:opacity-40 transition cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.25)]"
						>
							VERIFICAR CÓDIGO
						</button>
					</form>
				</div>
			{/if}
		</main>
	</div>
{/if}
