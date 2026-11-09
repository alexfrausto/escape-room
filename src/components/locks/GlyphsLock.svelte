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

	interface GlyphToken {
		id: string;
		emoji: string;
		letter: string;
		name: string;
	}

	// 15 Carved Artifact Tokens (3 rows x 5 columns)
	const ALL_TOKENS: GlyphToken[] = [
		{ id: 'a', emoji: '🥑', letter: 'a', name: 'AGUACATE' },
		{ id: 'e', emoji: '🐘', letter: 'e', name: 'ELEFANTE' },
		{ id: 'd', emoji: '🎲', letter: 'd', name: 'DADO' },
		{ id: 'n', emoji: '☁️', letter: 'n', name: 'NUBE' },
		{ id: 'c', emoji: '☕', letter: 'c', name: 'CAFÉ' },

		{ id: 'l', emoji: '🍋', letter: 'l', name: 'LIMÓN' },
		{ id: 'r', emoji: '🤖', letter: 'r', name: 'ROBOT' },
		{ id: 'p', emoji: '🍕', letter: 'p', name: 'PIZZA' },
		{ id: 'v', emoji: '🌋', letter: 'v', name: 'VOLCÁN' },
		{ id: 's', emoji: '☀️', letter: 's', name: 'SOL' },

		{ id: 'm', emoji: '🍎', letter: 'm', name: 'MANZANA' },
		{ id: 'y', emoji: '🪀', letter: 'y', name: 'YOYO' },
		{ id: 't', emoji: '🌮', letter: 't', name: 'TACO' },
		{ id: 'f', emoji: '👻', letter: 'f', name: 'FANTASMA' },
		{ id: 'g', emoji: '🎸', letter: 'g', name: 'GUITARRA' }
	];

	const TOTAL_SLOTS = 5;
	const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

	// 5 Altar Sockets
	let slottedTokens = $state<(GlyphToken | null)[]>([null, null, null, null, null]);

	function findTokenForLetter(letter: string): GlyphToken | undefined {
		return ALL_TOKENS.find((t) => t.letter === letter.toLowerCase());
	}

	function handleTrayTokenClick(token: GlyphToken) {
		if (isLockedOut || isUnlocked) return;

		// Check if already in a slot
		const existingSlotIndex = slottedTokens.findIndex((t) => t?.id === token.id);
		if (existingSlotIndex !== -1) {
			// Unslot
			slottedTokens[existingSlotIndex] = null;
			audio.play('click');
			audio.vibrate(10);
			return;
		}

		// Find first empty slot
		const emptyIndex = slottedTokens.findIndex((t) => t === null);
		if (emptyIndex !== -1) {
			slottedTokens[emptyIndex] = token;
			audio.play('clunk');
			audio.vibrate(18);
		} else {
			// All slots full
			audio.play('click');
		}
	}

	function handleSlotClick(slotIndex: number) {
		if (isLockedOut || isUnlocked) return;
		if (slottedTokens[slotIndex]) {
			slottedTokens[slotIndex] = null;
			audio.play('click');
			audio.vibrate(10);
		}
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isLockedOut || isUnlocked) return;

		// Check if all 5 slots are populated
		const filledCount = slottedTokens.filter((t) => t !== null).length;
		if (filledCount < TOTAL_SLOTS) {
			audio.play('click');
			return;
		}

		const code = slottedTokens.map((t) => t?.letter || '').join('');
		onSubmit(code);
	}

	function getTargetTokens(): (GlyphToken | null)[] {
		const targetLetters = (targetCode || 'enrvy').toLowerCase().replace(/[^a-z]/g, '').slice(0, 5);
		const result: (GlyphToken | null)[] = [];
		for (const char of targetLetters) {
			const match = findTokenForLetter(char);
			result.push(match || null);
		}
		while (result.length < TOTAL_SLOTS) {
			result.push(null);
		}
		return result;
	}

	// Auto-reset altar sockets on error lockout so player tries again
	$effect(() => {
		if (isLockedOut) {
			untrack(() => {
				slottedTokens = [null, null, null, null, null];
			});
		}
	});

	onMount(async () => {
		await tick();
		if (isUnlocked) {
			slottedTokens = getTargetTokens();
		}
	});

	$effect(() => {
		if (isUnlocked) {
			untrack(() => {
				slottedTokens = getTargetTokens();
			});
		}
	});

	const filledCount = $derived(slottedTokens.filter((t) => t !== null).length);
</script>

