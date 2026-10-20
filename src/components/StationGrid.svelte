<script lang="ts">
	import type { StationDefinition } from '../types';
	import { LockKeyhole, LockKeyholeOpen } from '@lucide/svelte';
	import { gameStore } from '../services/storage';

	interface Props {
		stations: StationDefinition[];
	}

	let { stations }: Props = $props();
</script>

<div class="space-y-4">
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each stations as station, i (station.id)}
			{@const isUnlocked = $gameStore.unlockedStationIds.includes(station.id)}
			<div class="flex flex-col items-center justify-center rounded-lg border p-3 gap-1 { isUnlocked
				? 'bordr-emerald-500/60 bg-emerald-950/40 text-emerald-400'
				: 'border-neutral-800 bg-neutral-900/80 text-neutral-400' }">
				{#if isUnlocked}
					<LockKeyholeOpen size={72} />
				{:else}
					<LockKeyhole size={72} />
				{/if}
				<span class="mt-1 font-mono font-bold tracking-widest" >
					ESTACIÓN 0{i + 1}
				</span>
			</div>
		{/each}
	</div>
</div>
