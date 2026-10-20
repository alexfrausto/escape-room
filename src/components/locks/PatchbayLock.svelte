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

	interface JackDef {
		id: string;
		label: string;
		x: number;
		color: string;
	}

	const OUTPUT_JACKS: JackDef[] = [
		{ id: 'A', label: 'A', x: 45, color: '#f59e0b' },
		{ id: 'B', label: 'B', x: 121, color: '#10b981' },
		{ id: 'C', label: 'C', x: 198, color: '#38bdf8' },
		{ id: 'D', label: 'D', x: 275, color: '#c084fc' }
	];

	const INPUT_SOCKETS: { id: string; label: string; x: number }[] = [
		{ id: '1', label: '1', x: 45 },
		{ id: '2', label: '2', x: 121 },
		{ id: '3', label: '3', x: 198 },
		{ id: '4', label: '4', x: 275 }
	];

	// Mapping: Jack ID ('A'..'D') -> Socket ID ('1'..'4') or null
	let connections = $state<Record<string, string | null>>({
		A: null,
		B: null,
		C: null,
		D: null
	});

	let activeJackId = $state<string | null>(null);

	function selectJack(jackId: string) {
		if (isLockedOut || isUnlocked) return;

		if (activeJackId === jackId) {
			activeJackId = null;
		} else {
			activeJackId = jackId;
		}
		audio.play('click');
		audio.vibrate(10);
	}

	function connectToSocket(socketId: string) {
		if (isLockedOut || isUnlocked) return;

		// If a jack is currently active, plug it into this socket
		if (activeJackId) {
			// If this socket was already connected to another jack, disconnect that other jack
			for (const [jId, sId] of Object.entries(connections)) {
				if (sId === socketId && jId !== activeJackId) {
					connections[jId] = null;
				}
			}

			// If current active jack was already in this socket, unplug it
			if (connections[activeJackId] === socketId) {
				connections[activeJackId] = null;
				audio.play('click');
				audio.vibrate(10);
			} else {
				connections[activeJackId] = socketId;
				audio.play('clunk');
				audio.vibrate(20);
			}

			activeJackId = null;
		} else {
			// If no active jack, check if any jack is plugged here and unplug it
			for (const [jId, sId] of Object.entries(connections)) {
				if (sId === socketId) {
					connections[jId] = null;
					audio.play('click');
					audio.vibrate(10);
					break;
				}
			}
		}
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isLockedOut || isUnlocked) return;

		// Format as sorted pairs: e.g. "A3-B1-C4-D2"
		const pairs: string[] = [];
		for (const jack of OUTPUT_JACKS) {
			const sId = connections[jack.id];
			if (sId) {
				pairs.push(`${jack.id}${sId}`);
			}
		}

		if (pairs.length === 0) return;
		onSubmit(pairs.sort().join('-'));
	}

	function parseTargetConnections(code: string): Record<string, string | null> {
		const result: Record<string, string | null> = { A: null, B: null, C: null, D: null };
		const parts = code.split('-').map((p) => p.trim().toUpperCase());
		for (const part of parts) {
			const match = part.match(/^([A-D])([1-4])$/);
			if (match) {
				result[match[1]] = match[2];
			}
		}
		return result;
	}

	// Reset connections on error lockout
	$effect(() => {
		if (isLockedOut) {
			untrack(() => {
				connections = { A: null, B: null, C: null, D: null };
				activeJackId = null;
			});
		}
	});

	onMount(async () => {
		await tick();
		if (isUnlocked) {
			connections = parseTargetConnections(targetCode || 'A3-B1-C4-D2');
		}
	});

	$effect(() => {
		if (isUnlocked) {
			untrack(() => {
				connections = parseTargetConnections(targetCode || 'A3-B1-C4-D2');
			});
		}
	});

	const totalConnected = $derived(
		Object.values(connections).filter((s) => s !== null).length
	);
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

		<!-- Patch Bay Matrix Panel -->
		<div
			class="relative flex flex-col justify-between h-56 sm:h-64 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-inner overflow-hidden select-none"
		>
			<!-- Top Row: Source Output Terminals (A, B, C, D) -->
			<div class="relative z-20 flex items-center justify-between px-2">
				{#each OUTPUT_JACKS as jack}
					{@const isSelected = activeJackId === jack.id}
					{@const isPlugged = connections[jack.id] !== null}
					<button
						type="button"
						disabled={isLockedOut || isUnlocked}
						onclick={() => selectJack(jack.id)}
						class="btn-tactile flex flex-col items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed group"
					>
						<!-- Terminal Label & Status LED -->
						<div class="flex items-center gap-1 font-mono text-xs font-black text-neutral-400">
							<span class="h-1.5 w-1.5 rounded-full {isPlugged ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : isSelected ? 'bg-amber-400 animate-ping' : 'bg-neutral-800'}"></span>
							<span class="{isSelected ? 'text-amber-400' : 'group-hover:text-neutral-200'}">{jack.label}</span>
						</div>

						<!-- Output Jack Socket -->
						<div
							class="relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-200 {isSelected
								? 'border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
								: isPlugged
									? 'border-neutral-700 bg-neutral-900'
									: 'border-neutral-800 bg-black hover:border-neutral-600'}"
						>
							<!-- Metal Jack Bezel Core -->
							<div
								class="h-5 w-5 rounded-full border border-neutral-700 shadow-inner flex items-center justify-center"
								style="background-color: {isPlugged ? jack.color : '#171717'}"
							>
								<div class="h-2 w-2 rounded-full bg-black"></div>
							</div>
						</div>
					</button>
				{/each}
			</div>

			<!-- SVG Cables Drooping Layer -->
			<svg
				viewBox="0 0 320 200"
				class="pointer-events-none absolute inset-0 h-full w-full z-10"
			>
				{#each OUTPUT_JACKS as jack}
					{@const targetSocketId = connections[jack.id]}
					{#if targetSocketId}
						{@const targetSocket = INPUT_SOCKETS.find((s) => s.id === targetSocketId)}
						{#if targetSocket}
							<!-- Dynamic Drooping Cable (Bezier Curve) -->
							<!-- Drop shadow cable underlayer -->
							<path
								d="M {jack.x} 38 C {jack.x} 115, {targetSocket.x} 115, {targetSocket.x} 162"
								fill="none"
								stroke="#000000"
								stroke-width="7"
								stroke-linecap="round"
								class="opacity-60"
							/>
							<!-- Main Braided Wire -->
							<path
								d="M {jack.x} 38 C {jack.x} 115, {targetSocket.x} 115, {targetSocket.x} 162"
								fill="none"
								stroke={isUnlocked ? '#10b981' : isLockedOut ? '#ef4444' : jack.color}
								stroke-width="4.5"
								stroke-linecap="round"
								class="drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
							/>
							<!-- Center wire texture reflection -->
							<path
								d="M {jack.x} 38 C {jack.x} 115, {targetSocket.x} 115, {targetSocket.x} 162"
								fill="none"
								stroke="rgba(255,255,255,0.3)"
								stroke-width="1.5"
								stroke-dasharray="2,3"
								stroke-linecap="round"
							/>
						{/if}
					{/if}
				{/each}
			</svg>

			<!-- Bottom Row: Destination Input Sockets (1, 2, 3, 4) -->
			<div class="relative z-20 flex items-center justify-between px-2">
				{#each INPUT_SOCKETS as socket}
					{@const pluggedJack = OUTPUT_JACKS.find((j) => connections[j.id] === socket.id)}
					<button
						type="button"
						disabled={isLockedOut || isUnlocked}
						onclick={() => connectToSocket(socket.id)}
						class="btn-tactile flex flex-col items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed group"
					>
						<!-- Input Socket Receiver -->
						<div
							class="relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-200 {pluggedJack
								? 'border-neutral-700 bg-neutral-900 shadow-md'
								: activeJackId
									? 'border-amber-500/80 bg-amber-950/20 animate-pulse hover:border-amber-400'
									: 'border-neutral-800 bg-black hover:border-neutral-600'}"
						>
							<div
								class="h-5 w-5 rounded-full border border-neutral-700 shadow-inner flex items-center justify-center"
								style="background-color: {pluggedJack ? pluggedJack.color : '#171717'}"
							>
								<div class="h-2 w-2 rounded-full bg-black"></div>
							</div>
						</div>

						<!-- Socket Label & Status LED -->
						<div class="flex items-center gap-1 font-mono text-xs font-black text-neutral-400">
							<span class="h-1.5 w-1.5 rounded-full {pluggedJack ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-neutral-800'}"></span>
							<span class="{pluggedJack ? 'text-neutral-200' : 'group-hover:text-neutral-300'}">{socket.label}</span>
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Unlock Submission Lever / Button -->
		<form onsubmit={handleFormSubmit} class="mt-4">
			<button
				type="submit"
				disabled={isLockedOut || isUnlocked || totalConnected === 0}
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