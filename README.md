Privacy Policy for "Call Your AI" Chrome Extension

Last updated: April 17, 2025

1. Introduction
"Call Your AI" ("we," "our," or "the Extension") is committed to protecting your privacy. This Privacy Policy explains how the Extension uses permissions and handles data. By installing or using the Extension, you agree to the practices described herein.

2. Data Collection

No Personal Data: We do not collect, transmit, or store any personal or sensitive information about you or your browsing activity.

Local Inputs Only: All queries you type (e.g. @chatgpt [your query]) are processed locally in your browser to determine which AI service to launch.

3. Permissions and Their Use

tabs / activeTab: Used solely to open or update browser tabs when you invoke an AI command (e.g. @claude [your query]).

webNavigation: Listens only to navigation events for tabs created by the Extension, ensuring actions (like focusing an input field) occur after a page fully loads.

host permissions: Limited to the specific AI domains you choose (e.g. https://chat.openai.com/*, https://www.perplexity.ai/*), enabling the Extension to pre‑populate or guide text insertion when site policies allow.

storage: Stores only your custom keyword settings and enabled/disabled service preferences locally in Chrome; nothing is synced to external servers.

contextMenus: Used to create the "Ask AI about this" right-click submenu; no data leaves your device.

4. No Third‑Party Analytics or Tracking
We do not include any analytics, advertising, or telemetry libraries. There is no collection of usage metrics or sharing of data with third parties.

5. Data Security
All processing occurs on your device. There is no server‑side component. Your custom settings remain in your browser's storage and cannot be accessed by us.
# Call Your AI - Chrome Extension

A Chrome extension that lets you access AI services directly from your address bar. Simply type `@` followed by the service name and your query.

## Supported Services

- ChatGPT (`@chatgpt`)
- Claude (`@claude`)
- Gemini (`@gemini`)
- Perplexity (`@perplexity`)
- Copilot (`@copilot`)

## Features

### Core
- Quick access to AI services via Chrome's address bar
- Simple popup interface for direct interactions
- No API keys required — opens services in their native web interfaces

### New in Latest Release
1. **Right-click context menu** — Select any text on a page, right-click, and choose *Ask AI about this* to open your preferred service with the selected text pre-filled
2. **`@all` broadcast mode** — Type `@all <query>` in the address bar to open your query in all enabled AI services simultaneously
3. **Fuzzy alias matching** — Short aliases work automatically: `@gpt`, `@per`, `@cop`, etc.
4. **`Alt+A` keyboard shortcut** — Opens the extension popup from anywhere in the browser
5. **Options / settings page** — Drag to reorder services, toggle them on/off, or add your own custom AI service URLs
6. **Query history** — The last 10 queries are saved and shown in the popup for one-click re-use
7. **Ask all button** — A single button in the popup sends your query to every enabled service at once
8. **Arrow-key navigation** — Navigate between service tiles in the popup using the keyboard
9. **Usage count badges** — Each service tile shows how many times you've used it
10. **Summarize this page** — Sends the current page URL to your selected AI with a single click

## Usage

### Address Bar

1. Type `@` followed by the service name and your query
2. Example: `@chatgpt how do I make pasta?`
3. Use `@all` to send to all services: `@all explain quantum entanglement`
4. Short aliases work too: `@gpt`, `@claude`, `@per`, `@gem`, `@cop`

### Popup Interface

1. Click the extension icon (or press `Alt+A`)
2. Type your query
3. Click a service tile — or use **Ask all** to open every service
4. Use arrow keys to navigate tiles; press Enter to select
5. Click a history item to re-run a previous query
6. Click **Summarize this page** to summarise the active tab

### Right-Click Menu

1. Select any text on a webpage
2. Right-click → **Ask AI about this** → choose a service
3. The service opens with your selected text pre-filled as the query

### Options Page

1. Click the gear icon in the popup, or go to `chrome://extensions` → *Details* → *Extension options*
2. Drag services to reorder them
3. Toggle services on or off
4. Add custom AI services with a name, keyword, and URL template

## Installation

1. Download the extension package
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder
