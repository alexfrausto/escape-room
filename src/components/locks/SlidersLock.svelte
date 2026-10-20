<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import gsap from 'gsap';
	import { audio } from '../../services/audio';
	import { Lock, Unlock, ChevronUp, ChevronDown } from '@lucide/svelte';

	interface Props {
		targetCode: string;
		isUnlocked?: boolean;
		isLockedOut?: boolean;
		onSubmit: (enteredCode: string) => void;
	}

	let { targetCode, isUnlocked = false, isLockedOut = false, onSubmit }: Props = $props();

	const MIN_VAL = 0;
	const MAX_VAL = 9;
	const TOTAL_STEPS = MAX_VAL - MIN_VAL; // 9

	function getTargetValues(): number[] {
		if (targetCode) {
			const parts = targetCode.split('-').map((s) => parseInt(s.trim(), 10));
			if (parts.length >= 3 && parts.every((n) => !isNaN(n))) {
				return parts.slice(0, 3);
			}
		}
		return [2, 5, 3];
	}

	// 3 slider values (0 to 9)
	let values = $state<number[]>([0, 0, 0]);

	// Dragging state per slider
	let trackRefs: (HTMLDivElement | null)[] = [null, null, null];
	let isDragging = [false, false, false];

	function setSliderValue(index: number, val: number, playSound = true) {
		if (isLockedOut || isUnlocked) return;
		const clamped = Math.min(MAX_VAL, Math.max(MIN_VAL, Math.round(val)));
		if (clamped !== values[index]) {
			values[index] = clamped;
			if (playSound) {
				audio.play('click');
				audio.vibrate(10);
			}
		}
	}

	function stepSlider(index: number, direction: 1 | -1) {
		if (isLockedOut || isUnlocked) return;
		setSliderValue(index, values[index] + direction, true);
	}

	function handlePointerDown(index: number, e: PointerEvent) {
		if (isLockedOut || isUnlocked) return;
		isDragging[index] = true;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		updateValueFromPointer(index, e);
	}

	function handlePointerMove(index: number, e: PointerEvent) {
		if (!isDragging[index]) return;
		updateValueFromPointer(index, e);
	}

	function handlePointerUp(index: number) {
		isDragging[index] = false;
	}

	function updateValueFromPointer(index: number, e: PointerEvent) {
		const track = trackRefs[index];
		if (!track) return;

		const rect = track.getBoundingClientRect();
		// 0 at bottom, 9 at top
		const relY = rect.bottom - e.clientY;
		const ratio = Math.max(0, Math.min(1, relY / rect.height));
		const calculatedVal = Math.round(ratio * TOTAL_STEPS);
		setSliderValue(index, calculatedVal, true);
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isLockedOut || isUnlocked) return;

		// Serialize as: "2-5-3"
		const code = values.join('-');
		onSubmit(code);
	}

	onMount(async () => {
		await tick();
		if (isUnlocked) {
			values = getTargetValues();
		}
	});

	$effect(() => {
		if (isUnlocked) {
			untrack(() => {
				values = getTargetValues();
			});
		}
	});
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

		<!-- 3 Vertical Industrial Sliders Container -->
		<div class="relative rounded-2xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5 shadow-inner">
			<div class="grid grid-cols-3 gap-3 sm:gap-4">
				{#each values as val, i}
					{@const percentage = (val / TOTAL_STEPS) * 100}
					<div class="flex flex-col items-center">
						<!-- Up Button (+1 step) -->
						<button
							type="button"
							disabled={isLockedOut || isUnlocked || val >= MAX_VAL}
							onclick={() => stepSlider(i, 1)}
							title="Subir nivel"
							class="btn-tactile mb-2 flex h-9 w-full items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 shadow transition hover:border-amber-500/60 hover:text-amber-300 hover:bg-neutral-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
						>
							<ChevronUp size={20} />
						</button>

						<!-- Vertical Slider Track Channel -->
						<div
							role="slider"
							tabindex="0"
							aria-valuenow={val}
							aria-valuemin={MIN_VAL}
							aria-valuemax={MAX_VAL}
							aria-label={`Control deslizante ${i + 1}`}
							bind:this={trackRefs[i]}
							onpointerdown={(e) => handlePointerDown(i, e)}
							onpointermove={(e) => handlePointerMove(i, e)}
							onpointerup={() => handlePointerUp(i)}
							onpointercancel={() => handlePointerUp(i)}
							class="relative flex h-56 sm:h-60 w-full cursor-pointer flex-col items-center justify-between rounded-xl border border-neutral-800 bg-black p-2.5 shadow-inner transition hover:border-neutral-700 outline-none touch-none select-none {isUnlocked ? 'border-emerald-500/40' : ''}"
						>
							<!-- Background Notched Graduations (Ticks 0 to 9) -->
							<div class="pointer-events-none absolute inset-y-3.5 left-2.5 right-2.5 flex flex-col justify-between">
								{#each Array(10) as _, tickIdx}
									{@const tickNum = MAX_VAL - tickIdx}
									{@const isCurrent = tickNum === val}
									<div class="flex items-center justify-between w-full">
										<span class="font-mono text-[9px] font-bold {isCurrent ? (isUnlocked ? 'text-emerald-400' : 'text-amber-400') : 'text-neutral-600'}">
											{tickNum}
										</span>
										<div class="h-[1px] w-3 {isCurrent ? (isUnlocked ? 'bg-emerald-400 shadow-[0_0_6px_#22c55e]' : 'bg-amber-400 shadow-[0_0_6px_#f59e0b]') : 'bg-neutral-800'}"></div>
										<span class="font-mono text-[9px] font-bold {isCurrent ? (isUnlocked ? 'text-emerald-400' : 'text-amber-400') : 'text-neutral-600'}">
											{tickNum}
										</span>
									</div>
								{/each}
							</div>

							<!-- Vertical Center Groove -->
							<div class="pointer-events-none absolute inset-y-3 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-neutral-900 border border-neutral-800"></div>

							<!-- Active Illuminated Fill Bar -->
							<div
								style="height: {percentage}%;"
								class="pointer-events-none absolute bottom-3 left-1/2 w-1 -translate-x-1/2 rounded-full transition-all duration-75 {isUnlocked
									? 'bg-emerald-400 shadow-[0_0_8px_#22c55e]'
									: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'}"
							></div>

							<!-- Heavy Metallic Fader Thumb -->
							<div
								style="bottom: calc({percentage}% - 14px);"
								class="pointer-events-none absolute left-1.5 right-1.5 h-7 rounded-lg border transition-all duration-75 ease-out shadow-xl flex items-center justify-center {isUnlocked
									? 'border-emerald-500 bg-gradient-to-b from-neutral-200 via-neutral-300 to-neutral-400 shadow-[0_0_12px_rgba(34,197,94,0.4)]'
									: 'border-neutral-600 bg-gradient-to-b from-neutral-200 via-neutral-300 to-neutral-400 shadow-[0_4px_12px_rgba(0,0,0,0.9)]'}"
							>
								<!-- Center Index Line -->
								<div class="h-[2px] w-full {isUnlocked ? 'bg-emerald-600' : 'bg-amber-600'}"></div>
							</div>
						</div>

						<!-- Down Button (-1 step) -->
						<button
							type="button"
							disabled={isLockedOut || isUnlocked || val <= MIN_VAL}
							onclick={() => stepSlider(i, -1)}
							title="Bajar nivel"
							class="btn-tactile mt-2 flex h-9 w-full items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 shadow transition hover:border-amber-500/60 hover:text-amber-300 hover:bg-neutral-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
						>
							<ChevronDown size={20} />
						</button>
					</div>
				{/each}
			</div>
		</div>

		<!-- Unlock Submission Lever / Button -->
		<form onsubmit={handleFormSubmit} class="mt-4">
			<button
				type="submit"
				disabled={isLockedOut || isUnlocked}
				class="btn-tactile relative flex w-full items-center justify-center gap-2 rounded-xl border border-amber-600 bg-amber-700 py-4 font-mono text-sm sm:text-base font-black tracking-widest text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition hover:bg-amber-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
			>
				<span>🔓</span>
				<span>{isUnlocked ? 'DESBLOQUEADO' : 'DESBLOQUEAR'}</span>
			</button>
		</form>
	</div>
</div>
