# AI Video Subtitle and Caption Creation Tool

AI-powered subtitle and caption creation workspace for video creators.

The app combines:
- A React + Vite frontend for timeline editing, style controls, and preview
- An Express server for Gemini-powered transcription and caption enhancement
- Optional Android project files in the same repository for mobile-side experimentation

## Features

- Upload or load sample video clips
- Generate timestamped subtitle segments with Gemini
- Detect and label multiple speakers
- Toggle filler-word cleanup and smart punctuation
- Get AI correction suggestions for subtitle lines
- Style captions with font, color, opacity, outline, glow, and alignment controls
- Drag and position subtitle overlays in preview
- Use animation presets for social-style caption presentation

## Tech Stack

- Frontend: React 19, TypeScript, Vite
- Backend: Node.js, Express, TypeScript (tsx runtime)
- AI: Google Gemini via `@google/genai`
- Styling/UI: Tailwind CSS + custom CSS

## Prerequisites

- Node.js 18+
- npm 9+
- A valid Gemini API key

## Environment Setup

Create a `.env` file in the repository root:

```env
GEMINI_API_KEY=your_api_key_here
APP_API_KEY=optional_server_side_api_key
MAX_REQUEST_BODY_MB=20
MAX_INLINE_AUDIO_BYTES=15728640
GLOBAL_RATE_LIMIT_MAX=300
AI_RATE_LIMIT_MAX=30
```

For the frontend (optional API key forwarding), create `.env.local`:

```env
VITE_APP_API_KEY=optional_server_side_api_key
```

Notes:
- The server loads environment variables using `dotenv`.
- If the key is missing, API endpoints will return a configuration error.
- If `APP_API_KEY` is set, all `/api/*` routes require `x-api-key`.

## Install

```bash
npm install
```

## Run

### Development (single port app)

Start the Vite dev server:

```bash
npm run dev
```

Default URL:
- `http://localhost:3000`

### Backend Entry (Express + Vite middleware)

Run the standalone server entry:

```bash
npm run start
```

This starts `server.ts`, exposes API routes, and serves the frontend.

### Production Build

```bash
npm run build
npm run preview
```

## API Endpoints

All endpoints are served from the same app origin.

- `GET /api/health`
   - Returns server status and whether `GEMINI_API_KEY` is configured.

- `POST /api/transcribe`
   - Body fields:
      - `fileData` (required, base64 data URL or base64 payload)
      - `mimeType` (optional)
      - `language` (optional)
      - `removeFillerWords` (boolean)
      - `smartPunctuation` (boolean)
      - `speakerDetection` (boolean)
   - Returns subtitle blocks with `id`, `startTime`, `endTime`, `text`, `speaker`.

- `POST /api/suggest-corrections`
   - Body: `subtitles` array
   - Returns AI suggestions: `originalText`, `suggestedText`, `reason`.

- `POST /api/clean-fillers`
   - Body: `subtitles` array
   - Returns cleaned subtitle text while preserving timing.

## Project Structure

```text
.
|- src/                 # React frontend
|  |- App.tsx
|  |- main.tsx
|  |- index.css
|- server.ts            # Express server and Gemini routes
|- package.json         # Node scripts and dependencies
|- app/                 # Android project (optional/mobile side)
|- assets/
|- metadata.json
```

## Troubleshooting

- Server says API key is missing:
   - Confirm `.env` exists in the root and contains `GEMINI_API_KEY`.
   - Restart the running process after changing environment variables.

- Large file upload errors:
   - The server accepts JSON payloads up to 100 MB. Larger files should be compressed before upload.

- Playback issues with some sample videos:
   - The UI includes fallback behavior (WebM and virtual playback mode) for unsupported codecs.

## License

Review repository license terms before production use.