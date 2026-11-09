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

	const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
	const ALPHABET_LEN = ALPHABET.length; // 26

	const numRotors = $derived(
		targetCode ? Math.max(1, targetCode.replace(/[^a-zA-Z]/g, '').length) : 5
	);

	function letterToIndex(letter: string): number {
		const idx = ALPHABET.indexOf(letter.toLowerCase());
		return idx >= 0 ? idx : 0;
	}

	function getTargetIndices(): number[] {
		if (targetCode) {
			const cleaned = targetCode.toLowerCase().replace(/[^a-z]/g, '');
			if (cleaned.length > 0) {
				return cleaned.split('').map((char) => letterToIndex(char));
			}
		}
		return Array(numRotors).fill(0);
	}

	function getInitialIndices(): number[] {
		const len = targetCode ? Math.max(1, targetCode.replace(/[^a-zA-Z]/g, '').length) : 5;
		return Array(len).fill(0);
	}

	// Active letter index [0..25] for each rotor
	let rotorIndices = $state<number[]>(getInitialIndices());

	// Item height in pixels for each letter row
	const ITEM_HEIGHT = 56;
	const VIEWPORT_HEIGHT = 148;
	// 26 letters repeated 5 times = 130 items; middle range starts at index 52 (2 * 26)
	const MIDDLE_OFFSET = 52;

	let reelRefs = $state<(HTMLDivElement | null)[]>([]);
	let isAnimating: boolean[] = [];

	let dragStartY: number[] = [];
	let dragStartReelY: number[] = [];
	let lastPointerY: number[] = [];
	let lastPointerTime: number[] = [];
	let lastVelocity: number[] = [];
	let isDragging: boolean[] = [];

	let wheelTimeout: (ReturnType<typeof setTimeout> | null)[] = [];
	let wheelAccumulator: number[] = [];

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
	 * Spin the rotor wheel with gear-ratchet momentum based on distance and velocity.
	 */
	function spinWithMomentum(index: number, steps: number) {
		if (isLockedOut || isUnlocked) return;
		if (steps === 0) return;

		const reel = reelRefs[index];
		if (!reel) return;

		const currentVal = rotorIndices[index] ?? 0;
		const absSteps = Math.abs(steps);

		// Calculate destination index in alphabet
		const finalVal = ((currentVal + steps) % ALPHABET_LEN + ALPHABET_LEN) % ALPHABET_LEN;
		rotorIndices[index] = finalVal;

		const targetIndex = MIDDLE_OFFSET + currentVal + steps;
		const targetY = -targetIndex * ITEM_HEIGHT;

		const duration = absSteps === 1 ? 0.2 : Math.min(0.9, 0.2 + absSteps * 0.06);

		isAnimating[index] = true;
		gsap.killTweensOf(reel);

		let lastAudioStep = 0;
		audio.play('ratchet');

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
						audio.vibrate(8);
					}
				}
			},
			onComplete: () => {
				// Seamlessly snap back to canonical middle range (52 + finalVal)
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

	function handlePointerDown(index: number, e: PointerEvent) {
		if (isLockedOut || isUnlocked) return;

		const reel = reelRefs[index];
		if (!reel) return;

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

		if (Math.abs(deltaY) < 12 && speed < 0.2) {
			snapToValue(index, rotorIndices[index]);
			return;
		}

		let steps = 1;
		if (speed >= 0.35 || Math.abs(deltaY) > 50) {
			const distanceFactor = Math.abs(deltaY) / 45;
			const velocityFactor = speed * 2.4;
			steps = Math.min(10, Math.max(1, Math.round(distanceFactor + velocityFactor)));
		}

		const direction = (deltaY < 0 || velocity < -0.2) ? 1 : -1;
		spinWithMomentum(index, direction * steps);
	}

	function handleWheel(index: number, e: WheelEvent) {
		e.preventDefault();
		if (isLockedOut || isUnlocked) return;

		wheelAccumulator[index] = (wheelAccumulator[index] || 0) + e.deltaY;
		if (wheelTimeout[index]) clearTimeout(wheelTimeout[index]);

		wheelTimeout[index] = setTimeout(() => {
			const delta = wheelAccumulator[index] || 0;
			wheelAccumulator[index] = 0;
			const speed = Math.abs(delta);
			if (speed < 10) return;

			let steps = 1;
			if (speed > 35) {
				steps = Math.min(8, Math.max(1, Math.round(speed / 30)));
			}
			const direction = delta > 0 ? 1 : -1;
			spinWithMomentum(index, direction * steps);
		}, 50);
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isLockedOut || isUnlocked) return;

		const code = rotorIndices.map((idx) => ALPHABET[idx]).join('');
		onSubmit(code);
	}

	onMount(async () => {
		await tick();
		if (isUnlocked) {
			rotorIndices = getTargetIndices();
		}
		rotorIndices.forEach((val, i) => {
			setReelPosition(i, val, true);
		});
	});

	// Auto-reset rotors to 'a' on error lockout
	$effect(() => {
		if (isLockedOut) {
			untrack(() => {
				rotorIndices = Array(numRotors).fill(0);
				rotorIndices.forEach((val, i) => {
					setReelPosition(i, val, false);
				});
			});
		}
	});

	$effect(() => {
		const targetLen = numRotors;
		if (rotorIndices.length !== targetLen) {
			untrack(() => {
				rotorIndices = isUnlocked ? getTargetIndices() : Array(targetLen).fill(0);
				tick().then(() => {
					rotorIndices.forEach((val, i) => setReelPosition(i, val, true));
				});
			});
		}
	});

	$effect(() => {
		if (isUnlocked) {
			untrack(() => {
				const target = getTargetIndices();
				rotorIndices = target;
				target.forEach((val, i) => {
					setReelPosition(i, val, true);
				});
			});
		}
	});
