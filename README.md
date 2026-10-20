# CYPHER TRACKER: Offline Escape Room Verification PWA

A zero-backend, client-side, mobile-first Progressive Web App (PWA) designed for an escape room competition. Five teams compete asynchronously to solve 7 physical stations in non-linear order. The application acts as a hardware-like verification terminal where players scan station QR codes and interact with 7 distinct tactile locks.

---

## 1. System Architecture & Constraints

* **100% Offline-First:** Must load once over cellular or local Wi-Fi and cache permanently via Service Worker. The entire app must remain fully interactive in Airplane Mode without external network requests.
* **Decoupled JSON Configuration:** All station metadata, visual configs, QR identifiers, and plain-text solutions are stored in an external `stations.json` file. Updating answers or tuning lock parameters requires zero modifications to Svelte component logic.
* **Plain-Text In-Memory Verification:** Solutions are verified locally via direct string comparison (`userInput.trim().toUpperCase() === targetSolution.trim().toUpperCase()`).
* **In-Page QR Scanner:** Scanning must use the device camera feed directly inside the active web viewport via `html5-qrcode`. It must never trigger external browser URL reloads or open secondary tabs.
* **State Persistence:** All team selections, game timers, and unlocked station IDs are saved to browser `localStorage`.
* **Tactile Game Feel:** Interactions must feature micro-animations, physical drag/rotational constraints, audio feedback via Howler.js, and device vibrations via `navigator.vibrate()`.

---

## 2. Directory Structure

```text
cypher-tracker/
├── public/
│   ├── audio/                     # Compressed audio assets (.mp3)
│   │   ├── click.mp3              # Dials, tumblers, and slider ticks
│   │   ├── clunk.mp3              # Breaker switch toggle
│   │   ├── ratchet.mp3            # Rotary safe dial tick
│   │   ├── beep.mp3               # Terminal key entry
│   │   ├── success.mp3            # Lock open sequence
│   │   └── error.mp3              # Code mismatch buzz
│   └── fonts/                     # Self-hosted WOFF2 fonts
└── src/
    ├── app.css                    # Tailwind imports and scanline effects
    ├── main.ts
    ├── App.svelte
    ├── config/
    │   └── stations.json          # Decoupled stations, locks, and solutions
    ├── types/
    │   └── index.ts               # TypeScript data definitions
    ├── services/
    │   ├── verifier.ts            # JSON data loader and string matching
    │   ├── storage.ts             # LocalStorage team progress manager
    │   └── audio.ts               # Howler sound triggers & haptics wrapper
    └── components/
        ├── common/
        │   ├── Header.svelte      # Timer, Team Picker, Hidden Admin trigger
        │   ├── QRScanner.svelte   # html5-qrcode camera modal
        │   ├── AdminModal.svelte  # Long-press reset and force-unlock panel
        │   └── UnlockOverlay.svelte # Fullscreen success animation & confetti
        ├── dashboard/
        │   ├── StationGrid.svelte # 7-station tactical overview
        │   └── StationCard.svelte # Individual locked/unlocked tile
        └── locks/
            ├── LockContainer.svelte # Dynamic lock dispatcher
            ├── Lock1Tumbler.svelte  # 4-cylinder roller
            ├── Lock2Cryptex.svelte  # Runic symbol rings
            ├── Lock3SafeDial.svelte # Draggable rotary dial
            ├── Lock4Breaker.svelte  # 5-toggle switch panel
            ├── Lock5Compass.svelte  # 4-way D-Pad path input
            ├── Lock6Sliders.svelte  # 3 vertical notched faders
            └── Lock7Terminal.svelte # CRT keyboard & text input

```

---

## 3. Data Schema & Specifications

### TypeScript Definitions (`src/types/index.ts`)

```typescript
export type LockType =
  | "tumbler"
  | "cryptex"
  | "safedial"
  | "breaker"
  | "compass"
  | "sliders"
  | "terminal";

export interface StationDefinition {
  id: string;
  name: string;
  qrCode: string;
  lockType: LockType;
  solution: string;
  cluePrompt?: string;
  config: Record<string, any>;
}

export interface TeamProgress {
  name: string;
  startedAt: number | null;
  completedAt: number | null;
  unlockedStations: string[];
}

```

### Station Configuration (`src/config/stations.json`)

