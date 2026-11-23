<script lang="ts">
	import type { StationDefinition } from '../types';
	import { LockKeyhole, LockKeyholeOpen, ShieldCheck, ShieldAlert } from '@lucide/svelte';
	import { gameStore } from '../services/storage';

	interface Props {
		stations: StationDefinition[];
	}

	let { stations }: Props = $props();
</script>

<div class="space-y-4">
	<!-- Section Telemetry Header -->
	<div class="flex items-center justify-between border-b border-blue-900/50 pb-2 font-mono text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
		<span>RED DE SEGURIDAD // OBJETIVOS ACTIVOS</span>
		<span class="text-sky-400/90">ENLACE ACTIVO</span>
	</div>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each stations as station, i (station.id)}
			{@const isUnlocked = $gameStore.unlockedStationIds.includes(station.id)}
			{@const stationNum = String(i + 1).padStart(2, '0')}
			<div
				class="hud-box mi-corners relative flex flex-col items-center justify-between overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all duration-300 {isUnlocked
					? 'mi-corners-emerald border-emerald-500/55 bg-emerald-950/25 text-emerald-400 shadow-[0_0_26px_rgba(16,185,129,0.2)]'
					: 'border-blue-800/50 text-sky-300 hover:border-sky-400/60'}"
			>
				<!-- Subtle Top Status Telemetry Strip -->
				<div class="flex w-full items-center justify-between font-mono text-[10px] font-bold tracking-widest">
					<span class={isUnlocked ? 'text-emerald-400/90' : 'text-blue-400/80'}>
						SEC-{stationNum}
					</span>
					<span class="flex items-center gap-1.5">
						<span
							class="h-1.5 w-1.5 rounded-full {isUnlocked
								? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
								: 'bg-sky-400/90 shadow-[0_0_8px_#38bdf8]'}"
						></span>
					</span>
				</div>

				<!-- Central Vault Padlock Icon -->
				<div
					class="my-3 flex h-20 w-20 sm:h-22 sm:w-22 items-center justify-center rounded-full border transition-all {isUnlocked
						? 'border-emerald-400/50 bg-emerald-950/45 text-emerald-300 shadow-[0_0_26px_rgba(16,185,129,0.3)]'
						: 'border-blue-500/35 bg-[#040a1a] text-blue-400 shadow-[0_0_22px_rgba(37,99,235,0.22)]'}"
				>
					{#if isUnlocked}
						<LockKeyholeOpen size={40} class="drop-shadow-[0_0_10px_rgba(16,185,129,0.75)]" />
					{:else}
						<LockKeyhole size={40} class="text-sky-300 drop-shadow-[0_0_10px_rgba(59,130,246,0.75)]" />
					{/if}
				</div>

				<!-- Station Title & Clearance Status Pill -->
				<div class="flex flex-col items-center gap-1.5 text-center w-full">
					<span
						class="font-tech text-xs sm:text-sm font-bold tracking-[0.14em] uppercase {isUnlocked
							? 'text-emerald-300 text-glow-green'
							: 'text-white text-glow-blue'}"
					>
						ESTACIÓN {stationNum}
					</span>

					<span
						class="inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[9px] font-bold tracking-widest uppercase border {isUnlocked
							? 'border-emerald-500/45 bg-emerald-950/60 text-emerald-300'
							: 'border-blue-500/40 bg-blue-950/50 text-sky-300'}"
					>
						{#if isUnlocked}
							<ShieldCheck size={10} />
							VULNERADA
						{:else}
							<ShieldAlert size={10} />
							BLOQUEADA
						{/if}
					</span>
				</div>
			</div>
		{/each}
	</div>
</div>