</script>

<div class="flex flex-col items-center select-none w-full max-w-md mx-auto">
	<!-- Heavy Military / Crypto Machinery Housing -->
	<div
		class="relative w-full rounded-3xl border border-neutral-800 bg-black p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
	>
		<!-- Status Header Bar (No Lock Type Names) -->
		<div class="flex items-center justify-between pb-3 px-1 text-xs font-mono font-bold">
			<div class="flex items-center gap-1.5">
				<div class="h-2 w-2 rounded-full border border-neutral-700 bg-neutral-900"></div>
				<!-- Gear Teeth Pattern Header Accent -->
				<div class="flex gap-0.5 opacity-40">
					<div class="h-1 w-1 bg-neutral-600 rounded-xs"></div>
					<div class="h-1 w-1 bg-neutral-600 rounded-xs"></div>
					<div class="h-1 w-1 bg-neutral-600 rounded-xs"></div>
				</div>
			</div>
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
			<div class="flex items-center gap-1.5">
				<div class="flex gap-0.5 opacity-40">
					<div class="h-1 w-1 bg-neutral-600 rounded-xs"></div>
					<div class="h-1 w-1 bg-neutral-600 rounded-xs"></div>
					<div class="h-1 w-1 bg-neutral-600 rounded-xs"></div>
				</div>
				<div class="h-2 w-2 rounded-full border border-neutral-700 bg-neutral-900"></div>
			</div>
		</div>

		<!-- Milled Rotor Wheel Chamber Container -->
		<div class="relative rounded-2xl border border-neutral-800 bg-neutral-950 p-2.5 sm:p-4 shadow-inner">
			<!-- Hairline Target Alignment Guide (Dead-Center Read Line) -->
			<div class="pointer-events-none absolute left-0 right-0 top-1/2 z-20 -translate-y-1/2 flex items-center justify-between px-1">
				<div class="h-0 w-0 border-y-[5px] border-y-transparent border-l-[7px] border-l-amber-500"></div>
				<div class="h-[2px] flex-1 bg-gradient-to-r from-amber-500/80 via-amber-400/20 to-amber-500/80 shadow-[0_0_8px_#f59e0b]"></div>
				<div class="h-0 w-0 border-y-[5px] border-y-transparent border-r-[7px] border-r-amber-500"></div>
			</div>

			<!-- Grid of 5 Crypto Rotors -->
			<div
				class="grid gap-1.5 sm:gap-2.5"
				style="grid-template-columns: repeat({rotorIndices.length}, minmax(0, 1fr));"
			>
				{#each rotorIndices as activeIdx, i}
					{@const activeChar = ALPHABET[activeIdx]}
					<div class="flex flex-col items-center">
						<!-- Up Notched Tooth Button (Step -1) -->
						<button
							type="button"
							class="btn-tactile mb-1.5 sm:mb-2 flex h-8 sm:h-9 w-full items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 p-0 shadow transition hover:border-amber-500/60 hover:text-amber-300 hover:bg-neutral-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
							disabled={isLockedOut || isUnlocked}
							onclick={() => spinWithMomentum(i, -1)}
							title="Avanzar letra anterior"
						>
							<ChevronUp size={18} />
						</button>

						<!-- Milled Metal Rotor Wheel (Height 148px shows active letter centered + 2 partially visible) -->
						<div
							role="slider"
							tabindex="0"
							aria-valuenow={activeIdx}
							aria-valuemin={0}
							aria-valuemax={25}
							aria-label={`Rotor ${i + 1}`}
							style="height: {VIEWPORT_HEIGHT}px;"
							class="relative w-full cursor-ns-resize overflow-hidden rounded-xl border-2 {isUnlocked ? 'border-emerald-500/70 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-neutral-800'} bg-black touch-none shadow-[inset_0_0_18px_rgba(0,0,0,0.95)]"
							onpointerdown={(e) => handlePointerDown(i, e)}
							onpointermove={(e) => handlePointerMove(i, e)}
							onpointerup={(e) => handlePointerUp(i, e)}
							onpointercancel={(e) => handlePointerUp(i, e)}
							onwheel={(e) => handleWheel(i, e)}
						>
							<!-- Left & Right Notched Gear Teeth Ribs -->
							<div class="pointer-events-none absolute inset-y-0 left-0 w-1 flex flex-col justify-between py-2 z-10 opacity-30">
								{#each Array(10) as _}
									<div class="h-1.5 w-1 bg-neutral-400 rounded-r-xs"></div>
								{/each}
							</div>
							<div class="pointer-events-none absolute inset-y-0 right-0 w-1 flex flex-col justify-between py-2 z-10 opacity-30">
								{#each Array(10) as _}
									<div class="h-1.5 w-1 bg-neutral-400 rounded-l-xs"></div>
								{/each}
							</div>

							<!-- Top Curved Cylinder Shadow -->
							<div class="pointer-events-none absolute inset-x-0 top-0 z-10 h-11 bg-gradient-to-b from-black via-black/85 to-transparent"></div>

							<!-- Bottom Curved Cylinder Shadow -->
							<div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-11 bg-gradient-to-t from-black via-black/85 to-transparent"></div>

							<!-- Specular Metallic Highlight across the Center Selected Row -->
							<div
								style="height: {ITEM_HEIGHT}px;"
								class="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 bg-amber-400/[0.04] border-y border-amber-500/20 shadow-inner"
							></div>

							<!-- The Vertical Rolling Letters Reel (130 letters: a..z repeating 5 times) -->
							<div
								bind:this={reelRefs[i]}
								style="top: calc(50% - {ITEM_HEIGHT / 2}px);"
								class="absolute left-0 right-0 will-change-transform"
							>
								{#each Array(130) as _, idx}
									{@const char = ALPHABET[idx % ALPHABET_LEN]}
									<div
										style="height: {ITEM_HEIGHT}px;"
										class="flex items-center justify-center font-mono text-2xl sm:text-3xl font-black lowercase transition-colors {activeChar === char
											? isUnlocked
												? 'text-emerald-400 text-glow-green'
												: 'text-amber-400 text-glow-amber'
											: 'text-neutral-500 opacity-50'}"
									>
										{char}
									</div>
								{/each}
							</div>
						</div>

						<!-- Down Notched Tooth Button (Step +1) -->
						<button
							type="button"
							class="btn-tactile mt-1.5 sm:mt-2 flex h-8 sm:h-9 w-full items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 p-0 shadow transition hover:border-amber-500/60 hover:text-amber-300 hover:bg-neutral-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
							disabled={isLockedOut || isUnlocked}
							onclick={() => spinWithMomentum(i, 1)}
							title="Avanzar letra siguiente"
						>
							<ChevronDown size={18} />
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