```json
[
  {
    "id": "station_1",
    "name": "The Vault Tumbler",
    "qrCode": "STATION_1_VAULT",
    "lockType": "tumbler",
    "solution": "7419",
    "cluePrompt": "Align the 4-digit sequence found on the ledger.",
    "config": {
      "digits": 4,
      "min": 0,
      "max": 9
    }
  },
  {
    "id": "station_2",
    "name": "Runic Cryptex",
    "qrCode": "STATION_2_CRYPTEX",
    "lockType": "cryptex",
    "solution": "FIRE-EARTH-MOON-WATER",
    "cluePrompt": "Match the 4 elemental sigils inscribed on the altar.",
    "config": {
      "slots": 4,
      "symbols": ["FIRE", "WATER", "EARTH", "AIR", "MOON", "SUN"]
    }
  },
  {
    "id": "station_3",
    "name": "Safe Cracker",
    "qrCode": "STATION_3_SAFEDIAL",
    "lockType": "safedial",
    "solution": "R15-L30-R05",
    "cluePrompt": "Rotate dial to directions and numbers indicated on the note.",
    "config": {
      "maxStops": 3,
      "settleDelayMs": 800
    }
  },
  {
    "id": "station_4",
    "name": "Breaker Matrix",
    "qrCode": "STATION_4_BREAKER",
    "lockType": "breaker",
    "solution": "1-0-1-0-1",
    "cluePrompt": "Set the breaker switches to match the schematic.",
    "config": {
      "switches": 5,
      "labels": ["MAIN", "AUX 1", "AUX 2", "GRID", "VENT"]
    }
  },
  {
    "id": "station_5",
    "name": "Wayfinder D-Pad",
    "qrCode": "STATION_5_COMPASS",
    "lockType": "compass",
    "solution": "U-R-R-D-L",
    "cluePrompt": "Input the cardinal sequence across the labyrinth map.",
    "config": {
      "maxSteps": 5
    }
  },
  {
    "id": "station_6",
    "name": "Reactor Balancer",
    "qrCode": "STATION_6_SLIDERS",
    "lockType": "sliders",
    "solution": "2-5-3",
    "cluePrompt": "Calibrate the 3 reservoir indicators.",
    "config": {
      "sliders": [
        { "label": "COOLANT", "min": 0, "max": 9 },
        { "label": "PRESSURE", "min": 0, "max": 9 },
        { "label": "OUTPUT", "min": 0, "max": 9 }
      ]
    }
  },
  {
    "id": "station_7",
    "name": "Cyber Terminal",
    "qrCode": "STATION_7_TERMINAL",
    "lockType": "terminal",
    "solution": "ECLIPSE",
    "cluePrompt": "Enter the override password deciphered from the journal.",
    "config": {
      "maxLength": 10,
      "allowedChars": "A-Z"
    }
  }
]

```

---

## 4. Feature Requirements

### 4.1 Verification & State Logic (`src/services/verifier.ts` & `storage.ts`)

* **Matching Rule:** Compare trimmed, uppercased user input against target string:
```typescript
export function verifySolution(stationId: string, userInput: string): boolean {
  const station = STATIONS.find(s => s.id === stationId);
  if (!station) return false;
  return userInput.trim().toUpperCase() === station.solution.trim().toUpperCase();
}

```


* **Storage Sync:** Save changes immediately to `localStorage` under key `cypher_tracker_state`. Re-hydrate the state when the application mounts so page reloads or app minimizations never lose progress.

### 4.2 Audio & Haptic Feedback Engine (`src/services/audio.ts`)

* **Audio Sprites / Howler Instances:** Pre-load all sound effects (`click`, `clunk`, `ratchet`, `beep`, `success`, `error`).
* **Safari Audio Unlock:** Register a global one-time pointer listener to resume the Web Audio context on the first user interaction.
* **Haptics:**
* Step / Notch: `navigator.vibrate(20)`
* Unlock: `navigator.vibrate([100, 50, 200])`
* Error: `navigator.vibrate([80, 50, 80])`



### 4.3 In-Page QR Scanner (`src/components/common/QRScanner.svelte`)

* **Component Lifecycle:** Instantiate `Html5Qrcode` on mount inside a full-screen overlay.
* **Targeting:** Request `{ facingMode: "environment" }` (rear camera).
* **Detection:** When a recognized `qrCode` from `stations.json` is detected:
1. Trigger scanner cleanup (`stop()`).
2. Play soft confirmation sound.
3. Close camera overlay.
4. Automatically open that station’s lock modal.


* **Error & Cancel Handling:** Provide an explicit "Cancel" button to close camera, stop streams, and return to the main dashboard cleanly.

### 4.4 Dashboard & Navigation (`src/components/dashboard/`)

* **Header Bar:**
* Displays game timer (counting up from start of first puzzle).
* Team selector dropdown (`Alpha`, `Beta`, `Gamma`, `Delta`, `Epsilon`).
* Overall progress indicator (`X / 7 UNLOCKED`).


