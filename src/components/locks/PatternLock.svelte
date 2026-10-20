<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { audio } from '../../services/audio';
	import { Lock, Unlock } from '@lucide/svelte';

	interface Props {
		targetCode: string;
		isUnlocked?: boolean;
		isLockedOut?: boolean;
		onSubmit: (enteredCode: string) => void;
	}

	let { targetCode, isUnlocked = false, isLockedOut = false, onSubmit }: Props = $props();

	// 3x3 Grid Coordinates (ViewBox: 300 x 300)
	interface NodePoint {
		id: number;
		x: number;
		y: number;
	}

	const NODES: NodePoint[] = [
		{ id: 1, x: 50, y: 50 },
		{ id: 2, x: 150, y: 50 },
		{ id: 3, x: 250, y: 50 },
		{ id: 4, x: 50, y: 150 },
		{ id: 5, x: 150, y: 150 },
		{ id: 6, x: 250, y: 150 },
		{ id: 7, x: 50, y: 250 },
		{ id: 8, x: 150, y: 250 },
		{ id: 9, x: 250, y: 250 }
	];

	let selectedNodes = $state<number[]>([]);
	let isDragging = $state<boolean>(false);
	let currentPointer = $state<{ x: number; y: number } | null>(null);
	let svgContainer: SVGSVGElement | null = $state(null);

	function getNodeById(id: number): NodePoint | undefined {
		return NODES.find((n) => n.id === id);
	}

	function addNode(id: number) {
		if (isLockedOut || isUnlocked) return;
		if (selectedNodes.includes(id)) return;

		selectedNodes = [...selectedNodes, id];
		audio.play('beep');
		audio.vibrate(12);
	}

	function handlePointerDown(e: PointerEvent, id?: number) {
		if (isLockedOut || isUnlocked) return;
		isDragging = true;

		if (id !== undefined) {
			if (!selectedNodes.includes(id)) {
				addNode(id);
			}
		}

		updatePointerCoords(e);
	}

	function updatePointerCoords(e: PointerEvent) {
		if (!svgContainer) return;
		const rect = svgContainer.getBoundingClientRect();
		const scaleX = 300 / rect.width;
		const scaleY = 300 / rect.height;
		currentPointer = {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY
		};
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging || isLockedOut || isUnlocked) return;
		updatePointerCoords(e);

		if (!currentPointer) return;

		// Hit-test against nodes (radius: 35)
		const HIT_RADIUS = 35;
		for (const node of NODES) {
			const dx = currentPointer.x - node.x;
			const dy = currentPointer.y - node.y;
			if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) {
				if (!selectedNodes.includes(node.id)) {
					addNode(node.id);
				}
				break;
			}
		}
	}

	function handlePointerUp() {
		isDragging = false;
		currentPointer = null;
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isLockedOut || isUnlocked || selectedNodes.length === 0) return;

		onSubmit(selectedNodes.join('-'));
	}

	// Auto-reset sequence on error lockout so player can start over
	$effect(() => {
		if (isLockedOut) {
			untrack(() => {
				selectedNodes = [];
				isDragging = false;
				currentPointer = null;
			});
		}
	});

	function parseTargetNodes(code: string): number[] {
		const digits = code.replace(/[^\d]/g, '').split('').map((n) => parseInt(n, 10));
		return digits.filter((n) => n >= 1 && n <= 9);
	}

	onMount(async () => {
		await tick();
		if (isUnlocked) {
			selectedNodes = parseTargetNodes(targetCode || '1-5-9-8-7');
		}
	});

	$effect(() => {
		if (isUnlocked) {
			untrack(() => {
				selectedNodes = parseTargetNodes(targetCode || '1-5-9-8-7');
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

		<!-- Pattern Matrix Canvas Box -->
		<div
			class="relative flex items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 p-3 sm:p-4 shadow-inner overflow-hidden touch-none"
		>
			<svg
				bind:this={svgContainer}
				viewBox="0 0 300 300"
				role="application"
				aria-label="Matriz de patrón táctico"
				class="w-full max-w-[280px] sm:max-w-[310px] aspect-square cursor-crosshair select-none"
				onpointerdown={(e) => handlePointerDown(e)}
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
				onpointercancel={handlePointerUp}
			>
				<!-- Subtle Background Grid Guidelines -->
				<line x1="50" y1="50" x2="250" y2="50" stroke="#262626" stroke-width="1" stroke-dasharray="2,4" />
				<line x1="50" y1="150" x2="250" y2="150" stroke="#262626" stroke-width="1" stroke-dasharray="2,4" />
				<line x1="50" y1="250" x2="250" y2="250" stroke="#262626" stroke-width="1" stroke-dasharray="2,4" />
				<line x1="50" y1="50" x2="50" y2="250" stroke="#262626" stroke-width="1" stroke-dasharray="2,4" />
				<line x1="150" y1="50" x2="150" y2="250" stroke="#262626" stroke-width="1" stroke-dasharray="2,4" />
				<line x1="250" y1="50" x2="250" y2="250" stroke="#262626" stroke-width="1" stroke-dasharray="2,4" />

				<!-- Committed Pattern Connecting Lines -->
				{#if selectedNodes.length > 1}
					{#each selectedNodes.slice(0, -1) as nodeId, i}
						{@const p1 = getNodeById(nodeId)}
						{@const p2 = getNodeById(selectedNodes[i + 1])}
						{#if p1 && p2}
							<!-- Glow Filter Effect -->
							<line
								x1={p1.x}
								y1={p1.y}
								x2={p2.x}
								y2={p2.y}
								stroke={isUnlocked ? '#10b981' : isLockedOut ? '#ef4444' : '#f59e0b'}
								stroke-width="5"
								stroke-linecap="round"
								class="opacity-40 blur-[2px]"
							/>
							<line
								x1={p1.x}
								y1={p1.y}
								x2={p2.x}
								y2={p2.y}
								stroke={isUnlocked ? '#34d399' : isLockedOut ? '#f87171' : '#fbbf24'}
								stroke-width="3"
								stroke-linecap="round"
							/>
						{/if}
					{/each}
				{/if}

				<!-- Live Dynamic Drag Line to Current Pointer -->
				{#if isDragging && currentPointer && selectedNodes.length > 0 && !isUnlocked && !isLockedOut}
					{@const lastNode = getNodeById(selectedNodes[selectedNodes.length - 1])}
					{#if lastNode}
						<line
							x1={lastNode.x}
							y1={lastNode.y}
							x2={currentPointer.x}
							y2={currentPointer.y}
							stroke="#f59e0b"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-dasharray="4,4"
							class="opacity-80"
						/>
					{/if}
				{/if}

				<!-- 3x3 Tactical Nodes -->
				{#each NODES as node}
					{@const isSelected = selectedNodes.includes(node.id)}
					{@const isLast = selectedNodes.length > 0 && selectedNodes[selectedNodes.length - 1] === node.id}
					<g
						class="cursor-pointer"
						role="button"
						tabindex="0"
						aria-label={`Nodo ${node.id}`}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								addNode(node.id);
							}
						}}
						onpointerdown={(e) => {
							e.stopPropagation();
							handlePointerDown(e, node.id);
						}}
					>
						<!-- Outer Node Bezel Ring -->
						<circle
							cx={node.x}
							cy={node.y}
							r="24"
							fill="#0a0a0a"
							stroke={isSelected
								? isUnlocked
									? '#10b981'
									: isLockedOut
										? '#ef4444'
										: '#f59e0b'
								: '#262626'}
							stroke-width={isSelected ? '2.5' : '1.5'}
							class="transition-colors duration-200"
						/>

						<!-- Active Node Pulse Ring -->
						{#if isSelected}
							<circle
								cx={node.x}
								cy={node.y}
								r="30"
								fill="none"
								stroke={isUnlocked ? '#10b981' : isLockedOut ? '#ef4444' : '#f59e0b'}
								stroke-width="1"
								class="opacity-40 animate-ping"
							/>
						{/if}

						<!-- Inner Node Core -->
						<circle
							cx={node.x}
							cy={node.y}
							r={isSelected ? '10' : '6'}
							fill={isSelected
								? isUnlocked
									? '#34d399'
									: isLockedOut
										? '#ef4444'
										: '#fbbf24'
								: '#404040'}
							class="transition-all duration-200"
						/>

						<!-- Subtle Node Number (1-9) -->
						<text
							x={node.x}
							y={node.y + 3.5}
							text-anchor="middle"
							fill={isSelected ? '#000' : '#737373'}
							font-size="8"
							font-family="monospace"
							font-weight="bold"
							pointer-events="none"
						>
							{node.id}
						</text>
					</g>
				{/each}
			</svg>
		</div>

		<!-- Unlock Submission Lever / Button -->
		<form onsubmit={handleFormSubmit} class="mt-4">
			<button
				type="submit"
				disabled={isLockedOut || isUnlocked || selectedNodes.length === 0}
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