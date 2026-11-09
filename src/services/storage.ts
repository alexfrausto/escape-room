import { writable, get } from 'svelte/store';
import type { TeamProgress, LockType } from '../types';
import { STATIONS } from './verifier';

const STORAGE_KEY = 'cypher_tracker_state';

const DEFAULT_STATE: TeamProgress = {
	teamName: '',
	gameStarted: false,
	elapsedSeconds: 0,
	timerRunning: false,
	unlockedStationIds: [],
	lastUpdated: Date.now(),
	startedAt: null
};

function loadInitialState(): TeamProgress {
	if (typeof window === 'undefined') {
		return DEFAULT_STATE;
	}

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			const gameStarted = typeof parsed.gameStarted === 'boolean' ? parsed.gameStarted : false;
			const stationIdMap = new Map(STATIONS.map((s) => [s.id.toLowerCase(), s.id]));
			const rawUnlocked = Array.isArray(parsed.unlockedStationIds)
				? parsed.unlockedStationIds
				: [];
			const cleanUnlocked = rawUnlocked
				.map((id: unknown) => (typeof id === 'string' ? stationIdMap.get(id.toLowerCase()) : null))
				.filter((id: string | null | undefined): id is string => Boolean(id));

			return {
				teamName: typeof parsed.teamName === 'string' ? parsed.teamName : '',
				gameStarted,
				elapsedSeconds: typeof parsed.elapsedSeconds === 'number' ? parsed.elapsedSeconds : 0,
				timerRunning:
					typeof parsed.timerRunning === 'boolean' ? parsed.timerRunning && gameStarted : false,
				unlockedStationIds: Array.from(new Set(cleanUnlocked)),
				lastUpdated: parsed.lastUpdated || Date.now(),
				startedAt: parsed.startedAt || null
			};
		}
	} catch (err) {
		console.warn('[Storage] Failed to read from localStorage:', err);
	}

	return { ...DEFAULT_STATE, lastUpdated: Date.now() };
}

function persistState(state: TeamProgress) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (err) {
		console.warn('[Storage] Failed to persist state to localStorage:', err);
	}
}

function createGameStore() {
	const initial = loadInitialState();
	const { subscribe, update } = writable<TeamProgress>(initial);

	let timerInterval: ReturnType<typeof setInterval> | null = null;

	function sync(fn: (s: TeamProgress) => TeamProgress) {
		update((current) => {
			const next = fn(current);
			next.lastUpdated = Date.now();
			persistState(next);
			return next;
		});
	}

	function startTimerTicker() {
		if (typeof window === 'undefined') return;
		if (timerInterval) clearInterval(timerInterval);

		timerInterval = setInterval(() => {
			update((state) => {
				if (!state.gameStarted || !state.timerRunning) return state;
				const next = {
					...state,
					elapsedSeconds: state.elapsedSeconds + 1,
					lastUpdated: Date.now()
				};
				persistState(next);
				return next;
			});
		}, 1000);
	}

	// Initialize timer ticking in browser
	if (typeof window !== 'undefined') {
		startTimerTicker();
	}

	return {
		subscribe,
		startGame(teamName: string) {
			sync((s) => ({
				...s,
				teamName: teamName.trim() || 'CIPHER STRIKE',
				gameStarted: true,
				timerRunning: true,
				startedAt: Date.now(),
				elapsedSeconds: 0
			}));
		},
		setTeamName(teamName: string) {
			sync((s) => ({ ...s, teamName: teamName.trim() }));
		},
		unlockStation(stationId: string) {
			const canonicalId =
				STATIONS.find((s) => s.id.toLowerCase() === stationId.trim().toLowerCase())?.id ||
				stationId;
			sync((s) => {
				if (s.unlockedStationIds.includes(canonicalId)) return s;
				return {
					...s,
					unlockedStationIds: [...s.unlockedStationIds, canonicalId]
				};
			});
		},
		lockStation(stationId: string) {
			const canonicalId =
				STATIONS.find((s) => s.id.toLowerCase() === stationId.trim().toLowerCase())?.id ||
				stationId;
			sync((s) => ({
				...s,
				unlockedStationIds: s.unlockedStationIds.filter(
					(id) => id.toLowerCase() !== canonicalId.toLowerCase()
				)
			}));
		},
		toggleStation(stationId: string) {
			const canonicalId =
				STATIONS.find((s) => s.id.toLowerCase() === stationId.trim().toLowerCase())?.id ||
				stationId;
			sync((s) => {
				const isUnlocked = s.unlockedStationIds.some(
					(id) => id.toLowerCase() === canonicalId.toLowerCase()
				);
				return {
					...s,
					unlockedStationIds: isUnlocked
						? s.unlockedStationIds.filter((id) => id.toLowerCase() !== canonicalId.toLowerCase())
						: [...s.unlockedStationIds, canonicalId]
				};
			});
		},
		forceUnlockAll() {
			sync((s) => ({
				...s,
				unlockedStationIds: STATIONS.map((st) => st.id)
			}));
		},
		startTimer() {
			sync((s) => ({ ...s, timerRunning: true }));
		},
		pauseTimer() {
			sync((s) => ({ ...s, timerRunning: false }));
		},
		setElapsedSeconds(seconds: number) {
			sync((s) => ({ ...s, elapsedSeconds: Math.max(0, seconds) }));
		},
		exitToRegistration() {
			sync((s) => ({
				...s,
				gameStarted: false,
				timerRunning: false
			}));
		},
		resetGame() {
			sync(() => ({
				...DEFAULT_STATE,
				startedAt: null,
				lastUpdated: Date.now()
			}));
		},
		isStationUnlocked(stationId: LockType): boolean {
			return get({ subscribe }).unlockedStationIds.includes(stationId);
		}
	};
}

export const gameStore = createGameStore();
