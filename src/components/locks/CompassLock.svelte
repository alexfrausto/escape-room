<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import gsap from 'gsap';
	import { audio } from '../../services/audio';
	import { Lock, Unlock, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from '@lucide/svelte';

	interface Props {
		targetCode: string;
		isUnlocked?: boolean;
		isLockedOut?: boolean;
		onSubmit: (enteredCode: string) => void;
	}

	let { targetCode, isUnlocked = false, isLockedOut = false, onSubmit }: Props = $props();

	const MAX_STEPS = 5;

	// Recorded sequence of directions (A, B, I, D)
	let recordedSequence = $state<string[]>([]);

	// Flash state for the visualizer above
	let activeFlashDir = $state<'A' | 'B' | 'I' | 'D' | null>(null);
	let flashTimeout: ReturnType<typeof setTimeout> | null = null;
	let flashEl = $state<HTMLDivElement | null>(null);

	function triggerFlash(dir: 'A' | 'B' | 'I' | 'D') {
		activeFlashDir = dir;
		if (flashTimeout) clearTimeout(flashTimeout);

		// Animate the directional pulse
		if (flashEl) {
			gsap.killTweensOf(flashEl);
			gsap.fromTo(
				flashEl,
				{ scale: 0.75, opacity: 1 },
				{ scale: 1.15, opacity: 0.85, duration: 0.15, ease: 'power2.out', yoyo: true, repeat: 1 }
			);
		}

		flashTimeout = setTimeout(() => {
			activeFlashDir = null;
			flashTimeout = null;
		}, 320);
	}

	function pressDirection(dir: 'A' | 'B' | 'I' | 'D') {
		if (isLockedOut || isUnlocked) return;
		if (recordedSequence.length >= MAX_STEPS) return;

		recordedSequence = [...recordedSequence, dir];
		triggerFlash(dir);
		audio.play('click');
		audio.vibrate(25);
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isLockedOut || isUnlocked || recordedSequence.length === 0) return;

		// Serialize as: "A-D-D-B-I"
		const code = recordedSequence.join('-');
		onSubmit(code);
	}

	// On error lockout: instantly clear full code and reset to start over
	$effect(() => {
		if (isLockedOut) {
			untrack(() => {
				recordedSequence = [];
				activeFlashDir = null;
			});
		}
	});

	onMount(async () => {
		await tick();
		if (isUnlocked) {
			recordedSequence = ['A', 'D', 'D', 'B', 'I'];
		}
	});

	$effect(() => {
		if (isUnlocked) {
			untrack(() => {
				recordedSequence = ['A', 'D', 'D', 'B', 'I'];
			});
		}
	});
</script>

