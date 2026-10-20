<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
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

	export interface ElementalSigil {
		id: string;
		name: string;
		rune: string; // Clean text rune symbol
		color: string;
		glow: string;
	}

	// 6 Elemental Sigils with Authentic Text Runes (Strictly in Spanish)
	const SIGILS: ElementalSigil[] = [
		{
			id: 'FUEGO',
			name: 'FUEGO',
			rune: 'ᚲ', // Kenaz (Fuego)
			color: '#f59e0b', // Amber/gold
			glow: 'rgba(245, 158, 11, 0.7)'
		},
		{
			id: 'TIERRA',
			name: 'TIERRA',
			rune: 'ᛃ', // Jera (Tierra)
			color: '#22c55e', // Emerald
			glow: 'rgba(34, 197, 94, 0.7)'
		},
		{
			id: 'LUNA',
			name: 'LUNA',
			rune: 'ᛗ', // Mannaz (Luna)
			color: '#818cf8', // Indigo/Moon blue
			glow: 'rgba(129, 140, 248, 0.7)'
		},
		{
			id: 'AGUA',
			name: 'AGUA',
			rune: 'ᛚ', // Laguz (Agua)
			color: '#06b6d4', // Cyan
			glow: 'rgba(6, 182, 212, 0.7)'
		},
		{
			id: 'AIRE',
			name: 'AIRE',
			rune: 'ᚨ', // Ansuz (Aire)
			color: '#e2e8f0', // Silver/Air
			glow: 'rgba(226, 232, 240, 0.6)'
		},
		{
			id: 'SOL',
			name: 'SOL',
			rune: 'ᛋ', // Sowilo (Sol)
			color: '#f97316', // Solar orange
			glow: 'rgba(249, 115, 22, 0.7)'
		}
	];

	const SIGIL_COUNT = SIGILS.length; // 6
	const ANGLE_STEP = 360 / SIGIL_COUNT; // 60 degrees

	// Ring geometric parameters (from outer 0 to inner 3)
	// Equal radial thickness (39px each) allowing identical large circles on all 4 rings
	const RINGS = [
		{ id: 0, label: 'ANILLO I', innerR: 152, outerR: 191, midR: 171.5, color: '#f59e0b' },
		{ id: 1, label: 'ANILLO II', innerR: 113, outerR: 152, midR: 132.5, color: '#22c55e' },
		{ id: 2, label: 'ANILLO III', innerR: 74, outerR: 113, midR: 93.5, color: '#818cf8' },
		{ id: 3, label: 'ANILLO IV', innerR: 35, outerR: 74, midR: 54.5, color: '#06b6d4' }
	];

	function getTargetIndices(): number[] {
		if (targetCode) {
			const parts = targetCode.split('-').map((s) => s.trim().toUpperCase());
			const SPANISH_MAP: Record<string, string> = {
				FIRE: 'FUEGO',
				EARTH: 'TIERRA',
				MOON: 'LUNA',
				WATER: 'AGUA',
				AIR: 'AIRE',
				SUN: 'SOL'
			};
			const indices = parts.map((part) => {
				const resolved = SPANISH_MAP[part] || part;
				const idx = SIGILS.findIndex((s) => s.id === resolved || s.name === resolved);
				return idx >= 0 ? idx : 0;
			});
			if (indices.length >= 4) return indices.slice(0, 4);
		}
		// Default sequence: FUEGO, TIERRA, LUNA, AGUA
		return [0, 1, 2, 3];
	}

	// Current symbol index [0..5] for each of the 4 rings
	let currentIndices = $state<number[]>([0, 0, 0, 0]);

	// Current visual rotation angles (in degrees) for GSAP interpolation
	let ringAngles = $state<number[]>([0, 0, 0, 0]);

	// Currently active/focused ring (0 to 3) for button controls
	let selectedRing = $state<number>(0);

	// Container SVG element ref
	let svgRef = $state<SVGSVGElement | null>(null);

	// Dragging state
	let isDragging = $state<boolean>(false);
	let activeDragRing = $state<number | null>(null);
	let dragStartPointerAngle = 0;
	let dragStartRingAngle = 0;
	let lastPointerAngle = 0;
	let lastPointerTime = 0;
	let angularVelocity = 0;

	// Normalize index into 0..5
	function normalizeIndex(idx: number): number {
		return ((idx % SIGIL_COUNT) + SIGIL_COUNT) % SIGIL_COUNT;
	}

	// Calculate target rotation angle for a given symbol index to be at 12 o'clock (-90° in standard polar)
	function getAngleForIndex(idx: number): number {
		// Index 0 is at top (12 o'clock). Each step adds 60°.
		return -idx * ANGLE_STEP;
	}

	// Smoothly animate ring to a target symbol index
	function rotateRingToIndex(ringIdx: number, targetSymbolIdx: number, playSound = true) {
		if (isLockedOut || isUnlocked) return;

		const normalizedTarget = normalizeIndex(targetSymbolIdx);
		currentIndices[ringIdx] = normalizedTarget;

		// Calculate closest target angle to prevent unnecessary full spins
		const currentAngle = ringAngles[ringIdx];
		const targetBaseAngle = getAngleForIndex(normalizedTarget);
		const currentTurns = Math.round((currentAngle - targetBaseAngle) / 360);
		const finalAngle = targetBaseAngle + currentTurns * 360;

		if (playSound) {
			audio.play('ratchet');
			audio.vibrate(15);
		}

		gsap.to(
			{},
			{
				duration: 0.35,
				ease: 'back.out(1.3)',
				onUpdate: function () {
					const progress = this.progress();
					ringAngles[ringIdx] = currentAngle + (finalAngle - currentAngle) * progress;
				},
				onComplete: () => {
					ringAngles[ringIdx] = finalAngle;
				}
			}
		);
	}

	// Step a ring forward or backward (+1 or -1)
	function stepRing(ringIdx: number, direction: 1 | -1) {
		if (isLockedOut || isUnlocked) return;
		selectedRing = ringIdx;
		const nextIdx = normalizeIndex(currentIndices[ringIdx] + direction);
		rotateRingToIndex(ringIdx, nextIdx, true);
	}

	// Convert client mouse/touch point to SVG coordinates and polar angle
	function getPolarAngleAndRadius(e: PointerEvent): { angle: number; radius: number } | null {
		if (!svgRef) return null;
		const rect = svgRef.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const dx = e.clientX - centerX;
		const dy = e.clientY - centerY;
		const radius = (Math.sqrt(dx * dx + dy * dy) / (rect.width / 2)) * 200; // Normalized to 200 SVG radius

		// Standard polar angle in degrees: 0° is East, 90° is South, -90° (270°) is North (12 o'clock)
		let angle = Math.atan2(dy, dx) * (180 / Math.PI);
		return { angle, radius };
	}

	// Detect which ring radius was touched
	function getRingFromRadius(radius: number): number | null {
		for (const ring of RINGS) {
			if (radius >= ring.innerR - 6 && radius <= ring.outerR + 6) {
				return ring.id;
			}
		}
		return null;
	}

	function handlePointerDown(e: PointerEvent) {
		if (isLockedOut || isUnlocked) return;

		const polar = getPolarAngleAndRadius(e);
		if (!polar) return;

		const touchedRing = getRingFromRadius(polar.radius);
		if (touchedRing === null) return;

		activeDragRing = touchedRing;
		selectedRing = touchedRing;
		isDragging = true;
		dragStartPointerAngle = polar.angle;
		dragStartRingAngle = ringAngles[touchedRing];
		lastPointerAngle = polar.angle;
		lastPointerTime = performance.now();
		angularVelocity = 0;

		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging || activeDragRing === null) return;

		const polar = getPolarAngleAndRadius(e);
		if (!polar) return;

		// Calculate angular delta considering wraparound
		let delta = polar.angle - dragStartPointerAngle;
		while (delta > 180) delta -= 360;
		while (delta < -180) delta += 360;

		const newAngle = dragStartRingAngle + delta;
		ringAngles[activeDragRing] = newAngle;

		// Velocity tracking
		const now = performance.now();
		const dt = now - lastPointerTime;
		if (dt > 16) {
			let frameDelta = polar.angle - lastPointerAngle;
			while (frameDelta > 180) frameDelta -= 360;
			while (frameDelta < -180) frameDelta += 360;
			angularVelocity = frameDelta / dt;
			lastPointerAngle = polar.angle;
			lastPointerTime = now;
		}

		// Update nearest index dynamically
		const calculatedIdx = normalizeIndex(Math.round(-newAngle / ANGLE_STEP));
		if (calculatedIdx !== currentIndices[activeDragRing]) {
			currentIndices[activeDragRing] = calculatedIdx;
			audio.play('click');
			audio.vibrate(8);
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (!isDragging || activeDragRing === null) return;
		const ringIdx = activeDragRing;
		isDragging = false;
		activeDragRing = null;

		// Check if flick momentum should advance further
		const speed = Math.abs(angularVelocity);
		let targetAngle = ringAngles[ringIdx];

		if (speed > 0.45) {
			const momentumSteps = Math.min(3, Math.max(1, Math.round(speed * 3.5)));
			const dir = angularVelocity > 0 ? 1 : -1;
			targetAngle += dir * momentumSteps * ANGLE_STEP;
		}

		// Snap to nearest 60-degree notch
		const nearestIndex = normalizeIndex(Math.round(-targetAngle / ANGLE_STEP));
		rotateRingToIndex(ringIdx, nearestIndex, true);
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isLockedOut || isUnlocked) return;

		// Serialized as: FIRE-EARTH-MOON-WATER
		const code = currentIndices.map((idx) => SIGILS[idx].id).join('-');
		audio.play('clunk');
		onSubmit(code);
	}

	onMount(async () => {
		await tick();
		if (isUnlocked) {
			const target = getTargetIndices();
			currentIndices = target;
			target.forEach((val, i) => {
				ringAngles[i] = getAngleForIndex(val);
			});
		}
	});

	$effect(() => {
		if (isUnlocked) {
			untrack(() => {
				const target = getTargetIndices();
				currentIndices = target;
				target.forEach((val, i) => {
					ringAngles[i] = getAngleForIndex(val);
				});
			});
		}
	});
