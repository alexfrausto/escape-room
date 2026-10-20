export type LockType =
	| 'tumbler'
	| 'cryptex'
	| 'safedial'
	| 'breaker'
	| 'compass'
	| 'sliders'
	| 'terminal'
	| 'pattern'
	| 'patchbay'
	| 'frequency'
	| 'piano'
	| string;

export interface StationDefinition {
	id: string;
	code: string;
	type: LockType;
	instruction?: string;
	name?: string;
	order?: number;
	hint?: string;
	description?: string;
}

export interface TeamProgress {
	teamName: string;
	gameStarted: boolean;
	elapsedSeconds: number;
	timerRunning: boolean;
	unlockedStationIds: string[];
	lastUpdated: number;
	startedAt: number | null;
}

export interface VerificationResult {
	success: boolean;
	station?: StationDefinition;
	message: string;
}
