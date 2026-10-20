<script lang="ts">
	import { gameStore } from '../services/storage';
	import { audio } from '../services/audio';

	let teamNameInput = $state<string>('');
	let nameError = $state<string | null>(null);

	function handleStartGame(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = teamNameInput.trim();
		if (!trimmed) {
			audio.play('error');
			nameError = 'POR FAVOR INGRESA EL NOMBRE DEL EQUIPO';
			return;
		}

		nameError = null;
		audio.play('clunk');
		gameStore.startGame(trimmed);
	}
</script>

<div class="relative flex min-h-screen flex-col items-center justify-between p-4 sm:p-6 crt-overlay bg-black text-neutral-100">
	<div class="my-auto w-full max-w-lg py-6">
		<div class="hud-box relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-5 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.85)]">
			<!-- Header Badge -->
			<div class="mb-5 border-b border-neutral-800 pb-4 text-center">
				<div class="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/50 px-3 py-1 font-mono text-xs font-bold text-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
					<span class="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e]"></span>
					EN ESPERA
				</div>
				<h1 class="mt-3 font-mono text-xl sm:text-2xl font-black tracking-wider text-neutral-100">
					ESCAPE ROOM
				</h1>
				<p class="mt-1 font-mono text-xs text-neutral-400">
					Ingresa el nombre del equipo para iniciar el cronómetro.
				</p>
			</div>

			<!-- Registration Form -->
			<form onsubmit={handleStartGame} class="space-y-5">
				<!-- Team Name Manual Input -->
				<div>
					<label for="team-name" class="mb-1.5 flex items-center justify-between font-mono text-xs font-bold text-neutral-300">
						<span>NOMBRE DEL EQUIPO:</span>
						<span class="text-[11px] font-normal text-neutral-400">MÁX 30 CARACTERES</span>
					</label>
					<div class="relative">
						<input
							id="team-name"
							type="text"
							maxlength="30"
							bind:value={teamNameInput}
							class="w-full rounded-lg border bg-black px-4 py-3 font-mono text-base font-bold text-neutral-100 uppercase tracking-wider transition placeholder:normal-case placeholder:text-neutral-500 {nameError
								? 'border-rose-500 bg-rose-950/20 text-rose-300'
								: 'border-neutral-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'}"
							oninput={() => {
								nameError = null;
							}}
						/>
					</div>
					{#if nameError}
						<p class="mt-1.5 font-mono text-xs font-semibold text-rose-400 text-glow-crimson animate-pulse">
							⚠️ {nameError}
						</p>
					{/if}
				</div>

				<!-- Start Game Button -->
				<div class="pt-2">
					<button
						type="submit"
						class="btn-tactile hud-box flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400 bg-gradient-to-r from-emerald-600 to-emerald-500 py-4 font-mono text-sm sm:text-base font-black tracking-widest text-black shadow-[0_0_30px_rgba(34,197,94,0.4)] transition hover:bg-emerald-400 active:scale-[0.98] cursor-pointer"
					>
						<span>⚡</span>
						<span>INICIAR</span>
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
