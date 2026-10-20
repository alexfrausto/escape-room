<script lang="ts">
	import { onMount, onDestroy, tick, untrack } from 'svelte';
	import { audio } from '../../services/audio';
	import { Lock, Unlock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@lucide/svelte';

	interface Props {
		targetCode: string;
		isUnlocked?: boolean;
		isLockedOut?: boolean;
		onSubmit: (enteredCode: string) => void;
	}

	let { targetCode, isUnlocked = false, isLockedOut = false, onSubmit }: Props = $props();

	const MIN_FREQ = 88.0;
	const MAX_FREQ = 108.0;

	function getTargetFreq(): number {
		const parsed = parseFloat(targetCode.replace(/[^\d.]/g, ''));
		return isNaN(parsed) ? 104.5 : Math.max(MIN_FREQ, Math.min(MAX_FREQ, parsed));
	}

	let targetFreq = $derived(getTargetFreq());
	let currentFreq = $state<number>(92.0);
	let animPhase = $state<number>(0);
	let animFrame: number | null = null;
	let trackEl: HTMLDivElement | null = $state(null);
	let isDragging = $state<boolean>(false);

	function setFrequency(val: number, playAudio = true) {
		if (isLockedOut || isUnlocked) return;
		const clamped = Math.max(MIN_FREQ, Math.min(MAX_FREQ, Math.round(val * 10) / 10));
		if (clamped !== currentFreq) {
			currentFreq = clamped;
			if (playAudio) {
				audio.play('ratchet');
				audio.vibrate(8);
			}
		}
	}

	function stepFreq(amount: number) {
		if (isLockedOut || isUnlocked) return;
		setFrequency(currentFreq + amount);
	}

	function handlePointerDown(e: PointerEvent) {
		if (isLockedOut || isUnlocked || !trackEl) return;
		isDragging = true;
		updateFreqFromPointer(e);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging || isLockedOut || isUnlocked) return;
		updateFreqFromPointer(e);
	}

	function handlePointerUp() {
		isDragging = false;
	}

	function updateFreqFromPointer(e: PointerEvent) {
		if (!trackEl) return;
		const rect = trackEl.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		const newFreq = MIN_FREQ + ratio * (MAX_FREQ - MIN_FREQ);
		setFrequency(newFreq);
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isLockedOut || isUnlocked) return;

		onSubmit(currentFreq.toFixed(1));
	}

	// Dynamic Oscilloscope Waveform Generator
	// Shows the tuned frequency's wave density (more cycles as frequency increases)
	// Zero proximity hints to prevent brute-forcing!
	const WAVE_WIDTH = 300;
	const WAVE_HEIGHT = 90;
	const CENTER_Y = WAVE_HEIGHT / 2;

	let wavePath = $derived.by(() => {
		const points: string[] = [];
		const steps = 70;
		const stepX = WAVE_WIDTH / steps;

		// Frequency scales wave density smoothly from ~3 cycles at 88MHz to ~6.5 cycles at 108MHz
		const freqRatio = (currentFreq - MIN_FREQ) / (MAX_FREQ - MIN_FREQ);
		const cycles = 3.2 + freqRatio * 3.6;
		const amp = 22;

		for (let i = 0; i <= steps; i++) {
			const x = i * stepX;
			const rad = (x / WAVE_WIDTH) * Math.PI * 2 * cycles + animPhase;

			let y = CENTER_Y + Math.sin(rad) * amp;

			if (isLockedOut) {
				// Erratic glitch static when locked out
				y += Math.sin(rad * 4.7 + animPhase * 3) * 14 + Math.sin(i * 9) * 6;
			}

			points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
		}

		return points.join(' ');
	});

	function animate() {
		animPhase += isUnlocked ? 0.08 : 0.14;
		animFrame = requestAnimationFrame(animate);
	}

	onMount(async () => {
		await tick();
		animFrame = requestAnimationFrame(animate);
		if (isUnlocked) {
			currentFreq = targetFreq;
		}
	});

	onDestroy(() => {
		if (animFrame) cancelAnimationFrame(animFrame);
	});

	// Reset frequency on lockout error
	$effect(() => {
		if (isLockedOut) {
			untrack(() => {
				currentFreq = MIN_FREQ;
			});
		}
	});

	$effect(() => {
		if (isUnlocked) {
			untrack(() => {
				currentFreq = targetFreq;
			});
		}
	});

	const needlePercentage = $derived(
		((currentFreq - MIN_FREQ) / (MAX_FREQ - MIN_FREQ)) * 100
	);