* **Station Grid:**
* 7 interactive cards representing the 7 stations.
* Displays station name, lock type icon, and status badge (`LOCKED` in dark gray/red vs `UNLOCKED` in neon green with checkmark).
* Tapping a card manually opens that station's lock modal (serving as a hardware/camera fallback).


* **Primary Scanner CTA:** Persistent fixed button at the bottom: **[ 📷 SCAN STATION QR ]**.

### 4.5 The 7 Interactive Lock Interfaces (`src/components/locks/`)

Each lock component must fire a custom Svelte event upon completion: `dispatch("submit", { code: serializedString })`.

#### Lock 1: The Vault Tumbler (`Lock1Tumbler.svelte`)

* **Visual:** 4 vertical rolling cylinders displaying numbers 0–9.
* **Interactivity:** Swipe up/down gesture or tap chevron arrows above/below each digit. Number increments/decrements with GSAP snapping animation and `click.mp3`.
* **Output:** `"7419"`

#### Lock 2: Runic Cryptex (`Lock2Cryptex.svelte`)

* **Visual:** 4 horizontal ring slots displaying glyph vectors (Fire, Water, Earth, Air, Moon, Sun).
* **Interactivity:** Tapping a slot rolls it forward to the next symbol with an axial 3D flip animation and ratchet sound.
* **Output:** `"FIRE-EARTH-MOON-WATER"`

#### Lock 3: Safe Cracker (`Lock3SafeDial.svelte`)

* **Visual:** Heavy circular dial with marked increments (0–39) and a top alignment pointer.
* **Interactivity:** Dragging uses GSAP `Draggable` (rotational mode). The component tracks direction delta (`CW` vs `CCW`). When dragging stops for >800ms, the rest position and direction are logged into a sequence list (e.g., step 1: `R15`).
* **Output:** `"R15-L30-R05"`

#### Lock 4: Breaker Matrix (`Lock4Breaker.svelte`)

* **Visual:** 5 vertical industrial toggle switches with ON/OFF labels and green/red LED indicators, accompanied by a bottom "ENGAGE" lever.
* **Interactivity:** Tapping switches flips their visual state with a mechanical clunk sound. Tapping the engage lever throws the power switch and triggers verification.
* **Output:** `"1-0-1-0-1"`

#### Lock 5: Wayfinder D-Pad (`Lock5Compass.svelte`)

* **Visual:** 4-way diamond directional controller (Up, Down, Left, Right) with a 5-dot breadcrumb path indicator.
* **Interactivity:** Tapping directions records input steps, plays mechanical clicks, and updates the breadcrumb arrows. Backspace button removes the last step.
* **Output:** `"U-R-R-D-L"`

#### Lock 6: Reactor Balancer (`Lock6Sliders.svelte`)

* **Visual:** 3 vertical industrial fader tracks with metallic knobs and graduated LED meter bars.
* **Interactivity:** Dragging knobs snaps to integer steps (0 through 9). Each step increment plays a notch click. "INJECT" button submits values.
* **Output:** `"2-5-3"`

#### Lock 7: Cyber Terminal (`Lock7Terminal.svelte`)

* **Visual:** Retro CRT display with green-phosphor text, cursor blink, scanline overlay, and a virtual industrial QWERTY/alphanumeric keypad.
* **Interactivity:** Tapping keys types letters with terminal click SFX. Includes Backspace and Execute buttons.
* **Output:** `"ECLIPSE"`

### 4.6 Verification & Unlock Handling (`LockContainer.svelte`)

* **Correct Entry:**
1. Trigger `UnlockOverlay.svelte`: full-screen success flash, metallic clunk/success audio, heavy haptics, and `canvas-confetti` spark burst.
2. Mark station ID as solved in `localStorage`.
3. Close modal and transition the station card on the dashboard to green/unlocked.
4. If `unlockedStations.length === 7`, trigger the final victory sequence.


* **Incorrect Entry:**
1. Trigger 0.4s horizontal screen shake animation via GSAP.
2. Play `error.mp3` and trigger error haptics.
3. Lock out inputs for 3 seconds with an animated red cooldown timer bar.

### 4.7 Game Master / Admin Panel (`AdminModal.svelte`)

* **Trigger:** Long-press the `CYPHER TRACKER` header title for 4 continuous seconds.
* **Security:** Prompts for a 4-digit PIN (`9999`).
* **Actions:**
* **Reset Game:** Wipes `localStorage` for the active team and resets timer.
* **Force Complete:** Dropdown to manually unlock any stuck station without entering code.
* **Test Win State:** Instantly marks all 7 stations complete to verify the game-over screen.
