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
	import RotorsLock from './locks/RotorsLock.svelte';
	import GlyphsLock from './locks/GlyphsLock.svelte';

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
			}, 950);
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
	{@const stationNum = String(stationIndex).padStart(2, '0')}
	<div
		role="dialog"
		aria-modal="true"
		class="fixed inset-0 z-50 flex flex-col mi-grid-bg text-neutral-100 overflow-y-auto"
	>
		<!-- Fullscreen Top Header Bar -->
		<header class="sticky top-0 z-30 flex items-center justify-between border-b border-blue-900/60 bg-[#030714]/95 px-4 py-3.5 backdrop-blur-md shadow-[0_8px_25px_rgba(2,6,23,0.8)]">
			<div class="flex items-center gap-2.5">
				<div
					class="h-2.5 w-2.5 rounded-full {isAlreadyUnlocked
						? 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
						: 'animate-pulse bg-sky-400 shadow-[0_0_10px_#38bdf8]'}"
				></div>
				<span class="font-tech text-xs sm:text-sm font-extrabold tracking-[0.16em] text-sky-100 uppercase">
					OBJETIVO {stationNum} <span class="text-sky-400">//</span> ESTACIÓN {stationNum}
				</span>
			</div>
			<button
				type="button"
				class="btn-tactile rounded-md border border-blue-800/80 bg-blue-950/60 px-3.5 py-1.5 font-mono text-xs font-bold text-slate-200 hover:border-sky-400/70 hover:text-white cursor-pointer"
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
			<div class="hud-box mi-corners {isAlreadyUnlocked ? 'mi-corners-emerald border-emerald-500/45' : 'border-blue-500/40'} rounded-xl border p-3.5 text-center shadow-inner">
				<div class="mb-1 font-mono text-[10px] font-bold tracking-[0.2em] uppercase {isAlreadyUnlocked ? 'text-emerald-400' : 'text-sky-400'}">
					{isAlreadyUnlocked ? 'SISTEMA VULNERADO' : 'DIRECTIVA DE CAMPO'}
				</div>
				<p class="font-mono text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
					{station.instruction || getLockInstruction(station.type)}
				</p>
			</div>

			<!-- Lockout Warning Alert if active -->
			{#if isLockedOut}
				<div class="rounded-xl border border-red-500/80 bg-red-950/50 px-4 py-3 text-center font-mono text-xs font-black tracking-widest text-red-200 text-glow-crimson animate-pulse shadow-[0_0_24px_rgba(239,68,68,0.38)] uppercase">
					⚠️ ALERTA DE SEGURIDAD // CÓDIGO INCORRECTO ({lockoutSeconds}s)
				</div>
			{:else if errorMessage}
				<div class="rounded-xl border border-red-500/50 bg-red-950/30 px-4 py-2.5 text-center font-mono text-xs font-bold text-red-300">
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
			{:else if station.type === 'glyphs' || station.type === 'relics' || station.type === 'altar' || station.type === 'rotors' || station.type === '12'}
				<GlyphsLock
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
							class="btn-tactile mi-btn-primary w-full rounded-xl py-3 font-mono text-xs font-black tracking-widest uppercase disabled:opacity-40 cursor-pointer"
						>
							VERIFICAR CÓDIGO
						</button>
					</form>
				</div>
			{/if}
		</main>
	</div>
{/if}
