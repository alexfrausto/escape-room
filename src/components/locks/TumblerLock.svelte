<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import gsap from 'gsap';
	import { audio } from '../../services/audio';
	import { ChevronUp, ChevronDown, Unlock, Lock } from '@lucide/svelte';

	interface Props {
		targetCode: string;
		isUnlocked?: boolean;
		isLockedOut?: boolean;
		onSubmit: (enteredCode: string) => void;
	}

	let { targetCode, isUnlocked = false, isLockedOut = false, onSubmit }: Props = $props();

	function getTargetDigits(): number[] {
		if (targetCode) {
			const parsed = targetCode
				.replace(/\D/g, '')
				.split('')
				.map((d) => parseInt(d, 10))
				.filter((n) => !isNaN(n));
			if (parsed.length >= 4) {
				return parsed.slice(0, 4);
			}
		}
		return [0, 0, 0, 0];
	}

	// 4 digits state [0-9]
	let digits = $state<number[]>([0, 0, 0, 0]);

	// Item height in pixels for each digit row
	const ITEM_HEIGHT = 56;
	// Viewport height: 148px shows 1 center number (56px) fully centered, and 2 partially visible (46px each)
	const VIEWPORT_HEIGHT = 148;
	// Total items = 50 (0..9 repeated 5 times; middle range is index 20..29)
	const MIDDLE_OFFSET = 20;

	// References to reel elements for each of the 4 cylinders
	let reelRefs: (HTMLDivElement | null)[] = [null, null, null, null];
	let isAnimating: boolean[] = [false, false, false, false];

	// Pointer drag & velocity tracking per cylinder
	let dragStartY: number[] = [0, 0, 0, 0];
	let dragStartReelY: number[] = [0, 0, 0, 0];
	let lastPointerY: number[] = [0, 0, 0, 0];
	let lastPointerTime: number[] = [0, 0, 0, 0];
	let lastVelocity: number[] = [0, 0, 0, 0];
	let isDragging: boolean[] = [false, false, false, false];

	// Wheel accumulation for smooth momentum on mousewheel/trackpad
	let wheelTimeout: (ReturnType<typeof setTimeout> | null)[] = [null, null, null, null];
	let wheelAccumulator: number[] = [0, 0, 0, 0];

	function getTargetY(val: number): number {
		return -(MIDDLE_OFFSET + val) * ITEM_HEIGHT;
	}

	function setReelPosition(index: number, val: number, immediate = false) {
		const reel = reelRefs[index];
		if (!reel) return;

		const targetY = getTargetY(val);
		if (immediate) {
			gsap.killTweensOf(reel);
			gsap.set(reel, { y: targetY });
		} else {
			gsap.to(reel, {
				y: targetY,
				duration: 0.22,
				ease: 'back.out(1.2)'
			});
		}
	}

	/**
	 * Spin the cylinder with momentum based on distance and velocity.
	 * Can advance by multiple steps in either direction with realistic deceleration.
	 */
	function spinWithMomentum(index: number, steps: number) {
		if (isLockedOut || isUnlocked) return;
		if (steps === 0) return;

		const reel = reelRefs[index];
		if (!reel) return;

		const currentVal = digits[index];
		const absSteps = Math.abs(steps);

		// Calculate destination digit
		const finalVal = ((currentVal + steps) % 10 + 10) % 10;
		digits[index] = finalVal;

		// Calculate target visual Y from current position (or from currentVal index)
		const targetIndex = MIDDLE_OFFSET + currentVal + steps;
		const targetY = -targetIndex * ITEM_HEIGHT;

		// Duration scales with steps: gentle for 1, longer glide for multi-step
		const duration = absSteps === 1 ? 0.22 : Math.min(0.9, 0.22 + absSteps * 0.08);

		isAnimating[index] = true;
		gsap.killTweensOf(reel);

		let lastAudioStep = 0;
		audio.play('click');

		gsap.to(reel, {
			y: targetY,
			duration,
			ease: absSteps > 1 ? 'power2.out' : 'back.out(1.2)',
			onUpdate: function () {
				if (absSteps > 1) {
					const progress = this.progress();
					const currentStep = Math.floor(progress * absSteps);
					if (currentStep > lastAudioStep) {
						lastAudioStep = currentStep;
						audio.play('click');
						audio.vibrate(10);
					}
				}
			},
			onComplete: () => {
				// Seamlessly snap back to canonical middle range (20 + finalVal)
				gsap.set(reel, { y: getTargetY(finalVal) });
				isAnimating[index] = false;
			}
		});
	}

	function snapToValue(index: number, val: number) {
		const reel = reelRefs[index];
		if (!reel) return;
		gsap.to(reel, {
			y: getTargetY(val),
			duration: 0.2,
			ease: 'power2.out'
		});
	}

	// 1:1 Direct touch / drag manipulation handlers
	function handlePointerDown(index: number, e: PointerEvent) {
		if (isLockedOut || isUnlocked) return;

		const reel = reelRefs[index];
		if (!reel) return;

		// Kill any active animation so user can grab and stop spinning wheel
		gsap.killTweensOf(reel);
		isAnimating[index] = false;

		const currentY = gsap.getProperty(reel, 'y') as number;
		dragStartReelY[index] = currentY;
		dragStartY[index] = e.clientY;
		lastPointerY[index] = e.clientY;
		lastPointerTime[index] = performance.now();
		lastVelocity[index] = 0;
		isDragging[index] = true;

		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(index: number, e: PointerEvent) {
		if (!isDragging[index]) return;

		const deltaY = e.clientY - dragStartY[index];
		const reel = reelRefs[index];
		if (reel) {
			// Real-time direct manipulation
			gsap.set(reel, { y: dragStartReelY[index] + deltaY });
		}

		const now = performance.now();
		const dt = now - lastPointerTime[index];
		if (dt > 16) {
			lastVelocity[index] = (e.clientY - lastPointerY[index]) / dt;
			lastPointerY[index] = e.clientY;
			lastPointerTime[index] = now;
		}
	}

	function handlePointerUp(index: number, e: PointerEvent) {
		if (!isDragging[index]) return;
		isDragging[index] = false;

		const deltaY = e.clientY - dragStartY[index];
		const velocity = lastVelocity[index];
		const speed = Math.abs(velocity);

		// If tiny tap or negligible movement: snap back to current value
		if (Math.abs(deltaY) < 12 && speed < 0.2) {
			snapToValue(index, digits[index]);
			return;
		}

		// Calculate steps based on both swipe distance and release flick velocity
		let steps = 1;
		if (speed >= 0.35 || Math.abs(deltaY) > 50) {
			// Fast flick or long drag: calculate multi-step momentum
			const distanceFactor = Math.abs(deltaY) / 45;
			const velocityFactor = speed * 2.4;
			steps = Math.min(8, Math.max(1, Math.round(distanceFactor + velocityFactor)));
		}

		// Direction:
		// Swiping UP (deltaY < 0 or negative velocity) rolls forward (increment)
		// Swiping DOWN (deltaY > 0 or positive velocity) rolls backward (decrement)
		const direction = (deltaY < 0 || velocity < -0.2) ? 1 : -1;
		spinWithMomentum(index, direction * steps);
	}

	function handleWheel(index: number, e: WheelEvent) {
		e.preventDefault();
		if (isLockedOut || isUnlocked) return;

		wheelAccumulator[index] += e.deltaY;
		if (wheelTimeout[index]) clearTimeout(wheelTimeout[index]);

		wheelTimeout[index] = setTimeout(() => {
			const delta = wheelAccumulator[index];
			wheelAccumulator[index] = 0;
			const speed = Math.abs(delta);
			if (speed < 10) return;

			let steps = 1;
			if (speed > 35) {
				// Momentum on strong wheel flicks
				steps = Math.min(6, Math.max(1, Math.round(speed / 32)));
			}
			const direction = delta > 0 ? 1 : -1;
			spinWithMomentum(index, direction * steps);
		}, 50);
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isLockedOut || isUnlocked) return;
		const code = digits.join('');
		onSubmit(code);
	}

	onMount(async () => {
		await tick();
		if (isUnlocked) {
			digits = getTargetDigits();
		}
		digits.forEach((val, i) => {
			setReelPosition(i, val, true);
		});
	});

	$effect(() => {
		if (isUnlocked) {
			untrack(() => {
				const target = getTargetDigits();
				digits = target;
				target.forEach((val, i) => {
					setReelPosition(i, val, true);
				});
			});
		}
	});
