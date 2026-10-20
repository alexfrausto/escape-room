<script lang="ts">
	import { onDestroy } from 'svelte';
	import { gameStore } from '../services/storage';
	import { STATIONS } from '../services/verifier';
	import { Clock, Users } from '@lucide/svelte';

	interface Props {
		onOpenAdmin: () => void;
	}

	let { onOpenAdmin }: Props = $props();

	const HOLD_DURATION_MS = 3000;
	let holdTimer: ReturnType<typeof setTimeout> | null = null;
	let holdStartTime = $state<number | null>(null);
	let holdProgress = $state<number>(0);
	let holdAnimFrame: number | null = null;
	let isHolding = $state<boolean>(false);

	function startHold() {
		isHolding = true;
		holdStartTime = Date.now();

		const updateProgress = () => {
			if (!holdStartTime) return;
			const elapsed = Date.now() - holdStartTime;
			holdProgress = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);

			if (elapsed < HOLD_DURATION_MS) {
				holdAnimFrame = requestAnimationFrame(updateProgress);
			}
		};
		holdAnimFrame = requestAnimationFrame(updateProgress);

		holdTimer = setTimeout(() => {
			cancelHold(false);
			onOpenAdmin();
		}, HOLD_DURATION_MS);
	}

	function cancelHold(_eventOrPlaySound?: unknown) {
		isHolding = false;
		holdStartTime = null;
		holdProgress = 0;
		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = null;
		}
		if (holdAnimFrame) {
			cancelAnimationFrame(holdAnimFrame);
			holdAnimFrame = null;
		}
	}

	// Format elapsed seconds as HH:MM:SS
	function formatTime(totalSeconds: number): string {
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		const pad = (n: number) => n.toString().padStart(2, '0');
		if (hours > 0) {
			return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
		}
		return `${pad(minutes)}:${pad(seconds)}`;
	}

	onDestroy(() => {
		cancelHold(false);
	});
</script>

<header class="sticky top-0 z-40 border-b border-neutral-800 backdrop-blur-md bg-black/90">
	<!-- Top Bar: Secret Admin Hold + Live Game Timer -->
	<div class="mx-auto flex max-w-4xl items-center justify-between px-3 py-2 sm:px-4">
		<!-- Secret 3-second hold title -->
		<div
			role="button"
			tabindex="0"
			class="relative flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1 transition hover:bg-neutral-900/50"
			onpointerdown={startHold}
			onpointerup={cancelHold}
			onpointerleave={cancelHold}
			oncontextmenu={(e) => e.preventDefault()}
			title="Mantén pulsado durante 3s para acceder al terminal de administración"
		>
			<div class="flex items-center gap-2">
				<div class="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e]"></div>
				<span class="font-mono text-xs sm:text-sm font-black tracking-widest text-neutral-100">
					ESCAPE ROOM
				</span>
			</div>

			<!-- Visual hold-to-activate progress bar -->
			{#if isHolding}
				<div class="absolute -bottom-1 left-0 right-0 h-1 overflow-hidden rounded-full bg-neutral-800">
					<div
						class="h-full bg-amber-400 transition-all duration-75"
						style="width: {holdProgress}%;"
					></div>
				</div>
			{/if}
		</div>

		<!-- Live Game Timer -->
		<div class="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/80 px-2.5 py-1 text-neutral-400 shadow-inner">
			<Clock size={14} class="text-amber-400" />
			<span class="font-mono text-xs sm:text-sm font-bold tracking-wider text-amber-400">
				{formatTime($gameStore.elapsedSeconds)}
			</span>
		</div>
	</div>

	<!-- Status HUD Bar: Team Identity & Station Progress Counter -->
	<div class="border-t border-neutral-800/80 bg-neutral-950/70 px-3 py-1.5 sm:px-4">
		<div class="mx-auto max-w-4xl space-y-1.5">
			<!-- Row: Team Name & Progress Counter -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
				<!-- Team Name Identity (fits up to 30 characters easily) -->
				<div class="flex items-center gap-2 min-w-0">
					<div class="flex items-center gap-1 rounded bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 text-neutral-400 shrink-0">
						<Users size={12} class="text-neutral-400" />
						<span class="font-mono text-[10px] font-bold tracking-wider uppercase text-neutral-400">
							EQUIPO
						</span>
					</div>
					<span
						class="font-mono text-xs sm:text-sm font-bold tracking-wide text-neutral-100 uppercase truncate"
						title={$gameStore.teamName}
					>
						{$gameStore.teamName || '—'}
					</span>
				</div>

				<!-- Station Unlock Counter -->
				<div class="flex items-center justify-between sm:justify-end gap-2 shrink-0">
					<span class="font-mono text-[11px] sm:text-xs font-bold tracking-wider {$gameStore.unlockedStationIds.length === STATIONS.length ? 'text-emerald-400 text-glow-green' : 'text-neutral-400'}">
						{$gameStore.unlockedStationIds.length} / {STATIONS.length} DESBLOQUEADOS
					</span>
				</div>
			</div>

			<!-- Station Progress Bar -->
			<div class="flex h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
				<div
					class="bg-amber-500 transition-all duration-300 rounded-full"
					style="width: {($gameStore.unlockedStationIds.length / STATIONS.length) * 100}%"
				></div>
			</div>
		</div>
	</div>
</header>
