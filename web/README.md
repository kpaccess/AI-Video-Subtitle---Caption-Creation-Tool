# Web App (Next.js + MUI)

This folder contains the web application migrated to Next.js (App Router) with MUI.

## Stack

- Next.js 15
- React 19
- MUI 6
- Tailwind CSS 4 (existing UI utility classes)
- API routes under `app/api/*` for transcription/correction/cleaning

## Run locally

```bash
npm install
npm run dev
```

App URL: http://localhost:3000

## Environment

Create `.env` in this folder:

```env
GEMINI_API_KEY=...
OPENAI_API_KEY=...
APP_API_KEY=optional_shared_secret
NEXT_PUBLIC_APP_API_KEY=optional_shared_secret
MAX_INLINE_AUDIO_BYTES=15728640
MAX_SUBTITLES_PER_REQUEST=2000
MAX_SUBTITLE_TEXT_LENGTH=300
```

## Netlify

`netlify.toml` is included and uses `@netlify/plugin-nextjs`.

- Build command: `npm run build`
- Framework: Next.js (auto-detected)
- Set env vars in Netlify dashboard

## API endpoints

- `GET /api/health`
- `POST /api/transcribe`
- `POST /api/suggest-corrections`
- `POST /api/clean-fillers`
