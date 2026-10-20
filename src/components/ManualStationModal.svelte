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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
	>
		<div class="w-full max-w-md overflow-hidden rounded-xl border border-neutral-800">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/90 px-4 py-3">
				<div class="flex items-center gap-2">
					<div class="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></div>
					<h2 class="font-mono text-xs font-bold tracking-widest text-neutral-200 uppercase">
						ACCESO MANUAL
					</h2>
				</div>
				<button
					type="button"
					class="rounded px-2 py-0.5 font-mono text-xs text-neutral-400 hover:text-white"
					onclick={handleClose}
				>
					[ ✕ CERRAR ]
				</button>
			</div>

			<!-- Body Form -->
			<form onsubmit={handleSubmit} class="p-5 space-y-4">
				<div>
					<label for="station-id-input" class="mb-1.5 block font-mono text-xs font-semibold text-neutral-300">
						INGRESA EL CÓDIGO DE LA ESTACIÓN:
					</label>
					<input
						id="station-id-input"
						type="text"
						bind:value={stationInput}
						class="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 font-mono text-sm tracking-wider text-neutral-100 placeholder:normal-case placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
						oninput={() => {
							errorMessage = null;
						}}
					/>
				</div>

				{#if errorMessage}
					<div class="rounded border border-rose-500/50 bg-rose-950/30 px-3 py-2 text-center font-mono text-xs font-semibold text-rose-400 animate-pulse">
						⚠️ {errorMessage}
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex gap-2 pt-2">
					<button
						type="button"
						class="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 py-2.5 font-mono text-xs font-bold text-neutral-300 hover:border-neutral-500 hover:text-white transition"
						onclick={handleClose}
					>
						CANCELAR
					</button>
					<button
						type="submit"
						class="flex-1 rounded-lg border border-amber-600 bg-amber-700 py-2.5 font-mono text-xs font-bold text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:bg-amber-600 transition"
					>
						ACCEDER
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