</script>

<div class="flex flex-col items-center select-none w-full">
	<!-- Mechanical Housing (Neutral and Black colors only) -->
	<div class="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5 shadow-[0_20px_40px_rgba(0,0,0,0.9)]">
		<!-- Top Bar: Status Badge only -->
		<div class="flex items-center justify-between px-1 pb-3">
			<div class="h-2 w-2 rounded-full border border-neutral-700 bg-neutral-900"></div>
			<div>
				{#if isUnlocked}
					<span class="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400">
						<Unlock size={14} />
						DESBLOQUEADO
					</span>
				{:else}
					<span class="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-amber-500">
						<Lock size={14} />
						BLOQUEADO
					</span>
				{/if}
			</div>
			<div class="h-2 w-2 rounded-full border border-neutral-700 bg-neutral-900"></div>
		</div>

		<!-- 4 Cylinders Chamber Container -->
		<div class="relative rounded-xl border border-neutral-800 bg-black p-3 sm:p-4 shadow-inner">
			<!-- Hairline Target Alignment Guide (Dead-Center Read Line) -->
			<div class="pointer-events-none absolute left-0 right-0 top-1/2 z-20 -translate-y-1/2 flex items-center justify-between px-1">
				<div class="h-0 w-0 border-y-[5px] border-y-transparent border-l-[7px] border-l-amber-500"></div>
				<div class="h-[2px] flex-1 bg-gradient-to-r from-amber-500/80 via-amber-400/20 to-amber-500/80 shadow-[0_0_8px_#f59e0b]"></div>
				<div class="h-0 w-0 border-y-[5px] border-y-transparent border-r-[7px] border-r-amber-500"></div>
			</div>

			<!-- Grid of 4 Tumbler Cylinders -->
			<div class="grid grid-cols-4 gap-2 sm:gap-3.5">
				{#each digits as digit, i}
					<div class="flex flex-col items-center">
						<!-- Up Button (Step -1) -->
						<button
							type="button"
							class="btn-tactile mb-2 flex h-9 w-full items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 shadow transition hover:border-amber-500/60 hover:text-amber-300 hover:bg-neutral-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
							disabled={isLockedOut || isUnlocked}
							onclick={() => spinWithMomentum(i, -1)}
							title="Subir dígito"
						>
							<ChevronUp size={20} />
						</button>

						<!-- Cylindrical Rolling Wheel Window (Height 148px shows center number fully + 2 partially visible) -->
						<div
							role="slider"
							tabindex="0"
							aria-valuenow={digit}
							aria-valuemin={0}
							aria-valuemax={9}
							aria-label={`Cilindro ${i + 1}`}
							style="height: {VIEWPORT_HEIGHT}px;"
							class="relative w-full cursor-ns-resize overflow-hidden rounded-xl border-2 {isUnlocked ? 'border-emerald-500/70 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-neutral-800'} bg-neutral-950 touch-none shadow-[inset_0_0_16px_rgba(0,0,0,0.95)]"
							onpointerdown={(e) => handlePointerDown(i, e)}
							onpointermove={(e) => handlePointerMove(i, e)}
							onpointerup={(e) => handlePointerUp(i, e)}
							onpointercancel={(e) => handlePointerUp(i, e)}
							onwheel={(e) => handleWheel(i, e)}
						>
							<!-- Top Curved Cylinder Shadow (Fades top partially visible number) -->
							<div class="pointer-events-none absolute inset-x-0 top-0 z-10 h-11 bg-gradient-to-b from-black via-black/85 to-transparent"></div>

							<!-- Bottom Curved Cylinder Shadow (Fades bottom partially visible number) -->
							<div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-11 bg-gradient-to-t from-black via-black/85 to-transparent"></div>

							<!-- Specular Metallic Highlight across the Center Selected Row -->
							<div
								style="height: {ITEM_HEIGHT}px;"
								class="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 bg-amber-400/[0.04] border-y border-amber-500/20 shadow-inner"
							></div>

							<!-- The Vertical Rolling Numbers Reel (50 digits: 0..9 repeating 5 times) -->
							<div
								bind:this={reelRefs[i]}
								style="top: calc(50% - {ITEM_HEIGHT / 2}px);"
								class="absolute left-0 right-0 will-change-transform"
							>
								{#each Array(50) as _, idx}
									{@const num = idx % 10}
									<div
										style="height: {ITEM_HEIGHT}px;"
										class="flex items-center justify-center font-mono text-3xl sm:text-4xl font-black transition-colors {digit === num
											? isUnlocked
												? 'text-emerald-400 text-glow-green'
												: 'text-amber-400 text-glow-amber'
											: 'text-neutral-500 opacity-60'}"
									>
										{num}
									</div>
								{/each}
							</div>
						</div>

						<!-- Down Button (Step +1) -->
						<button
							type="button"
							class="btn-tactile mt-2 flex h-9 w-full items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 shadow transition hover:border-amber-500/60 hover:text-amber-300 hover:bg-neutral-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
							disabled={isLockedOut || isUnlocked}
							onclick={() => spinWithMomentum(i, 1)}
							title="Bajar dígito"
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
