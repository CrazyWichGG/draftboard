# AGENTS.md - DraftBoard - Draftout Custom Board Drafter

## AI Agent Directives (CRITICAL)
Read and strictly adhere to the following rules before taking any action on this project:

1. **Planning First:** You must always create a step-by-step technical plan before committing to or executing any coding tasks, even if the task is continuing from the previous planned tasks or even if you think the task is simple, *unless the user explicitly asks you not to*.
2. **User-Initiated Planning:** You cannot start the planning phase yourself. You must wait for the user to explicitly initiate the plan.
3. **Ask for Clarification:** If any project requirement, UI detail, or architectural decision is ambiguous or unclear, you **must** stop and ask the user for clarification before writing code or modifying files.
4. **Post-Task Verification:** You must explicitly verify your work after completing a coding task. Do not assume the code works; follow the designated **Verification Process** to ensure no errors were introduced before declaring a task complete.
5. **Development Environment:** Assume a Fedora Linux environment for all terminal commands, package management, and pathing.

---

## What is Draftout? (Context)
To understand the purpose of this app, agents should understand the core game:
* **The Concept:** Draftout is a competitive *Minecraft* speedrunning gamemode based on "Lockout Bingo".
* **The Gameplay:** Players spawn into their own separate instances of the exact same world seed. They share a bingo-style board filled with random Minecraft tasks.
* **The Lockout:** When a player completes a goal, it permanently locks that goal out for the opponent. 
* **The Objective:** In a standard 25-goal game, the first player to strategically route and claim 13 goals wins.
* **App Relevance:** This web app specifically replaces and expands the pre-game *drafting phase*, where players strategically pick the goals that will appear on the final board before the actual speedrun begins.

---

## What is DraftBoard?
**DraftBoard** is a dedicated web application designed to host the collaborative drafting phase of Draftout matches outside of the main Minecraft client. It moves the complex, turn-based selection process into a synchronized, accessible browser environment, allowing groups of players to configure, roll, and build their custom game boards before launching the actual speedrun.

## Project Goals (DraftBoard)
Build a real-time, web-based alternative to the in-game drafting system for the *Minecraft* gamemode **Draftout**. 
* Expand the drafting phase to support from 2 and up to 4 players in a custom, shareable lobby.
* Replicate the exact aesthetic and layout of the in-game Minecraft GUI (using CSS to create bevels, custom slots, and pixelated font styling).
* Generate and export a strictly formatted custom board JSON that players can load directly into the Minecraft mod.

---

## Tech Stack
* **Frontend:** React (Vite) for component-driven UI, Tailwind CSS for styling and replicating the Minecraft UI aesthetic.
* **Backend:** Node.js with Express for the API, Socket.io for real-time bi-directional communication.
* **State Management:** Redis (or Node.js in-memory stores) to manage active lobbies and draft states.
* **Process Management:** PM2 for managing the Node.js WebSocket server instances.

---

