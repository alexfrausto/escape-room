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

	interface PianoKey {
		id: string; // 'C4', 'D4', etc.
		latin: string; // 'DO', 'RE', etc.
		anglo: string; // 'C', 'D', etc.
		freq: number;
		staveY: number; // Y position on 100px stave
	}

	const WHITE_KEYS: PianoKey[] = [
		{ id: 'C4', latin: 'DO', anglo: 'C', freq: 261.63, staveY: 76 },
		{ id: 'D4', latin: 'RE', anglo: 'D', freq: 293.66, staveY: 68 },
		{ id: 'E4', latin: 'MI', anglo: 'E', freq: 329.63, staveY: 60 },
		{ id: 'F4', latin: 'FA', anglo: 'F', freq: 349.23, staveY: 52 },
		{ id: 'G4', latin: 'SOL', anglo: 'G', freq: 392.00, staveY: 44 },
		{ id: 'A4', latin: 'LA', anglo: 'A', freq: 440.00, staveY: 36 },
		{ id: 'B4', latin: 'SI', anglo: 'B', freq: 493.88, staveY: 28 },
		{ id: 'C5', latin: 'DO', anglo: 'C', freq: 523.25, staveY: 20 }
	];

	// Black key positions relative to the 8 white keys (in percentage)
	const BLACK_KEY_OFFSETS = [
		12.5 * 0.7, // C#
		12.5 * 1.7, // D#
		// Gap between E and F
		12.5 * 3.7, // F#
		12.5 * 4.7, // G#
		12.5 * 5.7  // A#
	];

	const targetNotesList = $derived(parseTargetNotes(targetCode || 'FA-LA-SI-FA-LA-SI'));
	const expectedCount = $derived(targetNotesList.length || 6);
	const noteSpacing = $derived(Math.min(32, Math.floor(230 / Math.max(1, expectedCount))));

	let playedNotes = $state<PianoKey[]>([]);
	let activeKeyId = $state<string | null>(null);

	let audioCtx: AudioContext | null = null;

	function playAcousticPianoTone(freq: number) {
		if (typeof window === 'undefined') return;

		const AudioContextClass =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (!AudioContextClass) return;

		if (!audioCtx) {
			audioCtx = new AudioContextClass();
		}
		if (audioCtx.state === 'suspended') {
			audioCtx.resume();
		}

		const now = audioCtx.currentTime;

		// Fundamental body oscillator (warm triangle wave)
		const osc1 = audioCtx.createOscillator();
		osc1.type = 'triangle';
		osc1.frequency.setValueAtTime(freq, now);

		// Sparkle harmonic overtone (sine wave 2nd harmonic)
		const osc2 = audioCtx.createOscillator();
		osc2.type = 'sine';
		osc2.frequency.setValueAtTime(freq * 2, now);

		// Acoustic piano exponential decay envelope
		const gain1 = audioCtx.createGain();
		gain1.gain.setValueAtTime(0, now);
		gain1.gain.linearRampToValueAtTime(0.4, now + 0.015);
		gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

		const gain2 = audioCtx.createGain();
		gain2.gain.setValueAtTime(0, now);
		gain2.gain.linearRampToValueAtTime(0.12, now + 0.01);
		gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

		osc1.connect(gain1);
		gain1.connect(audioCtx.destination);

		osc2.connect(gain2);
		gain2.connect(audioCtx.destination);

		osc1.start(now);
		osc1.stop(now + 1.25);

		osc2.start(now);
		osc2.stop(now + 0.75);

		audio.vibrate(12);
	}

	function pressKey(key: PianoKey) {
		if (isLockedOut || isUnlocked) return;
		if (playedNotes.length >= expectedCount) return;

		playAcousticPianoTone(key.freq);
		activeKeyId = key.id;
		playedNotes = [...playedNotes, key];

		setTimeout(() => {
			if (activeKeyId === key.id) activeKeyId = null;
		}, 180);
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isLockedOut || isUnlocked || playedNotes.length === 0) return;

		// Serialize as Spanish note names: e.g. "DO-MI-SOL-DO"
		const code = playedNotes.map((n) => n.latin).join('-');
		onSubmit(code);
	}

	function parseTargetNotes(code: string): PianoKey[] {
		const result: PianoKey[] = [];
		const cleaned = code.toUpperCase().replace(/[^\w-]/g, '');
		const parts = cleaned.includes('-')
			? cleaned.split('-').map((p) => p.trim())
			: cleaned.match(/(DO|RE|MI|FA|SOL|LA|SI|[CDEFGAB])/g) || [];

		for (const part of parts) {
			const found = WHITE_KEYS.find(
				(k) => k.latin === part || k.anglo === part
			);
			if (found) {
				result.push(found);
			}
		}
		return result;
	}

	// Auto-reset notes on error lockout
	$effect(() => {
		if (isLockedOut) {
			untrack(() => {
				playedNotes = [];
				activeKeyId = null;
			});
		}
	});

	onMount(async () => {
		await tick();
		if (isUnlocked) {
			playedNotes = parseTargetNotes(targetCode || 'FA-LA-SI-FA-LA-SI');
		}
	});

	$effect(() => {
		if (isUnlocked) {
			untrack(() => {
				playedNotes = parseTargetNotes(targetCode || 'FA-LA-SI-FA-LA-SI');
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

		<!-- Interactive Musical Staff (Pentagrama) Display -->
		<div
			class="relative flex flex-col justify-between h-28 sm:h-32 rounded-2xl border-2 border-neutral-800 bg-black p-3 sm:p-4 shadow-[inset_0_0_25px_rgba(0,0,0,0.9)] overflow-hidden font-mono"
		>
			<!-- Stave Header -->
			<div class="relative z-10 flex items-center justify-between text-[11px] font-bold text-neutral-500">
				<span>SCORE // PENTAGRAMA</span>
				<span class="{isUnlocked ? 'text-emerald-400' : 'text-amber-500'} font-black text-[10px]">
					{playedNotes.length}/{expectedCount} NOTAS
				</span>
			</div>

			<!-- Dynamic SVG Musical Staff (5 Lines) -->
			<div class="relative z-10 my-auto w-full h-16 flex items-center justify-center">
				<svg viewBox="0 0 320 90" class="w-full h-full select-none">
					<!-- Treble Clef Graphic Symbol -->
					<text x="12" y="55" fill="#525252" font-size="34" font-family="serif" font-weight="bold">𝄞</text>

					<!-- 5 Staff Lines -->
					<line x1="40" y1="20" x2="310" y2="20" stroke="#262626" stroke-width="1.5" />
					<line x1="40" y1="32" x2="310" y2="32" stroke="#262626" stroke-width="1.5" />
					<line x1="40" y1="44" x2="310" y2="44" stroke="#262626" stroke-width="1.5" />
					<line x1="40" y1="56" x2="310" y2="56" stroke="#262626" stroke-width="1.5" />
					<line x1="40" y1="68" x2="310" y2="68" stroke="#262626" stroke-width="1.5" />

					<!-- Render Played Musical Noteheads along Staff -->
					{#each playedNotes as note, idx}
						{@const noteX = 65 + idx * noteSpacing}
						<!-- C4 Ledger Line if needed (staveY > 70) -->
						{#if note.staveY >= 74}
							<line
								x1={noteX - 8}
								y1={note.staveY}
								x2={noteX + 8}
								y2={note.staveY}
								stroke={isUnlocked ? '#34d399' : isLockedOut ? '#ef4444' : '#f59e0b'}
								stroke-width="1.5"
							/>
						{/if}

						<!-- Notehead (Oval) -->
						<ellipse
							cx={noteX}
							cy={note.staveY}
							rx="5.5"
							ry="4.2"
							transform="rotate(-20 {noteX} {note.staveY})"
							fill={isUnlocked ? '#34d399' : isLockedOut ? '#ef4444' : '#fbbf24'}
							class="drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]"
						/>

						<!-- Note Stem -->
						<line
							x1={noteX + 5}
							y1={note.staveY}
							x2={noteX + 5}
							y2={note.staveY - 22}
							stroke={isUnlocked ? '#34d399' : isLockedOut ? '#ef4444' : '#fbbf24'}
							stroke-width="1.5"
						/>
					{/each}

					<!-- Empty Note Slot Placeholders -->
					{#if playedNotes.length < expectedCount && !isUnlocked}
						{@const nextSlotX = 65 + playedNotes.length * noteSpacing}
						<circle
							cx={nextSlotX}
							cy="44"
							r="3"
							fill="none"
							stroke="#404040"
							stroke-width="1"
							stroke-dasharray="2,2"
							class="animate-pulse"
						/>
					{/if}
				</svg>
			</div>
		</div>

		<!-- Tactical Piano Keyboard Housing -->
		<div class="relative mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-2 sm:p-2.5 shadow-2xl">
			<!-- Piano Keys Bed (8 White Keys + Background Black Keys) -->
			<div class="relative flex w-full h-44 sm:h-48 rounded-xl bg-neutral-900 border border-neutral-800 p-1 gap-1 overflow-hidden select-none">
				<!-- 8 Interactive White Keys -->
				{#each WHITE_KEYS as key}
					{@const isActive = activeKeyId === key.id}
					<button
						type="button"
						disabled={isLockedOut || isUnlocked || playedNotes.length >= expectedCount}
						onclick={() => pressKey(key)}
						class="btn-tactile relative flex-1 flex flex-col justify-end items-center pb-2.5 rounded-b-lg border border-neutral-300 bg-gradient-to-b from-neutral-200 via-neutral-100 to-white shadow-[0_5px_0_#9ca3af] transition-all duration-75 active:shadow-none active:translate-y-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer z-10 {isActive
							? 'bg-amber-100 shadow-none translate-y-1'
							: 'hover:bg-white'}"
					>
						<!-- Key Dual Notation (C / DO) -->
						<span class="font-mono text-sm sm:text-base font-black text-neutral-900 leading-tight">
							{key.anglo}
						</span>
						<span class="font-mono text-[9px] font-bold text-neutral-500 tracking-wider">
							{key.latin}
						</span>

						<!-- Active Key Glow Dot -->
						{#if isActive}
							<div class="absolute bottom-1 h-1 w-3 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></div>
						{/if}
					</button>
				{/each}

				<!-- Realistic Non-Interactive Black Key Accents -->
				{#each BLACK_KEY_OFFSETS as offset}
					<div
						class="pointer-events-none absolute top-1 h-26 sm:h-28 w-[7.8%] rounded-b-md bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border-x border-b border-neutral-800 shadow-[0_4px_6px_rgba(0,0,0,0.9)] z-20"
						style="left: calc({offset}% + 3px);"
					>
						<!-- Black key matte top reflection -->
						<div class="h-full w-full rounded-b-md bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent)]"></div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Unlock Submission Lever / Button -->
		<form onsubmit={handleFormSubmit} class="mt-4">
			<button
				type="submit"
				disabled={isLockedOut || isUnlocked || playedNotes.length === 0}
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