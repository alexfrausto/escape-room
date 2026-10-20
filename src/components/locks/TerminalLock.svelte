<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { audio } from '../../services/audio';
	import { Lock, Unlock, Delete } from '@lucide/svelte';

	interface Props {
		targetCode: string;
		isUnlocked?: boolean;
		isLockedOut?: boolean;
		onSubmit: (enteredCode: string) => void;
	}

	let { targetCode, isUnlocked = false, isLockedOut = false, onSubmit }: Props = $props();

	const MAX_LENGTH = 10;

	// 16-Letter Tactical Matrix (4x4 Grid)
	// Contains all required target letters (C, E, I, L, P, S for ECLIPSE) + balanced alphabet
	const LETTERS = [
		'A', 'B', 'C', 'D',
		'E', 'F', 'G', 'H',
		'I', 'L', 'M', 'N',
		'O', 'P', 'R', 'S'
	];

	let enteredText = $state<string>('');

	function typeLetter(letter: string) {
		if (isLockedOut || isUnlocked || enteredText.length >= MAX_LENGTH) return;

		enteredText += letter;
		audio.play('beep');
		audio.vibrate(10);
	}

	function handleBackspace() {
		if (isLockedOut || isUnlocked || enteredText.length === 0) return;

		enteredText = enteredText.slice(0, -1);
		audio.play('click');
		audio.vibrate(12);
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		const finalCode = enteredText.trim().toUpperCase();
		if (isLockedOut || isUnlocked || !finalCode) return;

		onSubmit(finalCode);
	}

	function handlePhysicalKeyDown(e: KeyboardEvent) {
		if (isLockedOut || isUnlocked) return;

		if (e.key === 'Backspace') {
			e.preventDefault();
			handleBackspace();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (enteredText.trim()) {
				onSubmit(enteredText.trim().toUpperCase());
			}
		} else if (/^[a-zA-Z]$/.test(e.key)) {
			const char = e.key.toUpperCase();
			if (LETTERS.includes(char)) {
				e.preventDefault();
				typeLetter(char);
			}
		}
	}

	// Reset input on error lockout so player starts over
	$effect(() => {
		if (isLockedOut) {
			untrack(() => {
				enteredText = '';
			});
		}
	});

	onMount(async () => {
		await tick();
		if (isUnlocked) {
			enteredText = targetCode || 'ECLIPSE';
		}
	});

	$effect(() => {
		if (isUnlocked) {
			untrack(() => {
				enteredText = targetCode || 'ECLIPSE';
			});
		}
	});
</script>

<svelte:window onkeydown={handlePhysicalKeyDown} />

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

		<!-- Retro Phosphor CRT Screen -->
		<div
			class="relative flex flex-col justify-between h-36 sm:h-40 rounded-2xl border-2 border-neutral-800 bg-black p-4 sm:p-5 shadow-[inset_0_0_25px_rgba(0,0,0,0.9)] overflow-hidden font-mono"
		>
			<!-- CRT Scanline & Phosphor Vignette Overlay -->
			<div
				class="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] opacity-70"
			></div>
			<div
				class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,0,0,0.85)_100%)]"
			></div>

			<!-- Screen Header Status Strip -->
			<div class="relative z-10 flex items-center justify-between text-[11px] font-bold text-neutral-500">
				<span>SISTEMA</span>
				<span class="{isUnlocked ? 'text-emerald-400' : 'text-amber-500'} font-black">
					{isUnlocked ? 'AUTORIZADO' : 'EN ESPERA'}
				</span>
			</div>

			<!-- Main Prompt & Text Input Area -->
			<div class="relative z-10 my-auto flex flex-col items-center justify-center">
				<div class="text-[11px] text-neutral-500 font-semibold mb-1">
					&gt; CÓDIGO:
				</div>
				<div
					class="flex items-center justify-center tracking-widest text-2xl sm:text-3xl font-black {isUnlocked
						? 'text-emerald-400 drop-shadow-[0_0_10px_#22c55e]'
						: isLockedOut
							? 'text-rose-500 drop-shadow-[0_0_10px_#ef4444]'
							: 'text-amber-400 drop-shadow-[0_0_10px_#f59e0b]'}"
				>
					<span>{enteredText}</span>
					{#if !isUnlocked}
						<span class="inline-block w-2.5 h-6 ml-1 bg-amber-400 animate-pulse"></span>
					{/if}
				</div>
			</div>

			<!-- Screen Bottom Status Strip -->
			<div class="relative z-10 flex items-center justify-between text-[10px] text-neutral-600 font-bold">
				<span>{enteredText.length}/{MAX_LENGTH}</span>
				<span>{isUnlocked ? 'CORRECTO' : 'LISTO'}</span>
			</div>
		</div>

		<!-- 16-Letter Keypad Matrix (4x4 Grid) -->
		<div class="mt-4 grid grid-cols-4 gap-2 sm:gap-2.5 rounded-2xl border border-neutral-800 bg-neutral-950 p-2.5 sm:p-3 shadow-inner">
			{#each LETTERS as letter}
				<button
					type="button"
					disabled={isLockedOut || isUnlocked || enteredText.length >= MAX_LENGTH}
					onclick={() => typeLetter(letter)}
					class="btn-tactile flex items-center justify-center h-12 sm:h-14 rounded-xl border border-neutral-800 bg-neutral-900 font-mono text-base sm:text-lg font-black text-neutral-100 shadow hover:border-amber-500 hover:text-amber-300 hover:bg-neutral-800 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition select-none"
				>
					{letter}
				</button>
			{/each}
		</div>

		<!-- Backspace Utility Action -->
		<div class="mt-2.5 flex justify-end w-full">
			<button
				type="button"
				disabled={isLockedOut || isUnlocked || enteredText.length === 0}
				onclick={handleBackspace}
				class="btn-tactile flex w-full items-center justify-center gap-1.5 h-10 rounded-xl border border-neutral-800 bg-neutral-900 font-mono text-xs font-bold text-neutral-400 shadow hover:border-amber-500/60 hover:text-amber-300 hover:bg-neutral-800 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition select-none"
				title="Borrar último carácter"
			>
				<Delete size={15} />
				<span>BORRAR</span>
			</button>
		</div>

		<!-- Unlock Submission Lever / Button -->
		<form onsubmit={handleFormSubmit} class="mt-3">
			<button
				type="submit"
				disabled={isLockedOut || isUnlocked || enteredText.trim().length === 0}
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