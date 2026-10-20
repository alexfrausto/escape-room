<script lang="ts">
	import { STATIONS } from '../services/verifier';
	import { gameStore } from '../services/storage';
	import { audio } from '../services/audio';
	import type { LockType } from '../types';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onTriggerWinState: () => void;
	}

	let { isOpen, onClose, onTriggerWinState }: Props = $props();

	const REQUIRED_PIN = '2027';
	let enteredPin = $state<string>('');
	let isAuthenticated = $state<boolean>(false);
	let pinError = $state<boolean>(false);

	function handleNumberClick(num: string) {
		if (enteredPin.length >= 4) return;
		audio.play('beep');
		enteredPin += num;
		pinError = false;

		if (enteredPin.length === 4) {
			checkPin();
		}
	}

	function handleBackspace() {
		audio.play('click');
		enteredPin = enteredPin.slice(0, -1);
		pinError = false;
	}

	function handleClear() {
		audio.play('click');
		enteredPin = '';
		pinError = false;
	}

	function checkPin() {
		if (enteredPin === REQUIRED_PIN) {
			audio.play('success');
			isAuthenticated = true;
			enteredPin = '';
			pinError = false;
		} else {
			audio.play('error');
			pinError = true;
			setTimeout(() => {
				enteredPin = '';
				pinError = false;
			}, 600);
		}
	}

	function handleResetGame() {
		if (confirm('ADVERTENCIA: ¿Deseas reiniciar todo el progreso de las estaciones y el cronómetro?')) {
			audio.play('clunk');
			gameStore.resetGame();
			handleCloseModal();
		}
	}

	function handleToggleStation(id: LockType) {
		audio.play('ratchet');
		gameStore.toggleStation(id);
	}

	function handleTestWin() {
		audio.play('success');
		gameStore.forceUnlockAll();
		onTriggerWinState();
		onClose();
	}

	function handleCloseModal() {
		audio.play('click');
		enteredPin = '';
		isAuthenticated = false;
		pinError = false;
		onClose();
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
		<div class="hud-box w-full max-w-md overflow-hidden rounded-xl border border-neutral-700 bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)]">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/90 px-4 py-3">
				<div class="flex items-center gap-2">
					<span class="h-2 w-2 rounded-full {isAuthenticated ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-rose-500 shadow-[0_0_8px_#ef4444]'}"></span>
					<h2 class="font-mono text-xs font-bold tracking-widest text-neutral-200">
						ACCESO RESTRINGIDO
					</h2>
				</div>
				<button
					type="button"
					class="btn-tactile rounded px-2 py-0.5 font-mono text-xs text-neutral-400 hover:text-white cursor-pointer"
					onclick={handleCloseModal}
				>
					[ ✕ CERRAR ]
				</button>
			</div>

			{#if !isAuthenticated}
				<!-- PIN Entry Challenge Screen -->
				<div class="p-6">
					<div class="text-center">
						<p class="font-mono text-xs tracking-wider text-neutral-400">
							AUTORIZACIÓN DE CONTROL REQUERIDA
						</p>

						<!-- PIN Dots Display -->
						<div class="my-6 flex justify-center gap-4">
							{#each [0, 1, 2, 3] as idx}
								<div
									class="flex h-10 w-10 items-center justify-center rounded-lg border font-mono text-lg font-bold transition-all {pinError
										? 'border-rose-500 bg-rose-950/40 text-rose-400'
										: enteredPin.length > idx
											? 'border-emerald-500 bg-emerald-950/40 text-emerald-400 glow-green'
											: 'border-neutral-800 bg-neutral-900 text-neutral-600'}"
								>
									{enteredPin.length > idx ? '●' : '○'}
								</div>
							{/each}
						</div>
					</div>

					<!-- Keypad Grid -->
					<div class="mx-auto grid max-w-[260px] grid-cols-3 gap-2.5">
						{#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as digit}
							<button
								type="button"
								class="btn-tactile rounded-lg border border-neutral-800 bg-neutral-900/80 py-3 font-mono text-lg font-bold text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800 cursor-pointer"
								onclick={() => handleNumberClick(digit)}
							>
								{digit}
							</button>
						{/each}
						<button
							type="button"
							class="btn-tactile rounded-lg border border-neutral-800 bg-neutral-900/40 py-3 font-mono text-xs font-bold text-neutral-400 hover:text-rose-400 cursor-pointer"
							onclick={handleClear}
						>
							C
						</button>
						<button
							type="button"
							class="btn-tactile rounded-lg border border-neutral-800 bg-neutral-900/80 py-3 font-mono text-lg font-bold text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800 cursor-pointer"
							onclick={() => handleNumberClick('0')}
						>
							0
						</button>
						<button
							type="button"
							class="btn-tactile rounded-lg border border-neutral-800 bg-neutral-900/40 py-3 font-mono text-xs font-bold text-neutral-400 hover:text-amber-400 cursor-pointer"
							onclick={handleBackspace}
						>
							⌫
						</button>
					</div>
				</div>
			{:else}
				<!-- Authenticated GM Dashboard -->
				<div class="max-h-[75vh] overflow-y-auto p-4 space-y-4">
					<!-- Station Override Matrix -->
					<div class="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
						<div class="mb-2 flex items-center justify-between">
							<span class="font-mono text-xs font-bold tracking-wider text-neutral-300">
								FORZAR ESTACIONES
							</span>
							<span class="font-mono text-[10px] text-neutral-400">
								{$gameStore.unlockedStationIds.length}/{STATIONS.length} ACTIVAS
							</span>
						</div>

						<div class="space-y-1.5">
							{#each STATIONS as station, idx}
								{@const isUnlocked = $gameStore.unlockedStationIds.includes(station.id)}
								<div class="flex items-center justify-between rounded border border-neutral-800/80 bg-neutral-900/70 px-2.5 py-1.5 text-xs font-mono">
									<div class="flex items-center gap-2">
										<span class="text-[10px] text-neutral-500">{(idx + 1).toString().padStart(2, '0')}</span>
										<span class="font-bold {isUnlocked ? 'text-emerald-400' : 'text-neutral-300'}">
											ESTACIÓN {(idx + 1).toString().padStart(2, '0')}
										</span>
									</div>

									<button
										type="button"
										class="btn-tactile rounded border px-2 py-0.5 font-mono text-[10px] font-bold transition cursor-pointer {isUnlocked
											? 'border-emerald-500/50 bg-emerald-950 text-emerald-400'
											: 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-500'}"
										onclick={() => handleToggleStation(station.id)}
									>
										{isUnlocked ? 'DESBLOQUEADA [BLOQUEAR]' : 'BLOQUEADA [DESBLOQUEAR]'}
									</button>
								</div>
							{/each}
						</div>
					</div>

					<!-- Master Game Actions -->
					<div class="grid grid-cols-2 gap-2">
						<!-- Test Win State -->
						<button
							type="button"
							class="btn-tactile flex flex-col items-center justify-center rounded-lg border border-emerald-500/50 bg-emerald-950/40 p-3 text-center hover:bg-emerald-900/40 cursor-pointer"
							onclick={handleTestWin}
						>
							<span class="font-mono text-xs font-bold text-emerald-300">🎉 PROBAR VICTORIA</span>
							<span class="mt-1 font-mono text-[10px] text-emerald-400">Desbloquear todas y finalizar</span>
						</button>

						<!-- Reset Entire Game -->
						<button
							type="button"
							class="btn-tactile flex flex-col items-center justify-center rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-center hover:bg-rose-900/40 cursor-pointer"
							onclick={handleResetGame}
						>
							<span class="font-mono text-xs font-bold text-rose-400">⚠️ REINICIAR JUEGO</span>
							<span class="mt-1 font-mono text-[10px] text-rose-400">Borrar progreso y cronómetro</span>
						</button>
					</div>

					<!-- Timer Controls -->
					<div class="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
						<span class="font-mono text-xs font-bold tracking-wider text-neutral-300">
							CONTROL DE CRONÓMETRO
						</span>
						<div class="mt-2 flex flex-wrap gap-2">
							<button
								type="button"
								class="btn-tactile rounded border border-neutral-700 bg-neutral-900 px-2.5 py-1 font-mono text-xs text-neutral-300 hover:border-neutral-500 cursor-pointer"
								onclick={() => {
									audio.play('click');
									$gameStore.timerRunning ? gameStore.pauseTimer() : gameStore.startTimer();
								}}
							>
								{$gameStore.timerRunning ? 'PAUSAR TIEMPO' : 'REANUDAR TIEMPO'}
							</button>
							<button
								type="button"
								class="btn-tactile rounded border border-neutral-700 bg-neutral-900 px-2.5 py-1 font-mono text-xs text-neutral-300 hover:border-neutral-500 cursor-pointer"
								onclick={() => {
									audio.play('click');
									gameStore.setElapsedSeconds($gameStore.elapsedSeconds + 300);
								}}
							>
								+5 MIN
							</button>
							<button
								type="button"
								class="btn-tactile rounded border border-neutral-700 bg-neutral-900 px-2.5 py-1 font-mono text-xs text-neutral-300 hover:border-neutral-500 cursor-pointer"
								onclick={() => {
									audio.play('click');
									gameStore.setElapsedSeconds($gameStore.elapsedSeconds - 300);
								}}
							>
								-5 MIN
							</button>
							<button
								type="button"
								class="btn-tactile rounded border border-neutral-700 bg-neutral-900 px-2.5 py-1 font-mono text-xs text-neutral-300 hover:border-neutral-500 cursor-pointer"
								onclick={() => {
									audio.play('click');
									gameStore.setElapsedSeconds(0);
								}}
							>
								REINICIAR A 0
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
