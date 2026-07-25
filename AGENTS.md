# AGENTS.md - DraftBoard - Draftout Custom Web Lobby

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
* **No Glows or Gradients:** Do not use CSS gradients or glowing effects (e.g., heavy neon box-shadows, blooming text) by default unless explicitly instructed. The design should remain relatively flat or restricted to solid-color highlights and Minecraft menu bevels.
* **Minecraft GUI:** Replicate the exact aesthetic of the in-game Minecraft GUI for the drafting board components, including CSS-generated bevels, custom slots, and pixelated fonts.
* **Customization:** While the Draftout website theme is the default baseline, the styling and colors must be implemented in a way that allows the user to easily change or override them upon request.

---

## Data Sources
* **Crafatar API (Skin Fetching):** The application will use the [Crafatar API](https://crafatar.com/) (e.g., `https://crafatar.com/avatars/{uuid}?size=64&overlay`) to easily fetch pre-cropped, 2D player head avatars. The backend will need to resolve the user's Minecraft username to a UUID using the Mojang API first, and then pass that UUID to the frontend to render the Crafatar image.
* **Master Goals List:** The application will read the available goals from a static, local GOALS.json file. Do **not** write scripts to scrape, generate, or modify this file, as it will be managed and updated manually. The structure will always match this format:
```json
  {
    "id": "ALL_UPPERCASE_ID_FOR_EXPORT",
    "text": "The Goal Title For The UI",
    "texture": "texture path/url for display",
    "data": "optional format for some goals only"
  }
```

---

## How It Works (Core Flow)

### 1. Lobby Creation & Joining

* A Host creates a room and configures settings: Board size (3x3 up to 7x7) and turn time limit (default 15s).
* The web app generates a shareable room code.
* Up to 3 additional players join using the code.
* Players must enter their Minecraft usernames. The backend queries the Mojang API to fetch their UUID and raw skin texture, which the frontend then parses to display their player head.

### 2. Drafting Phase

* **Turn Order:** The system randomly determines the picking order among the connected players.
* **UI Layout:** The current client's player head/name is anchored on the left. The other players are listed vertically on the right.
* **Selection:** On a player's turn, they are presented with 2 randomly selected goals from the static master JSON list. They must pick 1 to place on the board.
* **Reroll System:** Each player has one (1) single-use reroll to cycle the 2 presented goals.
* **Timer:** Players have 15 seconds to pick. If the timer expires, the system auto-picks the first goal and passes the turn.
* **Real-time Sync:** All UI updates (board filling up, turn indicators changing, timer ticking down) are synced instantly across all clients via Socket.io.

### 3. Export

* Once the grid is fully populated, the draft ends.
* The system compiles the selected goals into the final payload format.
* Players are prompted to download a `FINAL.json` file formatted specifically for the Draftout mod to play the drafted board in-game.
* **Export Format Strictness:** The generated JSON must rigidly follow the exact format below. The `id` keys must map directly from the master `GOALS.json` file. Data-driven goals (such as colored wool, colored sheep, or leather armor piece combinations) must include their respective `"data"` property. The size value is a single integer ranged from 3 to 7. Use the exact format from this example for `FINAL.json`:

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
    },
    {
      "id": "OBTAIN_COLORED_GLAZED_TERRACOTTA",
      "data": "light_gray"
    },
    {
      "id": "OBTAIN_64_COLORED_CONCRETE",
      "data": "brown"
    },
    {
      "id": "WEAR_COLORED_LEATHER_ARMOR_PIECE",
      "data": "leather_boots&gray"
    }
    ...and so on
  ]
}
```

---

## ✅ Verification Process

Before finalizing any task, updating the user, or committing code, the agent must perform the following self-checks:

1. **Requirements Check:** Does the completed code strictly meet the constraints and features requested in the step/task?
2. **Syntax & Logic Review:** Manually dry-run the written code to check for missing imports, undeclared variables, endless loops, or syntax errors.
3. **Data Structure Validation:** Ensure any data passed to the frontend or exported (like the final `FINAL.json`) strictly conforms to the expected schemas.
4. **State Consistency:** Verify that real-time Socket.io event emissions and React state updates align perfectly without causing race conditions.
5. **Aesthetic Compliance:** Confirm that UI updates utilize Tailwind correctly to maintain the default Draftout web theme and strict Minecraft GUI aesthetic (pixelated fonts, specific bevel colors, etc.), unless instructed otherwise.