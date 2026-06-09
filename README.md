# Monorepo Structure

This repository is split into two folders:

- `web/`: Vite + React frontend with Express backend (AI transcription app)
- `android/`: Android project (Gradle + app module)

## Web App

```bash
cd web
npm install
npm run dev
```

## Android App

```bash
cd android
./gradlew tasks
```

## Deployment Note

For Netlify, this Vite + Express setup should be split:
- Host the Vite frontend on Netlify
- Host the Express API separately (Render/Railway/Fly/Cloud Run)

If you need single-platform deploy on Netlify, migrating to Next.js (API routes/functions) is usually simpler.
