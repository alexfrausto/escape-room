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

	function getTargetStates(): number[] {
		if (targetCode) {
			const parts = targetCode.split('-').map((s) => (s.trim() === '1' ? 1 : 0));
			if (parts.length >= 5) return parts.slice(0, 5);
		}
		return [1, 0, 1, 0, 1];
	}

	// 5 toggle switches: 1 for UP, 0 for DOWN
	let switchStates = $state<number[]>([0, 0, 0, 0, 0]);

	// Flip an individual switch with tactile mechanical clunk
	function toggleSwitch(index: number) {
		if (isLockedOut || isUnlocked) return;

		const nextState = switchStates[index] === 1 ? 0 : 1;
		switchStates[index] = nextState;

		// Heavy mechanical clunk sound and haptic vibration
		audio.play('clunk');
		audio.vibrate(nextState === 1 ? 25 : 18);
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isLockedOut || isUnlocked) return;

		// Serialize as: "1-0-1-0-1"
		const code = switchStates.join('-');
		onSubmit(code);
	}

	onMount(async () => {
		await tick();
		if (isUnlocked) {
			switchStates = getTargetStates();
		}
	});

	$effect(() => {
		if (isUnlocked) {
			untrack(() => {
				switchStates = getTargetStates();
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

		<!-- Switch Panel Enclosure (5 Clean Industrial Toggles) -->
		<div class="relative rounded-2xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5 shadow-inner">
			<!-- 5 Vertical Switch Channels -->
			<div class="grid grid-cols-5 gap-2 sm:gap-3">
				{#each switchStates as state, i}
					{@const isUp = state === 1}
					<div
						role="switch"
						tabindex="0"
						aria-checked={isUp}
						aria-label={`Interruptor ${i + 1}`}
						onclick={() => toggleSwitch(i)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								toggleSwitch(i);
							}
						}}
						class="group relative flex h-40 sm:h-44 w-full cursor-pointer flex-col items-center justify-between rounded-xl border border-neutral-800 bg-black py-3 shadow-inner transition hover:border-neutral-700 outline-none {isUnlocked ? 'border-emerald-500/40' : ''}"
					>
						<!-- Top Status LED Indicator -->
						<div
							class="h-3 w-3 rounded-full border transition-all duration-200 {isUp
								? 'border-emerald-400 bg-emerald-500 shadow-[0_0_12px_#22c55e]'
								: 'border-neutral-800 bg-neutral-900 opacity-40'}"
						></div>

						<!-- Recessed Switch Track -->
						<div class="relative h-24 sm:h-26 w-8 sm:w-9 rounded-lg border border-neutral-800 bg-neutral-900/90 shadow-inner overflow-hidden p-1">
							<!-- Track Center Slot -->
							<div class="absolute inset-y-1.5 left-1/2 w-[3px] -translate-x-1/2 bg-black rounded-full"></div>

							<!-- Moving Mechanical Lever Actuator -->
							<div
								class="relative w-full h-9 rounded-md border shadow-lg transition-all duration-200 ease-out cursor-pointer flex items-center justify-center {isUp
									? 'top-0 border-neutral-600 bg-gradient-to-b from-neutral-200 via-neutral-400 to-neutral-500 shadow-[0_4px_12px_rgba(0,0,0,0.85)]'
									: 'top-[calc(100%-2.25rem)] border-neutral-700 bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900 shadow-[0_-4px_12px_rgba(0,0,0,0.85)]'}"
							>
								<!-- Grip Grooves -->
								<div class="flex flex-col gap-0.5 opacity-60">
									<div class="h-[1.5px] w-4 bg-neutral-950 rounded-full"></div>
									<div class="h-[1.5px] w-4 bg-neutral-950 rounded-full"></div>
									<div class="h-[1.5px] w-4 bg-neutral-950 rounded-full"></div>
								</div>
							</div>
						</div>

						<!-- Bottom Status Indicator -->
						<div
							class="h-2 w-2 rounded-full border transition-all duration-200 {!isUp
								? 'border-neutral-600 bg-neutral-700'
								: 'border-neutral-800 bg-neutral-900 opacity-30'}"
						></div>
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
