import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";
import path from 'path';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const MAX_REQUEST_BODY_MB = Number(process.env.MAX_REQUEST_BODY_MB || 20);
const MAX_INLINE_AUDIO_BYTES = Number(process.env.MAX_INLINE_AUDIO_BYTES || 15 * 1024 * 1024);
const MAX_SUBTITLES_PER_REQUEST = Number(process.env.MAX_SUBTITLES_PER_REQUEST || 2000);
const MAX_SUBTITLE_TEXT_LENGTH = Number(process.env.MAX_SUBTITLE_TEXT_LENGTH || 300);
const ALLOWED_MIME_TYPES = new Set([
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/webm',
  'audio/mp4',
  'video/mp4',
  'video/webm',
  'video/quicktime'
]);

const apiKeyHeaderSecret = process.env.APP_API_KEY;

type SubtitleBlock = {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker: string;
};

const createHttpError = (status: number, message: string): Error & { status?: number } => {
  const err: Error & { status?: number } = new Error(message);
  err.status = status;
  return err;
};

const parseBase64Data = (fileData: unknown): string => {
  if (typeof fileData !== 'string' || fileData.trim().length === 0) {
    throw createHttpError(400, 'Missing audio or video file data');
  }

  const rawBase64 = fileData.replace(/^data:[^;]+;base64,/, '').trim();
  if (!/^[A-Za-z0-9+/=]+$/.test(rawBase64)) {
    throw createHttpError(400, 'Invalid base64 payload');
  }

  const approxBytes = Math.floor((rawBase64.length * 3) / 4);
  if (approxBytes > MAX_INLINE_AUDIO_BYTES) {
    throw createHttpError(413, 'Uploaded payload is too large');
  }

  return rawBase64;
};

const parseMimeType = (mimeType: unknown): string => {
  if (typeof mimeType !== 'string' || mimeType.trim() === '') {
    return 'audio/wav';
  }

  const normalized = mimeType.trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(normalized)) {
    throw createHttpError(400, 'Unsupported media type');
  }

  return normalized;
};

const parseLanguage = (language: unknown): string => {
  if (typeof language !== 'string' || language.trim() === '') {
    return 'English';
  }

  const normalized = language.trim();
  if (normalized.length > 64) {
    throw createHttpError(400, 'Language value is too long');
  }

  return normalized;
};

const toBoolean = (value: unknown, fallback = false): boolean => {
  return typeof value === 'boolean' ? value : fallback;
};

const parseSubtitleArray = (subtitles: unknown): SubtitleBlock[] => {
  if (!Array.isArray(subtitles) || subtitles.length === 0) {
    throw createHttpError(400, 'No subtitles provided');
  }

  if (subtitles.length > MAX_SUBTITLES_PER_REQUEST) {
    throw createHttpError(413, 'Too many subtitle blocks in one request');
  }

  return subtitles.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw createHttpError(400, `Invalid subtitle at index ${index}`);
    }

    const candidate = item as Record<string, unknown>;
    const id = String(candidate.id ?? '');
    const startTime = Number(candidate.startTime);
    const endTime = Number(candidate.endTime);
    const text = String(candidate.text ?? '');
    const speaker = String(candidate.speaker ?? '');

    if (!id || !Number.isFinite(startTime) || !Number.isFinite(endTime) || !speaker) {
      throw createHttpError(400, `Malformed subtitle at index ${index}`);
    }

    if (text.length > MAX_SUBTITLE_TEXT_LENGTH) {
      throw createHttpError(400, `Subtitle text too long at index ${index}`);
    }

    return { id, startTime, endTime, text, speaker };
  });
};

const safeError = (error: unknown): { status: number; message: string } => {
  if (error instanceof Error && (error as Error & { status?: number }).status) {
    const status = (error as Error & { status?: number }).status || 500;
    return { status, message: error.message };
  }

  return { status: 500, message: 'Internal server error' };
};

