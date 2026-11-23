<script lang="ts">
	import { gameStore } from '../services/storage';
	import { audio } from '../services/audio';
	import { LockKeyhole, ShieldAlert, Zap } from '@lucide/svelte';

	let teamNameInput = $state<string>('');
	let nameError = $state<string | null>(null);

	function handleStartGame(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = teamNameInput.trim();
		if (!trimmed) {
			audio.play('error');
			nameError = 'INGRESA EL NOMBRE DEL ESCUADRÓN PARA CONTINUAR';
			return;
		}

		nameError = null;
		audio.play('clunk');
		gameStore.startGame(trimmed);
	}
</script>

<div class="relative flex min-h-screen flex-col items-center justify-between overflow-hidden p-4 sm:p-6 mi-grid-bg crt-overlay text-slate-100">
	<!-- Ambient Cyber Light Streams -->
	<div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
		<div class="mi-laser-line animate-mi-laser top-[18%]" style="--laser-angle: -9deg;"></div>
		<div class="mi-laser-line animate-mi-laser top-[78%]" style="--laser-angle: 7deg; animation-delay: -3.2s;"></div>
	</div>

	<div class="relative z-10 my-auto w-full max-w-lg py-6">
		<!-- Top Telemetry Tab -->
		<div class="mb-2 flex items-center justify-between px-1 font-mono text-[10px] font-bold tracking-[0.22em] text-sky-400/90 uppercase">
			<span class="flex items-center gap-1.5">
				<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></span>
				TRANSMISIÓN ENCRIPTADA // EN ESPERA
			</span>
			<span class="text-blue-400/70">SYS-07</span>
		</div>

		<div class="hud-box mi-corners relative overflow-hidden rounded-xl border border-blue-500/35 shadow-[0_0_65px_rgba(37,99,235,0.22)]">
			<!-- Top Cyber Accent Strip -->
			<div class="mi-hazard-strip h-1.5 w-full border-b border-blue-400/30"></div>

			<div class="p-5 sm:p-7">
				<!-- Hero Padlock + Glitch Title (Inspired by Reference Image) -->
				<div class="mb-6 border-b border-blue-900/60 pb-5 text-center">
					<!-- Glowing Neon-Blue Padlock -->
					<div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/50 bg-blue-950/60 text-sky-300 shadow-[0_0_28px_rgba(59,130,246,0.55)]">
						<LockKeyhole size={30} class="drop-shadow-[0_0_10px_#60a5fa]" />
					</div>

					<!-- Glitch Display Title -->
					<h1 class="mi-glitch-cut inline-flex flex-col items-center leading-none select-none">
						<span
							class="font-glitch mi-glitch text-2xl sm:text-3xl tracking-[0.2em] uppercase"
							data-text="MISIÓN"
						>
							MISIÓN
						</span>
						<span
							class="font-glitch mi-glitch mt-1 text-3xl sm:text-4xl tracking-[0.16em] uppercase"
							data-text="IMPOSIBLE"
						>
							IMPOSIBLE
						</span>
					</h1>

					<!-- Electric Energy Stream Divider -->
					<div class="mx-auto mt-4 h-[2px] w-40 rounded-full mi-fuse-fill"></div>

					<p class="mt-4 font-mono text-xs sm:text-sm leading-relaxed text-slate-300/90">
						Tu misión, si decides aceptarla: ingresa el nombre de tu escuadrón para iniciar el cronómetro y vulnerar todas las estaciones.
					</p>
				</div>

				<!-- Registration Form -->
				<form onsubmit={handleStartGame} class="space-y-5">
					<!-- Team Name Manual Input -->
					<div>
						<label
							for="team-name"
							class="mb-2 flex items-center justify-between font-mono text-[11px] font-bold tracking-wider text-sky-200/90 uppercase"
						>
							<span>NOMBRE DEL ESCUADRÓN</span>
							<span class="text-[10px] font-normal text-slate-400">MÁX 30 CARACTERES</span>
						</label>
						<div class="relative">
							<input
								id="team-name"
								type="text"
								maxlength="30"
								placeholder="Ej. EQUIPO FÉNIX"
								bind:value={teamNameInput}
								class="w-full rounded-lg border bg-[#030714] px-4 py-3.5 font-mono text-base font-bold text-white uppercase tracking-widest transition placeholder:normal-case placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-500 {nameError
									? 'border-red-500 bg-red-950/25 text-red-200 ring-1 ring-red-500/40'
									: 'border-blue-800/80 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/70'}"
								oninput={() => {
									nameError = null;
								}}
							/>
						</div>
						{#if nameError}
							<p class="mt-2 flex items-center gap-1.5 font-mono text-xs font-semibold text-red-400 text-glow-crimson animate-pulse">
								<ShieldAlert size={14} class="shrink-0" />
								<span>{nameError}</span>
							</p>
						{/if}
					</div>

					<!-- Start Mission Button -->
					<div class="pt-1">
						<button
							type="submit"
							class="btn-tactile mi-btn-primary font-tech flex w-full items-center justify-center gap-2.5 rounded-lg py-4 text-sm sm:text-base font-extrabold tracking-[0.2em] uppercase cursor-pointer"
						>
							<Zap size={18} class="text-sky-200" />
							<span>ACEPTAR MISIÓN</span>
						</button>
					</div>
				</form>

				<!-- Tech Footer Note -->
				<div class="mt-5 border-t border-blue-900/50 pt-3 text-center">
					<p class="font-mono text-[10px] tracking-[0.18em] text-slate-400/80 uppercase">
						TERMINAL DE VERIFICACIÓN TÁCTICA // ACCESO ENCRIPTADO
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
