<script lang="ts">
	import { onMount, onDestroy, tick, untrack } from 'svelte';
	import gsap from 'gsap';
	import { audio } from '../../services/audio';
	import { Lock, Unlock, RotateCcw, RotateCw } from '@lucide/svelte';

	interface Props {
		targetCode: string;
		isUnlocked?: boolean;
		isLockedOut?: boolean;
		onSubmit: (enteredCode: string) => void;
	}

	let { targetCode, isUnlocked = false, isLockedOut = false, onSubmit }: Props = $props();

	// Standard safe dial has 40 increments (0 to 39)
	const TOTAL_TICKS = 40;
	const DEG_PER_TICK = 360 / TOTAL_TICKS; // 9 degrees per tick
	const SETTLE_DELAY_MS = 900; // Delay to confirm stop after rotation ceases

	function getTargetStops(): string[] {
		if (targetCode) {
			return targetCode
				.split('-')
				.map((s) => s.trim().toUpperCase().replace(/^R/, 'D').replace(/^L/, 'I'));
		}
		return ['D15', 'I30', 'D05'];
	}

	// Dial state
	let dialAngle = $state<number>(0);
	let currentNumber = $state<number>(0);
	let currentDirection = $state<'D' | 'I'>('D');
	let recordedSteps = $state<string[]>([]);

	// Visual flash state on lock-in
	let justLockedIn = $state<boolean>(false);
	let lockInTimeout: ReturnType<typeof setTimeout> | null = null;
	let centerCoreRef = $state<SVGGElement | null>(null);

	// Inactivity Settle Detection (Locks in number ONLY on calm pause)
	let strokeMovedTicks = 0;
	let settleTimer: ReturnType<typeof setTimeout> | null = null;
	let isSettling = $state<boolean>(false);

	// SVG & Drag tracking
	let svgRef = $state<SVGSVGElement | null>(null);
	let isDragging = $state<boolean>(false);
	let lastPointerAngle = 0;

	// Calculate which tick number [0..39] is currently under the top 12 o'clock pointer
	function calculateTopNumber(deg: number): number {
		const rawTick = Math.round(deg / DEG_PER_TICK);
		return ((rawTick % TOTAL_TICKS) + TOTAL_TICKS) % TOTAL_TICKS;
	}

	function formatStep(dir: 'D' | 'I', num: number): string {
		const padded = num.toString().padStart(2, '0');
		return `${dir}${padded}`;
	}

	function commitStop(dir: 'D' | 'I', num: number) {
		if (isLockedOut || isUnlocked) return;
		if (recordedSteps.length >= 3) return;

		const step = formatStep(dir, num);
		if (recordedSteps.length > 0 && recordedSteps[recordedSteps.length - 1] === step) {
			return;
		}

		recordedSteps = [...recordedSteps, step];
		strokeMovedTicks = 0;
		isSettling = false;

		// Heavy mechanical tumbler clunk & haptics
		audio.play('clunk');
		audio.vibrate([30, 20, 40]);

		// Strong visual confirmation pulse on the center dial core
		justLockedIn = true;
		if (centerCoreRef) {
			gsap.killTweensOf(centerCoreRef);
			gsap.fromTo(
				centerCoreRef,
				{ scale: 0.9 },
				{ scale: 1.1, duration: 0.18, yoyo: true, repeat: 1, ease: 'back.out(2)' }
			);
		}

		if (lockInTimeout) clearTimeout(lockInTimeout);
		lockInTimeout = setTimeout(() => {
			justLockedIn = false;
			lockInTimeout = null;
		}, 450);
	}

	function clearSettleTimer() {
		if (settleTimer) {
			clearTimeout(settleTimer);
			settleTimer = null;
		}
		isSettling = false;
	}

	function scheduleSettleTimer() {
		clearSettleTimer();
		if (isLockedOut || isUnlocked || recordedSteps.length >= 3) return;
		if (strokeMovedTicks < 1) return;

		isSettling = true;
		settleTimer = setTimeout(() => {
			if (strokeMovedTicks >= 1 && recordedSteps.length < 3) {
				commitStop(currentDirection, currentNumber);
			}
			isSettling = false;
			settleTimer = null;
		}, SETTLE_DELAY_MS);
	}

	function getPointerAngle(e: PointerEvent): number | null {
		if (!svgRef) return null;
		const rect = svgRef.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const dx = e.clientX - cx;
		const dy = e.clientY - cy;
		return Math.atan2(dy, dx) * (180 / Math.PI);
	}

	function handlePointerDown(e: PointerEvent) {
		if (isLockedOut || isUnlocked) return;

		const angle = getPointerAngle(e);
		if (angle === null) return;

		clearSettleTimer();
		isDragging = true;
		lastPointerAngle = angle;

		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging) return;

		const angle = getPointerAngle(e);
		if (angle === null) return;

		let frameDelta = angle - lastPointerAngle;
		while (frameDelta > 180) frameDelta -= 360;
		while (frameDelta < -180) frameDelta += 360;

		lastPointerAngle = angle;
		dialAngle += frameDelta;

		// Direction detection: CW (D / Derecha) vs CCW (I / Izquierda)
		if (Math.abs(frameDelta) > 0.4) {
			currentDirection = frameDelta > 0 ? 'D' : 'I';
		}

		// Check if tick number changed
		const newNumber = calculateTopNumber(dialAngle);
		if (newNumber !== currentNumber) {
			currentNumber = newNumber;
			strokeMovedTicks++;
			audio.play('ratchet');
			audio.vibrate(8);

			scheduleSettleTimer();
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (!isDragging) return;
		isDragging = false;

		const nearestTick = Math.round(dialAngle / DEG_PER_TICK);
		const targetAngle = nearestTick * DEG_PER_TICK;

		gsap.to(
			{},
			{
				duration: 0.15,
				ease: 'power2.out',
				onUpdate: function () {
					const p = this.progress();
					dialAngle += (targetAngle - dialAngle) * p;
				},
				onComplete: () => {
					dialAngle = targetAngle;
					currentNumber = calculateTopNumber(dialAngle);
					scheduleSettleTimer();
				}
			}
		);
	}

	function stepDial(direction: 1 | -1) {
		if (isLockedOut || isUnlocked) return;
		clearSettleTimer();

		currentDirection = direction === 1 ? 'D' : 'I';
		const targetAngle = dialAngle + direction * DEG_PER_TICK;

		audio.play('ratchet');
		audio.vibrate(10);
		strokeMovedTicks++;

		gsap.to(
			{},
			{
				duration: 0.12,
				ease: 'power2.out',
				onUpdate: function () {
					const p = this.progress();
					dialAngle += (targetAngle - dialAngle) * p;
				},
				onComplete: () => {
					dialAngle = targetAngle;
					currentNumber = calculateTopNumber(dialAngle);
					scheduleSettleTimer();
				}
			}
		);
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isLockedOut || isUnlocked) return;
		clearSettleTimer();

		// Auto-append active stop if 2 stops were registered and player is on 3rd
		let finalSteps = [...recordedSteps];
		if (finalSteps.length < 3 && strokeMovedTicks >= 1) {
			finalSteps.push(formatStep(currentDirection, currentNumber));
		}

		const code = finalSteps.join('-');
		onSubmit(code);
	}

	// On error lockout (failed unlock attempt): instantly reset combination back to 0 steps!
	$effect(() => {
		if (isLockedOut) {
			untrack(() => {
				recordedSteps = [];
				strokeMovedTicks = 0;
				clearSettleTimer();
			});
		}
	});

	onMount(async () => {
		await tick();
		if (isUnlocked) {
			const stops = getTargetStops();
			recordedSteps = stops;
			const last = stops[stops.length - 1];
			if (last) {
				const num = parseInt(last.replace(/[^\d]/g, ''), 10) || 0;
				currentNumber = num;
				dialAngle = num * DEG_PER_TICK;
			}
		}
	});

	onDestroy(() => {
		clearSettleTimer();
		if (lockInTimeout) clearTimeout(lockInTimeout);
	});

	$effect(() => {
		if (isUnlocked) {
			untrack(() => {
				const stops = getTargetStops();
				recordedSteps = stops;
				const last = stops[stops.length - 1];
				if (last) {
					const num = parseInt(last.replace(/[^\d]/g, ''), 10) || 0;
					currentNumber = num;
					dialAngle = num * DEG_PER_TICK;
				}
			});
		}
	});