## Frontend Styling & Aesthetics
* **Default Theme:** The web interface must replicate the color palette and styling of the official Draftout website (e.g., `https://draftoutmc.com/wiki`) by default.
* **Color Palette:** Utilize deep dark backgrounds (like Tailwind's `bg-neutral-950`) heavily accented with bright cyan (e.g., `text-cyan-300`, `border-cyan-300/25`, `bg-cyan-300/10`).
* **Semi-Transparent Panels:** Panels and bevels utilize semi-transparent dark backgrounds (`rgba(18, 18, 21, 0.65)`) with `backdrop-filter: blur(4px)`.
* **Sharp Corners (No Rounded Corners):** Cards, panels, inputs, tooltips, slots, and modals must use sharp, square corners (`rounded-none`). **EXCEPTION:** Pulsing status indicator dots (e.g., before **DRAFT LOBBY ACTIVE** and turn indicator dots) must strictly remain circles (`rounded-full`).
* **No Crown Overlays on Avatars:** Player head avatars must render cleanly without crown icons overlaid on top.
* **No Glows or Gradients:** Do not use CSS gradients or glowing effects by default unless explicitly instructed.
* **Minecraft GUI:** Replicate the exact aesthetic of the in-game Minecraft GUI for the drafting board components, including CSS-generated bevels, custom slots, and pixelated fonts (`font-pixel`).
* **Progress Bar:** Smooth continuous 1s linear transition. Colored **Green** (`bg-emerald-400`) during client turn and **Red** (`bg-rose-500`) during opponent turns.
* **Footer Disclaimer:** Completely hidden during active drafting sessions (`inDraftPhase`), rendered on home/lobby views with clean spacing.

---

## Data Sources
* **Crafatar API (Skin Fetching):** The application will use the [Crafatar API](https://crafatar.com/) (e.g., `https://crafatar.com/avatars/{uuid}?size=64&overlay`) to fetch pre-cropped 2D player head avatars, with Minotar fallback.
* **Master Goals List:** The application reads available goals from a static, local `GOALS.json` file. Do **not** write scripts to scrape or modify this file. Format:
```json
  {
    "id": "ALL_UPPERCASE_ID_FOR_EXPORT",
    "text": "The Goal Title For The UI",
    "texture": "texture path/url for display",
    "data": "optional format for some goals only"
  }
```
* **Queue Goal List:** The application filters goals for the Queue Pool using a static, local `server/queueGoalIds.json` file. Format: `["ID"]` or `["ID::data"]` containing composite goal keys matching active goals on `https://draftoutmc.com/wiki`.

---

## How It Works (Core Flow)

### 1. Lobby Creation & Joining

* **Room Configuration:** Host creates a room with configurable **Goal Pool** (**Queue Pool** [DEFAULT, 379 goals], **All Goals** [407 goals]), **Board Size** (3x3, 4x4, 5x5 [DEFAULT], 6x6, 7x7), and **Picking Time Limit** (10s [DEFAULT], 15s, 30s, 45s, 60s). Goal Pool is positioned as the first configuration option.
* **Room Code:** Generates a 6-character uppercase alphanumeric code (e.g. `X7K9P2`). Codes are masked by default (`••••••`) with an eye toggle button. Lowercase input is normalized to uppercase automatically.
* **Join Errors:** Error messages display inline directly beneath the Room Code input field (`text-rose-400 font-pixel mt-2`).
* **Players:** Up to 4 players join per room.

### 2. Drafting Phase

* **Turn Order:** System randomly determines picking order among connected players.
* **UI Layout:** Anchored client player is on the left (`YOU`). Opponents are listed vertically on the right.
* **Selection & Goal Pool Tracking:** On a player's turn, 2 goals are presented based on the room's selected Goal Pool filter (Queue Pool or All Goals). All presented goals are tracked in `usedGoalIds` to ensure goals never repeat during a drafting session unless the goal pool runs out.
* **Reroll System:** Each player has one (1) single-use boolean reroll (`REROLL (1 LEFT)` / `REROLL USED`).
* **Timer:** Default 10 seconds picking time limit. Timer auto-picks option #1 if time expires.
* **Real-time Sync:** All UI updates, board states, turn indicators, and timers sync instantly via Socket.io.

### 3. Export

* Once the grid is fully populated, the draft ends.
* Players are prompted to download `BOARD.json` formatted specifically for the Draftout Minecraft mod:

```json
{
  "size": 5,
  "goals": [
    {
      "id": "ITEM_FRAME_IN_ITEM_FRAME"
    },
    {
      "id": "OBTAIN_64_COLORED_WOOL",
      "data": "light_blue"
    },
    {
      "id": "KILL_COLORED_SHEEP",
      "data": "yellow"
    }
  ]
}
```

---

## Verification Process

Before finalizing any task, updating the user, or committing code, the agent must perform the following self-checks:

1. **Requirements Check:** Does the completed code strictly meet the constraints and features requested in the step/task?
2. **Syntax & Logic Review:** Manually dry-run the written code to check for missing imports, undeclared variables, endless loops, or syntax errors.
3. **Data Structure Validation:** Ensure any data passed to the frontend or exported (like the final `BOARD.json`) strictly conforms to expected schemas.
4. **State Consistency:** Verify that real-time Socket.io event emissions and React state updates align perfectly without causing race conditions.
5. **Aesthetic Compliance:** Confirm that UI updates utilize Tailwind correctly to maintain the default Draftout web theme and strict Minecraft GUI aesthetic (sharp square corners except for pulsing status dots, pixelated fonts, specific bevel colors, etc.).