<div class="flex flex-col items-center select-none w-full max-w-md mx-auto">
	<!-- Heavy Relic Tablet Housing (Neutral & Black) -->
	<div
		class="relative w-full rounded-3xl border border-neutral-800 bg-black p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
	>
		<!-- Status Header Bar (No Lock Type Names) -->
		<div class="flex items-center justify-between pb-3 px-1 text-xs font-mono font-bold">
			<div class="flex items-center gap-1.5">
				<div class="h-2 w-2 rounded-full border border-neutral-700 bg-neutral-900"></div>
				<span class="text-[10px] text-neutral-500 font-mono tracking-wider">
					{filledCount}/{TOTAL_SLOTS} SELLOS
				</span>
			</div>
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

		<!-- Altar Pedestals / Sockets Chamber -->
		<div class="relative rounded-2xl border border-neutral-800 bg-neutral-950 p-3 sm:p-4 shadow-inner">
			<!-- Socket Chamber Header Label -->
			<div class="flex items-center justify-between pb-2 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest px-1">
				<span>CÓDIGO</span>
				<span class={filledCount === TOTAL_SLOTS ? 'text-amber-400' : 'text-neutral-600'}>
					{filledCount === TOTAL_SLOTS ? 'LISTO' : 'EN ESPERA'}
				</span>
			</div>

			<!-- 5 Altar Sockets (Pedestales) -->
			<div class="grid grid-cols-5 gap-1.5 sm:gap-2.5 pt-1">
				{#each slottedTokens as token, idx}
					{@const isFilled = token !== null}
					<button
						type="button"
						disabled={isLockedOut || isUnlocked || !isFilled}
						onclick={() => handleSlotClick(idx)}
						class="btn-tactile relative flex flex-col items-center justify-between h-20 sm:h-22 rounded-xl border-2 transition-all duration-200 select-none {isUnlocked
							? 'border-emerald-500/80 bg-emerald-950/30 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
							: isFilled
								? 'border-amber-500/80 bg-amber-950/20 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:border-amber-400 cursor-pointer'
								: 'border-dashed border-neutral-800 bg-black/60 opacity-60 cursor-default'}"
						title={isFilled ? 'Retirar sello' : `Pedestal ${ROMAN_NUMERALS[idx]}`}
					>
						<!-- Roman Numeral Pedestal Index -->
						<span class="pt-1 font-mono text-[9px] font-bold text-neutral-500">
							{ROMAN_NUMERALS[idx]}
						</span>

						<!-- Emoji Token Placement Display -->
						<div class="my-auto flex items-center justify-center">
							{#if isFilled}
								<span class="text-2xl sm:text-3xl filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] transition-transform active:scale-95">
									{token.emoji}
								</span>
							{:else}
								<div class="h-3 w-3 rounded-full border border-dashed border-neutral-700 bg-neutral-900/40"></div>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Token Vault Tray (Bandeja de Sellos Disponibles) -->
		<div class="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-2.5 sm:p-3 shadow-inner">
			<div class="mb-2 px-1 flex items-center justify-between text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">
				<span>BANDEJA DE SELLOS</span>
				<span class="text-[9px] text-neutral-600">TOCA PARA COLOCAR / RETIRAR</span>
			</div>

			<!-- 15 Relic Tokens Grid (3 rows x 5 columns) -->
			<div class="grid grid-cols-5 gap-1.5 sm:gap-2">
				{#each ALL_TOKENS as token}
					{@const isSelected = slottedTokens.some((t) => t?.id === token.id)}
					<button
						type="button"
						disabled={isLockedOut || isUnlocked}
						onclick={() => handleTrayTokenClick(token)}
						class="btn-tactile relative flex items-center justify-center h-13 sm:h-15 rounded-xl border p-1 transition-all duration-150 select-none cursor-pointer {isSelected
							? 'border-amber-500/50 bg-amber-950/40 opacity-35 shadow-inner'
							: 'border-neutral-800 bg-neutral-900/90 hover:border-neutral-600 hover:bg-neutral-800 shadow active:scale-95'}"
						title={token.emoji}
					>
						<!-- Emoji Character -->
						<span class="text-2xl sm:text-3xl filter drop-shadow">
							{token.emoji}
						</span>

						<!-- Active Docked Badge Indicator -->
						{#if isSelected}
							<div class="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]"></div>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- Unlock Submission Lever / Button -->
		<form onsubmit={handleFormSubmit} class="mt-4">
			<button
				type="submit"
				disabled={isLockedOut || isUnlocked || filledCount < TOTAL_SLOTS}
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