</script>

<div class="flex flex-col items-center select-none w-full max-w-md mx-auto">
	<!-- Cryptex Radial Machine Enclosure -->
	<div
		class="relative w-full rounded-3xl border border-neutral-800 bg-black p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
	>
		<!-- Status Header Bar -->
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

		<!-- Interactive Radial Dial Viewport -->
		<div
			role="region"
			aria-label="Mecanismo radial de anillos rúnicos"
			class="relative flex items-center justify-center rounded-2xl border border-neutral-900 bg-gradient-to-b from-neutral-950 via-black to-neutral-950 p-2 sm:p-3 shadow-inner overflow-hidden touch-none"
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
		>
			<!-- Top Master Alignment Notch / Golden Triangle (12 o'clock) -->
			<div class="pointer-events-none absolute top-1 z-30 flex flex-col items-center">
				<div
					class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-amber-500 bg-neutral-950 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
				>
					<span class="font-bold text-amber-400 text-xs">▲</span>
				</div>
				<div class="h-2 w-0.5 bg-amber-400 shadow-[0_0_8px_#f59e0b]"></div>
			</div>

			<!-- Vertical Alignment Ray Guide (Top 12 o'clock downwards) -->
			<div
				class="pointer-events-none absolute top-7 bottom-1/2 left-1/2 z-20 w-[2px] -translate-x-1/2 bg-gradient-to-b from-amber-400 via-amber-400/40 to-transparent shadow-[0_0_10px_#f59e0b]"
			></div>

			<!-- Scalable Radial SVG Engine -->
			<svg
				bind:this={svgRef}
				viewBox="-200 -200 400 400"
				class="w-full max-w-[340px] sm:max-w-[370px] aspect-square cursor-grab active:cursor-grabbing select-none"
			>
				<defs>
					<!-- Radial glowing filters -->
					<filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
						<feMerge>
							<feMergeNode in="blur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
					<filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
						<feMerge>
							<feMergeNode in="blur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>

					<!-- Radial Gradients for Dark Concentric Grooves -->
					<radialGradient id="ring-shading" cx="50%" cy="50%" r="50%">
						<stop offset="70%" stop-color="#121212" stop-opacity="0.9" />
						<stop offset="95%" stop-color="#050505" stop-opacity="1" />
						<stop offset="100%" stop-color="#1e1e1e" stop-opacity="0.9" />
					</radialGradient>
				</defs>

				<!-- Background Outer Cog Rim with 36 teeth -->
				<g opacity="0.35">
					<circle cx="0" cy="0" r="195" fill="none" stroke="#262626" stroke-width="3" />
					{#each Array(36) as _, i}
						{@const rot = i * 10}
						<line
							x1="0"
							y1="-195"
							x2="0"
							y2="-188"
							stroke="#404040"
							stroke-width="2"
							transform="rotate({rot})"
						/>
					{/each}
				</g>

				<!-- 4 CONCENTRIC ROTATING RUNIC RINGS -->
				{#each RINGS as ring, rIndex}
					{@const currentRot = ringAngles[rIndex]}
					{@const isRingFocused = selectedRing === rIndex}
					{@const activeSigilIdx = currentIndices[rIndex]}
					{@const activeSigil = SIGILS[activeSigilIdx]}

					<!-- Ring Track Background -->
					<circle
						cx="0"
						cy="0"
						r={ring.midR}
						fill="none"
						stroke="#0a0a0a"
						stroke-width={ring.outerR - ring.innerR}
					/>
					<!-- Ring Separator Borders -->
					<circle
						cx="0"
						cy="0"
						r={ring.outerR}
						fill="none"
						stroke={isRingFocused ? ring.color : '#262626'}
						stroke-width={isRingFocused ? '1.8' : '1'}
						opacity={isRingFocused ? '0.8' : '0.5'}
					/>
					<circle
						cx="0"
						cy="0"
						r={ring.innerR}
						fill="none"
						stroke="#171717"
						stroke-width="1"
					/>

					<!-- Subtle Gear Notch Marks for the Ring -->
					{#each Array(24) as _, markIdx}
						{@const markAngle = markIdx * 15}
						<line
							x1="0"
							y1={-ring.innerR}
							x2="0"
							y2={-ring.innerR - 4}
							stroke="#262626"
							stroke-width="1"
							transform="rotate({markAngle})"
						/>
					{/each}

					<!-- Rotating Group Containing 6 Sigils (60° intervals) -->
					<g transform="rotate({currentRot})" class="will-change-transform">
						{#each SIGILS as sigil, sIndex}
							{@const angle = sIndex * ANGLE_STEP - 90}
							{@const rad = (angle * Math.PI) / 180}
							{@const x = Math.cos(rad) * ring.midR}
							{@const y = Math.sin(rad) * ring.midR}
							{@const isCurrentAligned = sIndex === activeSigilIdx}

							<!-- Sigil Node on Ring -->
							<g
								role="button"
								tabindex="0"
								aria-label="{sigil.name} en {ring.label}"
								transform="translate({x}, {y})"
								class="cursor-pointer outline-none"
								onclick={() => rotateRingToIndex(rIndex, sIndex, true)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										rotateRingToIndex(rIndex, sIndex, true);
									}
								}}
							>
								<!-- Ambient circular halo for currently aligned sigil (All circles same big size: r=18) -->
								{#if isCurrentAligned}
									<circle
										cx="0"
										cy="0"
										r="18"
										fill={sigil.color}
										opacity="0.22"
									/>
									<circle
										cx="0"
										cy="0"
										r="16"
										fill="none"
										stroke={sigil.color}
										stroke-width="2"
										opacity="0.95"
									/>
								{/if}

								<!-- Clean Text Rune Symbol (All circles same big size: 28px font size across all rings) -->
								<g transform="rotate({-currentRot})">
									<text
										x="0"
										y="1"
										text-anchor="middle"
										dominant-baseline="central"
										font-family="serif"
										font-size={isCurrentAligned ? '28' : '26'}
										font-weight="900"
										fill={isCurrentAligned ? (isUnlocked ? '#34d399' : sigil.color) : '#737373'}
										style={isCurrentAligned ? `filter: drop-shadow(0 0 10px ${sigil.glow});` : ''}
									>
										{sigil.rune}
									</text>
								</g>
							</g>
						{/each}
					</g>

					<!-- Downward Alignment Chevron Arrow at Top 12 o'clock between rings -->
					<g transform="translate(0, {-ring.innerR})" opacity="0.9">
						<polygon
							points="-4,-3 4,-3 0,4"
							fill={isUnlocked ? '#34d399' : ring.color}
							style="filter: drop-shadow(0 0 4px {ring.color});"
						/>
					</g>
				{/each}

				<!-- CENTRAL OCCULT CORE HUB (Clean Industrial Metal Core) -->
				<g>
					<!-- Inner Hub Disc -->
					<circle cx="0" cy="0" r="35" fill="#080808" stroke="#262626" stroke-width="2" />
					<circle
						cx="0"
						cy="0"
						r="29"
						fill="#0d0d0d"
						stroke={isUnlocked ? '#10b981' : '#f59e0b'}
						stroke-width="1.5"
						opacity="0.6"
					/>
					<circle
						cx="0"
						cy="0"
						r="22"
						fill="none"
						stroke="#1e1e1e"
						stroke-width="1"
						stroke-dasharray="3,3"
					/>

					<!-- Central Heritage Seal Text Runic Node -->
					<g opacity={isUnlocked ? '1' : '0.85'}>
						<text
							x="0"
							y="1"
							text-anchor="middle"
							dominant-baseline="central"
							font-family="serif"
							font-size="22"
							font-weight="900"
							fill={isUnlocked ? '#34d399' : '#f59e0b'}
							style={isUnlocked ? 'filter: drop-shadow(0 0 8px #34d399);' : 'filter: drop-shadow(0 0 6px rgba(245,158,11,0.5));'}
						>
							ᛟ
						</text>
					</g>
				</g>
			</svg>
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
