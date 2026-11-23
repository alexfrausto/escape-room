<script lang="ts">
	import { onDestroy } from 'svelte';
	import { gameStore } from '../services/storage';
	import { STATIONS } from '../services/verifier';
	import { Clock, LockKeyhole, Users } from '@lucide/svelte';

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

	const isMissionComplete = $derived(
		STATIONS.length > 0 && $gameStore.unlockedStationIds.length === STATIONS.length
	);

	const progressPercent = $derived(
		STATIONS.length > 0 ? ($gameStore.unlockedStationIds.length / STATIONS.length) * 100 : 0
	);

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

<header class="sticky top-0 z-40 border-b border-blue-900/60 bg-[#030714]/92 backdrop-blur-md shadow-[0_8px_30px_rgba(2,6,23,0.85)]">
	<!-- Top Bar: Secret Admin Hold + Live Mission Timer -->
	<div class="mx-auto flex max-w-4xl items-center justify-between px-3 py-2.5 sm:px-4">
		<!-- Secret 3-second hold glitch badge -->
		<div
			role="button"
			tabindex="0"
			class="relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1 transition hover:bg-blue-950/40"
			onpointerdown={startHold}
			onpointerup={cancelHold}
			onpointerleave={cancelHold}
			oncontextmenu={(e) => e.preventDefault()}
			title="Mantén pulsado durante 3s para acceder al terminal de administración"
		>
			<div class="flex items-center gap-2">
				<div
					class="h-2 w-2 rounded-full {isMissionComplete
						? 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
						: 'animate-pulse bg-sky-400 shadow-[0_0_10px_#38bdf8]'}"
				></div>
				<LockKeyhole size={14} class={isMissionComplete ? 'text-emerald-400' : 'text-blue-400'} />
				<span
					class="font-glitch text-xs sm:text-sm tracking-[0.14em] uppercase {isMissionComplete
						? 'text-emerald-300 text-glow-green'
						: 'text-sky-100 text-glow-blue'}"
				>
					MISIÓN IMPOSIBLE
				</span>
			</div>

			<!-- Visual hold-to-activate progress bar -->
			{#if isHolding}
				<div class="absolute -bottom-1 left-0 right-0 h-1 overflow-hidden rounded-full bg-slate-800">
					<div
						class="h-full bg-gradient-to-r from-blue-500 to-sky-300 transition-all duration-75"
						style="width: {holdProgress}%;"
					></div>
				</div>
			{/if}
		</div>

		<!-- Live Mission Timer -->
		<div
			class="flex items-center gap-2 rounded-md border px-2.5 py-1 shadow-inner {isMissionComplete
				? 'border-emerald-500/45 bg-emerald-950/35'
				: 'border-blue-700/60 bg-[#060f26]'}"
		>
			<Clock size={14} class={isMissionComplete ? 'text-emerald-400' : 'text-sky-400'} />
			<span
				class="font-tech text-xs sm:text-sm font-bold tracking-widest tabular-nums {isMissionComplete
					? 'text-emerald-300 text-glow-green'
					: 'text-sky-200 text-glow-cyan'}"
			>
				{formatTime($gameStore.elapsedSeconds)}
			</span>
		</div>
	</div>

	<!-- Status HUD Bar: Squad Identity & Electric Data-Stream Progress -->
	<div class="border-t border-blue-950/90 bg-[#050c1e]/90 px-3 py-2 sm:px-4">
		<div class="mx-auto max-w-4xl space-y-2">
			<!-- Row: Team Name & Progress Counter -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
				<!-- Squad Identity -->
				<div class="flex items-center gap-2 min-w-0">
					<div class="flex items-center gap-1 rounded border border-blue-700/50 bg-blue-950/50 px-1.5 py-0.5 text-sky-300 shrink-0">
						<Users size={11} class="text-sky-400" />
						<span class="font-mono text-[10px] font-bold tracking-widest uppercase">
							ESCUADRÓN
						</span>
					</div>
					<span
						class="font-mono text-xs sm:text-sm font-bold tracking-wider text-white uppercase truncate"
						title={$gameStore.teamName}
					>
						{$gameStore.teamName || '—'}
					</span>
				</div>

				<!-- Station Breach Counter -->
				<div class="flex items-center justify-between sm:justify-end gap-2 shrink-0">
					<span
						class="font-mono text-[11px] sm:text-xs font-bold tracking-widest uppercase {isMissionComplete
							? 'text-emerald-400 text-glow-green'
							: 'text-sky-300/80'}"
					>
						{$gameStore.unlockedStationIds.length} / {STATIONS.length} VULNERADAS
					</span>
				</div>
			</div>

			<!-- Electric Energy Progress Bar -->
			<div class="relative flex h-2 w-full items-center overflow-visible rounded-full bg-[#030714] border border-blue-900/70 p-[1px]">
				<div
					class="h-full rounded-full transition-all duration-500 {isMissionComplete
						? 'mi-fuse-complete'
						: progressPercent > 0
							? 'mi-fuse-fill'
							: ''}"
					style="width: {progressPercent}%"
				></div>
			</div>
		</div>
	</div>
</header>
