<script lang="ts">
	import type { StationDefinition } from '../types';
	import { getStationById, getStationByQr } from '../services/verifier';
	import { audio } from '../services/audio';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onStationSelect: (station: StationDefinition) => void;
	}

	let { isOpen, onClose, onStationSelect }: Props = $props();

	let stationInput = $state<string>('');
	let errorMessage = $state<string | null>(null);

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = stationInput.trim();
		if (!trimmed) {
			audio.play('error');
			errorMessage = 'POR FAVOR INGRESA UN CÓDIGO DE ESTACIÓN';
			return;
		}

		// Lookup by ID or QR string
		const station = getStationById(trimmed) || getStationByQr(trimmed);

		if (station) {
			audio.play('beep');
			errorMessage = null;
			stationInput = '';
			onStationSelect(station);
			onClose();
		} else {
			audio.play('error');
			errorMessage = `ESTACIÓN "${trimmed.toUpperCase()}" NO ENCONTRADA`;
		}
	}

	function handleClose() {
		audio.play('click');
		stationInput = '';
		errorMessage = null;
		onClose();
	}
</script>

{#if isOpen}
	<div
		role="dialog"
		aria-modal="true"
		class="fixed inset-0 z-50 flex items-center justify-center bg-[#020510]/88 p-4 backdrop-blur-md"
	>
		<div class="hud-box mi-corners w-full max-w-md overflow-hidden rounded-xl border border-blue-500/45 shadow-[0_0_55px_rgba(37,99,235,0.25)]">
			<div class="mi-hazard-strip h-1 w-full border-b border-blue-400/30"></div>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-blue-900/60 bg-[#050c1e]/95 px-4 py-3">
				<div class="flex items-center gap-2">
					<div class="h-2 w-2 animate-pulse rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></div>
					<h2 class="font-tech text-xs font-extrabold tracking-[0.16em] text-sky-100 uppercase">
						ACCESO MANUAL
					</h2>
				</div>
				<button
					type="button"
					class="btn-tactile rounded px-2 py-0.5 font-mono text-xs text-slate-400 hover:text-white cursor-pointer"
					onclick={handleClose}
				>
					[ ✕ CERRAR ]
				</button>
			</div>

			<!-- Body Form -->
			<form onsubmit={handleSubmit} class="p-5 space-y-4">
				<div>
					<label for="station-id-input" class="mb-2 block font-mono text-[11px] font-bold tracking-wider text-sky-200/90 uppercase">
						CÓDIGO IDENTIFICADOR DE ESTACIÓN:
					</label>
					<input
						id="station-id-input"
						type="text"
						placeholder="Ej. A12BC345"
						bind:value={stationInput}
						class="w-full rounded-lg border border-blue-800/80 bg-[#030714] px-3.5 py-3 font-mono text-sm font-bold tracking-widest text-white uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/70 transition"
						oninput={() => {
							errorMessage = null;
						}}
					/>
				</div>

				{#if errorMessage}
					<div class="rounded-lg border border-red-500/60 bg-red-950/35 px-3 py-2 text-center font-mono text-xs font-bold text-red-300 text-glow-crimson animate-pulse">
						⚠️ {errorMessage}
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex gap-2.5 pt-2">
					<button
						type="button"
						class="btn-tactile flex-1 rounded-lg border border-blue-900/70 bg-[#060f26] py-2.5 font-mono text-xs font-bold tracking-wider text-slate-300 hover:border-blue-600 hover:text-white cursor-pointer"
						onclick={handleClose}
					>
						CANCELAR
					</button>
					<button
						type="submit"
						class="btn-tactile mi-btn-primary font-tech flex-1 rounded-lg py-2.5 text-xs font-extrabold tracking-widest uppercase cursor-pointer"
					>
						ACCEDER
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