</script>

<div class="flex flex-col items-center select-none w-full max-w-md mx-auto">
	<!-- Clean Tactical Housing (Neutral & Black) -->
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

		<!-- Oscilloscope Phosphor Display Monitor -->
		<div
			class="relative flex flex-col justify-between h-36 sm:h-40 rounded-2xl border-2 border-neutral-800 bg-black p-3 sm:p-4 shadow-[inset_0_0_30px_rgba(0,0,0,0.95)] overflow-hidden font-mono"
		>
			<!-- CRT Scanlines & Radial Phosphor Vignette -->
			<div
				class="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] opacity-75"
			></div>
			<div
				class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.9)_100%)]"
			></div>

			<!-- Oscilloscope Top Status Header -->
			<div class="relative z-10 flex items-center justify-between text-[11px] font-bold text-neutral-500">
				<span>OSC//SIGNAL</span>
				<div class="flex items-center gap-1.5 font-bold">
					<span class="h-1.5 w-1.5 rounded-full {isUnlocked ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : isLockedOut ? 'bg-rose-500 shadow-[0_0_8px_#ef4444]' : 'bg-amber-500 animate-pulse'}"></span>
					<span class="{isUnlocked ? 'text-emerald-400' : isLockedOut ? 'text-rose-500' : 'text-neutral-400'} font-black text-[10px]">
						{isUnlocked ? 'SINTONIZADO' : isLockedOut ? 'ERROR SEÑAL' : 'SEÑAL EN VIVO'}
					</span>
				</div>
			</div>

			<!-- Live Waveform Canvas -->
			<div class="relative z-10 my-auto flex items-center justify-center w-full">
				<svg
					viewBox="0 0 300 90"
					class="w-full h-20 sm:h-22"
				>
					<!-- Center Reference Axis -->
					<line x1="0" y1="45" x2="300" y2="45" stroke="#262626" stroke-width="1" stroke-dasharray="3,3" />

					<!-- Glow Blur Path -->
					<path
						d={wavePath}
						fill="none"
						stroke={isUnlocked ? '#10b981' : isLockedOut ? '#ef4444' : '#f59e0b'}
						stroke-width="5"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="opacity-40 blur-[2px]"
					/>

					<!-- Sharp Foreground Wave Line -->
					<path
						d={wavePath}
						fill="none"
						stroke={isUnlocked ? '#34d399' : isLockedOut ? '#f87171' : '#fbbf24'}
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>

			<!-- Live Tuned Frequency Readout -->
			<div class="relative z-10 flex items-center justify-between text-[11px] font-mono font-bold text-neutral-400">
				<span>BAND: FM-VHF</span>
				<span class="text-base sm:text-lg font-black tracking-wider {isUnlocked ? 'text-emerald-400' : isLockedOut ? 'text-rose-400' : 'text-amber-400'}">
					{currentFreq.toFixed(1)} <span class="text-xs text-neutral-500">MHz</span>
				</span>
			</div>
		</div>

		<!-- Horizontal Radio Frequency Tuning Dial -->
		<div class="mt-4 flex flex-col gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-3 sm:p-4 shadow-inner">
			<!-- Glass Tuning Scale Track -->
			<div
				role="slider"
				tabindex="0"
				aria-valuenow={currentFreq}
				aria-valuemin={MIN_FREQ}
				aria-valuemax={MAX_FREQ}
				aria-label="Sintonizador de frecuencia"
				bind:this={trackEl}
				onpointerdown={handlePointerDown}
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
				onpointercancel={handlePointerUp}
				class="relative h-18 sm:h-20 w-full cursor-ew-resize rounded-xl border border-neutral-800 bg-black p-2 shadow-inner transition hover:border-neutral-700 outline-none touch-none select-none overflow-hidden"
			>
				<!-- Scale Graduations & Labels (88, 92, 96, 100, 104, 108) -->
				<div class="pointer-events-none absolute inset-x-3 top-2 flex justify-between font-mono text-[10px] font-bold text-neutral-500">
					<span>88</span>
					<span>92</span>
					<span>96</span>
					<span>100</span>
					<span>104</span>
					<span>108</span>
				</div>

				<!-- Subtle Ticks -->
				<div class="pointer-events-none absolute inset-x-3 top-7 flex justify-between">
					{#each Array(21) as _, i}
						{@const isMajor = i % 4 === 0}
						<div
							class="w-[1px] bg-neutral-800 {isMajor ? 'h-5 bg-neutral-600' : 'h-2.5'}"
						></div>
					{/each}
				</div>

				<!-- Amber Tuning Needle -->
				<div
					class="pointer-events-none absolute top-1 bottom-1 w-1 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.8)] transition-all duration-75 {isUnlocked ? 'bg-emerald-400 shadow-[0_0_15px_#34d399]' : isLockedOut ? 'bg-rose-500' : 'bg-amber-400'}"
					style="left: calc({needlePercentage}% - 2px);"
				>
					<div class="h-2 w-2 rounded-full -ml-[2px] mt-0.5 {isUnlocked ? 'bg-emerald-300' : isLockedOut ? 'bg-rose-400' : 'bg-amber-300'}"></div>
				</div>
			</div>

			<!-- Fine Tuning Step Buttons -->
			<div class="grid grid-cols-4 gap-1.5 sm:gap-2 pt-1">
				<button
					type="button"
					disabled={isLockedOut || isUnlocked || currentFreq <= MIN_FREQ}
					onclick={() => stepFreq(-1.0)}
					class="btn-tactile flex items-center justify-center gap-0.5 h-10 rounded-lg border border-neutral-800 bg-neutral-900 font-mono text-xs font-bold text-neutral-300 hover:border-amber-500 hover:text-amber-300 hover:bg-neutral-850 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition"
					title="Bajar 1.0 MHz"
				>
					<ChevronsLeft size={16} />
					<span>1.0</span>
				</button>

				<button
					type="button"
					disabled={isLockedOut || isUnlocked || currentFreq <= MIN_FREQ}
					onclick={() => stepFreq(-0.1)}
					class="btn-tactile flex items-center justify-center gap-0.5 h-10 rounded-lg border border-neutral-800 bg-neutral-900 font-mono text-xs font-bold text-neutral-300 hover:border-amber-500 hover:text-amber-300 hover:bg-neutral-850 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition"
					title="Bajar 0.1 MHz"
				>
					<ChevronLeft size={16} />
					<span>0.1</span>
				</button>

				<button
					type="button"
					disabled={isLockedOut || isUnlocked || currentFreq >= MAX_FREQ}
					onclick={() => stepFreq(0.1)}
					class="btn-tactile flex items-center justify-center gap-0.5 h-10 rounded-lg border border-neutral-800 bg-neutral-900 font-mono text-xs font-bold text-neutral-300 hover:border-amber-500 hover:text-amber-300 hover:bg-neutral-850 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition"
					title="Subir 0.1 MHz"
				>
					<span>0.1</span>
					<ChevronRight size={16} />
				</button>

				<button
					type="button"
					disabled={isLockedOut || isUnlocked || currentFreq >= MAX_FREQ}
					onclick={() => stepFreq(1.0)}
					class="btn-tactile flex items-center justify-center gap-0.5 h-10 rounded-lg border border-neutral-800 bg-neutral-900 font-mono text-xs font-bold text-neutral-300 hover:border-amber-500 hover:text-amber-300 hover:bg-neutral-850 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition"
					title="Subir 1.0 MHz"
				>
					<span>1.0</span>
					<ChevronsRight size={16} />
				</button>
			</div>
		</div>

		<!-- Unlock Submission Lever / Button -->
		<form onsubmit={handleFormSubmit} class="mt-4">
			<button
				type="submit"
				disabled={isLockedOut || isUnlocked}
				class="btn-tactile relative flex w-full items-center justify-center gap-2 rounded-xl border font-mono text-sm sm:text-base font-black tracking-widest shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed cursor-pointer {isUnlocked
					? 'border-emerald-600 bg-emerald-700 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
					: 'border-amber-600 bg-amber-700 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:bg-amber-600 disabled:opacity-40'}"
			>
				<span>🔓</span>
				<span>{isUnlocked ? 'DESBLOQUEADO' : 'DESBLOQUEAR'}</span>
			</button>
		</form>
	</div>
</div>