<div class="flex flex-col items-center select-none w-full max-w-md mx-auto">
	<!-- Industrial Enclosure (Neutral & Black) -->
	<div
		class="relative w-full rounded-3xl border border-neutral-800 bg-black p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
	>
		<!-- Status Header Bar (No Lock Type Names) -->
		<div class="flex items-center justify-between pb-3 px-1 text-xs font-mono font-bold">
			<div class="h-2 w-2 rounded-full border border-neutral-700 bg-neutral-900"></div>
			<div>
				{#if isUnlocked}
					<span class="inline-flex items-center gap-1 font-bold text-emerald-400">
						<Unlock size={13} />
						DESBLOQUEADO
					</span>
				{:else}
					<span class="inline-flex items-center gap-1 font-bold text-amber-500">
						<Lock size={13} />
						BLOQUEADO
					</span>
				{/if}
			</div>
			<div class="h-2 w-2 rounded-full border border-neutral-700 bg-neutral-900"></div>
		</div>

		<!-- UPPER AREA: Tactical Directional HUD (Flashes pressed direction, reveals NO code) -->
		<div
			class="relative flex flex-col items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 p-6 sm:p-7 shadow-inner overflow-hidden"
		>
			<!-- Ambient Radar Grid Background -->
			<div class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
				<div class="h-44 w-44 rounded-full border border-neutral-700"></div>
				<div class="absolute h-32 w-32 rounded-full border border-neutral-700 border-dashed"></div>
				<div class="absolute h-20 w-20 rounded-full border border-neutral-700"></div>
				<div class="absolute inset-x-8 top-1/2 h-[1px] bg-neutral-700"></div>
				<div class="absolute inset-y-8 left-1/2 w-[1px] bg-neutral-700"></div>
			</div>

			<!-- Dynamic Direction Flash Reticle (Center Target) -->
			<div
				bind:this={flashEl}
				class="relative z-10 flex h-28 w-28 items-center justify-center rounded-full border-2 transition-colors duration-150 {isUnlocked
					? 'border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_25px_rgba(34,197,94,0.4)]'
					: activeFlashDir
						? 'border-amber-400 bg-amber-950/40 shadow-[0_0_30px_rgba(245,158,11,0.5)]'
						: 'border-neutral-800 bg-black/80 shadow-inner'}"
			>
				{#if isUnlocked}
					<!-- Solved State: Steady Emerald Compass Cross -->
					<div class="flex flex-col items-center justify-center text-emerald-400">
						<span class="text-2xl font-black">✦</span>
					</div>
				{:else if activeFlashDir === 'A'}
					<!-- Flash ARRIBA -->
					<div class="text-amber-400 drop-shadow-[0_0_12px_#f59e0b] animate-bounce">
						<ArrowUp size={44} strokeWidth={3} />
					</div>
				{:else if activeFlashDir === 'B'}
					<!-- Flash ABAJO -->
					<div class="text-amber-400 drop-shadow-[0_0_12px_#f59e0b] animate-bounce">
						<ArrowDown size={44} strokeWidth={3} />
					</div>
				{:else if activeFlashDir === 'I'}
					<!-- Flash IZQUIERDA -->
					<div class="text-amber-400 drop-shadow-[0_0_12px_#f59e0b] animate-pulse">
						<ArrowLeft size={44} strokeWidth={3} />
					</div>
				{:else if activeFlashDir === 'D'}
					<!-- Flash DERECHA -->
					<div class="text-amber-400 drop-shadow-[0_0_12px_#f59e0b] animate-pulse">
						<ArrowRight size={44} strokeWidth={3} />
					</div>
				{:else}
					<!-- Idle Standby Reticle -->
					<div class="flex items-center justify-center">
						<div class="h-3 w-3 rounded-full border border-neutral-700 bg-neutral-900"></div>
					</div>
				{/if}
			</div>

			<!-- Sleek Minimal Progress Indicators (5 Anonymous Dots, No Code Shown) -->
			<div class="relative z-10 mt-5 flex items-center gap-2.5">
				{#each Array(MAX_STEPS) as _, i}
					{@const isEntered = recordedSequence.length > i}
					<div
						class="h-2 w-2 rounded-full border transition-all duration-200 {isUnlocked
							? 'border-emerald-400 bg-emerald-400 shadow-[0_0_8px_#22c55e]'
							: isEntered
								? 'border-amber-400 bg-amber-400 shadow-[0_0_8px_#f59e0b]'
								: 'border-neutral-800 bg-neutral-900 opacity-40'}"
					></div>
				{/each}
			</div>
		</div>

		<!-- BOTTOM AREA: The Tactical D-Pad Controller -->
		<div class="mt-4 flex flex-col items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5 shadow-inner">
			<div class="relative grid grid-cols-3 grid-rows-3 gap-2 w-52 h-52 items-center justify-center">
				<!-- Center Core Well -->
				<div class="col-start-2 row-start-2 flex items-center justify-center">
					<div class="h-12 w-12 rounded-full border-2 border-neutral-800 bg-black shadow-inner flex items-center justify-center">
						<div class="h-4 w-4 rounded-full border border-neutral-700 bg-neutral-900"></div>
					</div>
				</div>

				<!-- UP Button (Arriba - A) -->
				<button
					type="button"
					disabled={isLockedOut || isUnlocked || recordedSequence.length >= MAX_STEPS}
					onclick={() => pressDirection('A')}
					class="btn-tactile col-start-2 row-start-1 h-16 w-16 mx-auto flex items-center justify-center rounded-xl border border-neutral-700 bg-gradient-to-b from-neutral-800 to-neutral-900 text-neutral-200 shadow-lg hover:border-amber-500 hover:text-amber-300 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
					title="Arriba"
				>
					<ArrowUp size={28} strokeWidth={2.5} />
				</button>

				<!-- LEFT Button (Izquierda - I) -->
				<button
					type="button"
					disabled={isLockedOut || isUnlocked || recordedSequence.length >= MAX_STEPS}
					onclick={() => pressDirection('I')}
					class="btn-tactile col-start-1 row-start-2 h-16 w-16 mx-auto flex items-center justify-center rounded-xl border border-neutral-700 bg-gradient-to-r from-neutral-800 to-neutral-900 text-neutral-200 shadow-lg hover:border-amber-500 hover:text-amber-300 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
					title="Izquierda"
				>
					<ArrowLeft size={28} strokeWidth={2.5} />
				</button>

				<!-- RIGHT Button (Derecha - D) -->
				<button
					type="button"
					disabled={isLockedOut || isUnlocked || recordedSequence.length >= MAX_STEPS}
					onclick={() => pressDirection('D')}
					class="btn-tactile col-start-3 row-start-2 h-16 w-16 mx-auto flex items-center justify-center rounded-xl border border-neutral-700 bg-gradient-to-l from-neutral-800 to-neutral-900 text-neutral-200 shadow-lg hover:border-amber-500 hover:text-amber-300 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
					title="Derecha"
				>
					<ArrowRight size={28} strokeWidth={2.5} />
				</button>

				<!-- DOWN Button (Abajo - B) -->
				<button
					type="button"
					disabled={isLockedOut || isUnlocked || recordedSequence.length >= MAX_STEPS}
					onclick={() => pressDirection('B')}
					class="btn-tactile col-start-2 row-start-3 h-16 w-16 mx-auto flex items-center justify-center rounded-xl border border-neutral-700 bg-gradient-to-t from-neutral-800 to-neutral-900 text-neutral-200 shadow-lg hover:border-amber-500 hover:text-amber-300 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
					title="Abajo"
				>
					<ArrowDown size={28} strokeWidth={2.5} />
				</button>
			</div>
		</div>

		<!-- Unlock Submission Lever / Button -->
		<form onsubmit={handleFormSubmit} class="mt-4">
			<button
				type="submit"
				disabled={isLockedOut || isUnlocked || recordedSequence.length === 0}
				class="btn-tactile relative flex w-full items-center justify-center gap-2 rounded-xl border border-amber-600 bg-amber-700 py-4 font-mono text-sm sm:text-base font-black tracking-widest text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition hover:bg-amber-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
			>
				<span>🔓</span>
				<span>{isUnlocked ? 'DESBLOQUEADO' : 'DESBLOQUEAR'}</span>
			</button>
		</form>
	</div>
</div>