// Shared Gemini client setup (using process.env.GEMINI_API_KEY)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
  }));

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.GLOBAL_RATE_LIMIT_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false
  });

  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.AI_RATE_LIMIT_MAX || 30),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many AI requests, please retry later.' }
  });

  app.use(globalLimiter);

  // Allow larger payloads (audio/video blocks)
  app.use(express.json({ limit: `${MAX_REQUEST_BODY_MB}mb` }));
  app.use(express.urlencoded({ limit: `${MAX_REQUEST_BODY_MB}mb`, extended: true }));

  app.use('/api', (req, res, next) => {
    if (!apiKeyHeaderSecret) {
      return next();
    }

    const supplied = req.header('x-api-key');
    if (supplied !== apiKeyHeaderSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return next();
  });

  // API Health Check
  app.get('/api/health', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.json({ status: 'ok' });
    }

    return res.json({ status: 'ok', keyConfigured: !!process.env.GEMINI_API_KEY });
  });

  // Transcription Endpoint
  app.post('/api/transcribe', aiLimiter, async (req, res) => {
    try {
      const { fileData, mimeType, language, removeFillerWords, smartPunctuation, speakerDetection } = req.body;
      const rawBase64 = parseBase64Data(fileData);
      const normalizedMimeType = parseMimeType(mimeType);
      const normalizedLanguage = parseLanguage(language);

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'AI provider key is not configured on the server' });
      }

      // Detailed prompt for transcription
      const transcriptionPrompt = `
You are an expert, professional video transcriptionist and subtitler.
Analyze the audio file and transcribe all the spoken words in the specified language.

Configuration:
- Spoken Language/Dialect: ${normalizedLanguage}
- Filler Words: ${toBoolean(removeFillerWords) ? 'STRICTLY DETECT AND REMOVE filler words (um, uh, hmm, repeated words) from the output text.' : 'PRESERVE filler words as spoken (e.g. keep "um", "uh", "hmm").'}
- Smart Punctuation: ${toBoolean(smartPunctuation) ? 'Apply professional, natural punctuation. Add periods, commas, colons, question marks, exclamation marks, and capitalize proper nouns and starts of sentences correctly.' : 'Output plain words without formal punctuation.'}
- Speaker Detection: ${toBoolean(speakerDetection) ? 'Identify different speakers. Carefully segment when a different person starts speaking and label them sequentially (e.g. "Speaker 1", "Speaker 2").' : 'Keep as a single default speaker (e.g. "Speaker 1").'}

Subtitling Rules:
1. Divide the transcription into logical subtitle blocks.
2. Each block should be easy to read in a video frame. Typically 3 to 7 words per card (never more than 10 words unless a single word is extremely long).
3. Timestamps MUST be in seconds (as floating numbers).
4. Each segment duration should be between 0.8 seconds and 3.0 seconds maximum.
5. Guarantee that timing is strictly chronological and non-overlapping: the startTime of segment N must be >= endTime of segment N-1.
6. Provide highly accurate timestamps synchronized with the audio speech.

Return the final transcriped blocks array adhering strictly to the JSON schema specified.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: rawBase64,
              mimeType: normalizedMimeType
            }
          },
          transcriptionPrompt
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "A chronological list of formatted subtitle segments synchronized with the video audio",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "A unique sequence identifier, e.g., 'sub_1', 'sub_2'" },
                startTime: { type: Type.NUMBER, description: "Start time of the subtitle block in seconds" },
                endTime: { type: Type.NUMBER, description: "End time of the subtitle block in seconds" },
                text: { type: Type.STRING, description: "The transcribed subtitle text containing words spoken in this interval" },
                speaker: { type: Type.STRING, description: "Label of the speaker, e.g., 'Speaker 1', 'Speaker 2'" }
              },
              required: ["id", "startTime", "endTime", "text", "speaker"]
            }
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from transcription model');
      }

      const parsedSubtitles = JSON.parse(responseText.trim());
      res.json({ success: true, subtitles: parsedSubtitles });

    } catch (error: any) {
      const { status, message } = safeError(error);
      console.error('Transcription Error:', error);
      res.status(status).json({ error: status >= 500 ? 'Transcription request failed' : message });
    }
  });

  // AI Punctuation and Correction Suggestions
  app.post('/api/suggest-corrections', aiLimiter, async (req, res) => {
    try {
      const subtitles = parseSubtitleArray(req.body?.subtitles);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `
Analyze the following subtitle timeline blocks. Detect probable transcription errors, spelling mistakes, grammatic misalignments, or weird punctuation.
Suggest improved options for specific blocks without altering their timing structure.
Subtitles:
${JSON.stringify(subtitles, null, 2)}
`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "Suggested caption improvements",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "The original subtitle element ID needing correction" },
                originalText: { type: Type.STRING, description: "The text as it currently exists" },
                suggestedText: { type: Type.STRING, description: "The corrected text recommendation" },
                reason: { type: Type.STRING, description: "A short reason or explanation for this correction" }
              },
              required: ["id", "originalText", "suggestedText", "reason"]
            }
          }
        }
      });

      const parsedSuggestions = JSON.parse(response.text?.trim() || '[]');
      res.json({ success: true, suggestions: parsedSuggestions });
    } catch (error) {
      const { status, message } = safeError(error);
      console.error('Correction Suggestion Error:', error);
      res.status(status).json({ error: status >= 500 ? 'Suggestion request failed' : message });
    }
  });

  // AI Filler Words Cleaner Endpoint
  app.post('/api/clean-fillers', aiLimiter, async (req, res) => {
    try {
      const subtitles = parseSubtitleArray(req.body?.subtitles);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `
Review these subtitles and clean up filler words like "um", "uh", "hmm", "ah", repeated stammering, or empty pauses.
Keep the timing of the blocks EXACTLY the same, just clean the text. Return the modified subtitle blocks array.
Subtitles:
${JSON.stringify(subtitles, null, 2)}
`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "Cleaned subtitles",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                startTime: { type: Type.NUMBER },
                endTime: { type: Type.NUMBER },
                text: { type: Type.STRING },
                speaker: { type: Type.STRING }
              },
              required: ["id", "startTime", "endTime", "text", "speaker"]
            }
          }
        }
      });

      const cleaned = JSON.parse(response.text?.trim() || '[]');
      res.json({ success: true, subtitles: cleaned });
    } catch (error) {
      const { status, message } = safeError(error);
      console.error('Filler Words Cleaning Error:', error);
      res.status(status).json({ error: status >= 500 ? 'Filler-clean request failed' : message });
    }
  });

  // Serve static files and handle Vite logic on singleport setup
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('./dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('./dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = 3000;
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

startServer();