</script>

<div class="flex flex-col items-center select-none w-full max-w-md mx-auto">
	<!-- Safe Dial Housing Frame (Neutral & Black) -->
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

		<!-- Interactive Rotary Dial Viewport -->
		<div
			role="region"
			aria-label="Dial giratorio de caja fuerte"
			class="relative flex items-center justify-center rounded-2xl border border-neutral-900 bg-gradient-to-b from-neutral-950 via-black to-neutral-950 p-2 sm:p-3 shadow-inner overflow-hidden touch-none"
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
		>
			<!-- Top Alignment Triangle Marker (12 o'clock read point) -->
			<div class="pointer-events-none absolute top-1 z-30 flex flex-col items-center">
				<div
					class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-amber-500 bg-neutral-950 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
				>
					<span class="font-bold text-amber-400 text-xs">▼</span>
				</div>
				<div class="h-2 w-0.5 bg-amber-400 shadow-[0_0_8px_#f59e0b]"></div>
			</div>

			<!-- Scalable Heavy Metal Rotary Safe Dial SVG -->
			<svg
				bind:this={svgRef}
				viewBox="-200 -200 400 400"
				class="w-full max-w-[340px] sm:max-w-[370px] aspect-square cursor-grab active:cursor-grabbing select-none"
			>
				<defs>
					<!-- Radial Outer Shading -->
					<radialGradient id="safe-outer-rim" cx="50%" cy="50%" r="50%">
						<stop offset="85%" stop-color="#141414" />
						<stop offset="95%" stop-color="#0a0a0a" />
						<stop offset="100%" stop-color="#262626" />
					</radialGradient>

					<!-- Dial Bevel Shading -->
					<radialGradient id="safe-dial-face" cx="50%" cy="50%" r="50%">
						<stop offset="0%" stop-color="#1a1a1a" />
						<stop offset="70%" stop-color="#0d0d0d" />
						<stop offset="100%" stop-color="#050505" />
					</radialGradient>
				</defs>

				<!-- Fixed Outer Knurled Ring Grip with 80 notches -->
				<g opacity="0.45">
					<circle cx="0" cy="0" r="192" fill="url(#safe-outer-rim)" stroke="#333333" stroke-width="2" />
					{#each Array(80) as _, i}
						{@const rot = i * 4.5}
						<line
							x1="0"
							y1="-192"
							x2="0"
							y2="-183"
							stroke="#262626"
							stroke-width="1.5"
							transform="rotate({rot})"
						/>
					{/each}
				</g>

				<!-- ROTATING DIAL ASSEMBLY (Turns with dialAngle) -->
				<g transform="rotate({dialAngle})" class="will-change-transform">
					<!-- Dial Face Plate -->
					<circle
						cx="0"
						cy="0"
						r="176"
						fill="url(#safe-dial-face)"
						stroke={isUnlocked ? '#10b981' : '#404040'}
						stroke-width="2"
					/>
					<circle cx="0" cy="0" r="168" fill="none" stroke="#1f1f1f" stroke-width="1" />
					<circle cx="0" cy="0" r="128" fill="none" stroke="#171717" stroke-width="1.5" />

					<!-- 40 Graduated Ticks and Number Markings (0 to 39) -->
					{#each Array(TOTAL_TICKS) as _, tickIdx}
						{@const isMajor = tickIdx % 5 === 0}
						{@const tickRot = -tickIdx * DEG_PER_TICK}
						{@const isCurrentNumber = tickIdx === currentNumber}

						<!-- Tick Line -->
						<line
							x1="0"
							y1="-168"
							x2="0"
							y2={isMajor ? '-148' : '-158'}
							stroke={isMajor ? '#e5e5e5' : '#525252'}
							stroke-width={isMajor ? '2' : '1'}
							transform="rotate({tickRot})"
						/>

						<!-- Major Number Labels (0, 5, 10, 15, 20, 25, 30, 35) -->
						{#if isMajor}
							{@const rad = ((tickRot - 90) * Math.PI) / 180}
							{@const lx = Math.cos(rad) * 136}
							{@const ly = Math.sin(rad) * 136}
							<text
								x={lx}
								y={ly}
								text-anchor="middle"
								dominant-baseline="central"
								font-family="monospace"
								font-size="16"
								font-weight="900"
								fill={isCurrentNumber ? (isUnlocked ? '#34d399' : '#f59e0b') : '#a3a3a3'}
								transform="rotate({-dialAngle}, {lx}, {ly})"
								style={isCurrentNumber ? 'filter: drop-shadow(0 0 6px rgba(245,158,11,0.6));' : ''}
							>
								{tickIdx}
							</text>
						{/if}
					{/each}

					<!-- Heavy Center Steel Grip Hub -->
					<circle cx="0" cy="0" r="76" fill="#0d0d0d" stroke="#262626" stroke-width="2" />
					<circle cx="0" cy="0" r="68" fill="#141414" stroke="#1f1f1f" stroke-width="1.5" />

					<!-- Knurled Grip Ridges on Center Knob -->
					{#each Array(16) as _, i}
						{@const rot = i * 22.5}
						<line
							x1="0"
							y1="-68"
							x2="0"
							y2="-58"
							stroke="#262626"
							stroke-width="2"
							transform="rotate({rot})"
						/>
					{/each}
				</g>

				<!-- NON-ROTATING CENTER STATUS CORE (Presents Strong Visual Flash Confirmation on Lock-in) -->
				<g bind:this={centerCoreRef}>
					<circle
						cx="0"
						cy="0"
						r="50"
						fill="#050505"
						stroke={isUnlocked ? '#10b981' : justLockedIn ? '#22c55e' : isSettling ? '#f59e0b' : '#333333'}
						stroke-width={justLockedIn ? '3' : '2'}
						style={justLockedIn ? 'filter: drop-shadow(0 0 15px #22c55e);' : ''}
					/>

					<!-- Active Number Readout at Core Center -->
					<text
						x="0"
						y="-8"
						text-anchor="middle"
						dominant-baseline="central"
						font-family="monospace"
						font-size="24"
						font-weight="900"
						fill={isUnlocked ? '#34d399' : justLockedIn ? '#4ade80' : '#f59e0b'}
						style="filter: drop-shadow(0 0 8px {isUnlocked || justLockedIn ? '#34d399' : 'rgba(245,158,11,0.5)'});"
					>
						{currentNumber.toString().padStart(2, '0')}
					</text>

					<!-- Active Direction Indicator (D / I) -->
					<text
						x="0"
						y="16"
						text-anchor="middle"
						dominant-baseline="central"
						font-family="monospace"
						font-size="11"
						font-weight="700"
						letter-spacing="0.1em"
						fill={isUnlocked ? '#34d399' : justLockedIn ? '#4ade80' : isSettling ? '#f59e0b' : '#888888'}
					>
						{currentDirection === 'D' ? '↻ DER (D)' : '↺ IZQ (I)'}
					</text>
				</g>
			</svg>
		</div>

		<!-- Anonymous Lock-Pin Progress Indicators & Controls (NO Code Text Revealed) -->
		<div class="mt-3.5 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
			<div class="flex items-center justify-between">
				<!-- Step Turn Left (CCW) -->
				<button
					type="button"
					disabled={isLockedOut || isUnlocked}
					onclick={() => stepDial(-1)}
					title="Girar un paso a la izquierda"
					class="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-mono font-bold text-neutral-300 hover:border-amber-500/50 hover:text-white active:scale-95 disabled:opacity-30 cursor-pointer"
				>
					<RotateCcw size={13} />
					<span>-1</span>
				</button>

				<!-- 3 Anonymous Lock-Pin Status Dots (Progress Only, No Code Shown) -->
				<div class="flex items-center gap-2.5">
					{#each Array(3) as _, pinIdx}
						{@const isEngaged = recordedSteps.length > pinIdx}
						<div
							class="h-3 w-3 rounded-full border transition-all duration-300 {isUnlocked
								? 'border-emerald-400 bg-emerald-400 shadow-[0_0_8px_#22c55e]'
								: isEngaged
									? 'border-amber-400 bg-amber-400 shadow-[0_0_10px_#f59e0b]'
									: 'border-neutral-800 bg-neutral-900 opacity-40'}"
						></div>
					{/each}
				</div>

				<!-- Step Turn Right (CW) -->
				<button
					type="button"
					disabled={isLockedOut || isUnlocked}
					onclick={() => stepDial(1)}
					title="Girar un paso a la derecha"
					class="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-mono font-bold text-neutral-300 hover:border-amber-500/50 hover:text-white active:scale-95 disabled:opacity-30 cursor-pointer"
				>
					<span>+1</span>
					<RotateCw size={13} />
				</button>
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
