import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

dotenv.config();

const MAX_REQUEST_BODY_MB = Number(process.env.MAX_REQUEST_BODY_MB || 20);
const MAX_INLINE_AUDIO_BYTES = Number(
  process.env.MAX_INLINE_AUDIO_BYTES || 15 * 1024 * 1024,
);
const MAX_SUBTITLES_PER_REQUEST = Number(
  process.env.MAX_SUBTITLES_PER_REQUEST || 2000,
);
const MAX_SUBTITLE_TEXT_LENGTH = Number(
  process.env.MAX_SUBTITLE_TEXT_LENGTH || 300,
);
const ALLOWED_MIME_TYPES = new Set([
  "audio/wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/webm",
  "audio/mp4",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const apiKeyHeaderSecret = process.env.APP_API_KEY;

type SubtitleBlock = {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker: string;
};

const createHttpError = (
  status: number,
  message: string,
): Error & { status?: number } => {
  const err: Error & { status?: number } = new Error(message);
  err.status = status;
  return err;
};

const parseBase64Data = (fileData: unknown): string => {
  if (typeof fileData !== "string" || fileData.trim().length === 0) {
    throw createHttpError(400, "Missing audio or video file data");
  }

  const rawBase64 = fileData.replace(/^data:[^;]+;base64,/, "").trim();
  if (!/^[A-Za-z0-9+/=]+$/.test(rawBase64)) {
    throw createHttpError(400, "Invalid base64 payload");
  }

  const approxBytes = Math.floor((rawBase64.length * 3) / 4);
  if (approxBytes > MAX_INLINE_AUDIO_BYTES) {
    throw createHttpError(413, "Uploaded payload is too large");
  }

  return rawBase64;
};

const parseMimeType = (mimeType: unknown): string => {
  if (typeof mimeType !== "string" || mimeType.trim() === "") {
    return "audio/wav";
  }

  const normalized = mimeType.trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(normalized)) {
    throw createHttpError(400, "Unsupported media type");
  }

  return normalized;
};

const parseLanguage = (language: unknown): string => {
  if (typeof language !== "string" || language.trim() === "") {
    return "English";
  }

  const normalized = language.trim();
  if (normalized.length > 64) {
    throw createHttpError(400, "Language value is too long");
  }

  return normalized;
};

const toBoolean = (value: unknown, fallback = false): boolean => {
  return typeof value === "boolean" ? value : fallback;
};

const parseSubtitleArray = (subtitles: unknown): SubtitleBlock[] => {
  if (!Array.isArray(subtitles) || subtitles.length === 0) {
    throw createHttpError(400, "No subtitles provided");
  }

  if (subtitles.length > MAX_SUBTITLES_PER_REQUEST) {
    throw createHttpError(413, "Too many subtitle blocks in one request");
  }

  return subtitles.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw createHttpError(400, `Invalid subtitle at index ${index}`);
    }

    const candidate = item as Record<string, unknown>;
    const id = String(candidate.id ?? "");
    const startTime = Number(candidate.startTime);
    const endTime = Number(candidate.endTime);
    const text = String(candidate.text ?? "");
    const speaker = String(candidate.speaker ?? "");

    if (
      !id ||
      !Number.isFinite(startTime) ||
      !Number.isFinite(endTime) ||
      !speaker
    ) {
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

  return { status: 500, message: "Internal server error" };
};

const isRetryableStatus = (statusCode: number): boolean => {
  return statusCode === 429 || statusCode === 500 || statusCode === 503;
};

const isGeminiFailoverEligibleError = (error: any): boolean => {
  const statusCode = Number(
    error?.status || error?.statusCode || error?.error?.code || 0,
  );
  const message = String(error?.message || "").toLowerCase();
  return (
    statusCode === 429 ||
    statusCode === 500 ||
    statusCode === 503 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("high demand") ||
    message.includes("unavailable")
  );
};

const makeSubtitleId = (index: number): string => `sub_${index + 1}`;

const normalizeSubtitleTimeline = (
  subtitles: SubtitleBlock[],
): SubtitleBlock[] => {
  let lastEnd = 0;
  return subtitles
    .filter((item) => item.text.trim().length > 0)
    .map((item, index) => {
      const safeStart = Math.max(Number(item.startTime) || 0, lastEnd);
      const rawEnd = Number(item.endTime) || safeStart + 1.2;
      const safeEnd = Math.max(rawEnd, safeStart + 0.8);
      lastEnd = safeEnd;
      return {
        ...item,
        id: makeSubtitleId(index),
        startTime: Number(safeStart.toFixed(2)),
        endTime: Number(safeEnd.toFixed(2)),
        text: item.text.trim(),
      };
    });
};

const stripFillerWords = (text: string): string => {
  return text
    .replace(/\b(um+|uh+|hmm+|ah+)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const stripPunctuation = (text: string): string => {
  return text
    .replace(/[.,!?;:]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

async function translateTextsWithOpenAI(params: {
  apiKey: string;
  targetLanguage: string;
  items: Array<{ id: string; text: string }>;
}): Promise<Map<string, string>> {
  const model = process.env.OPENAI_MODEL_TEXT || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a subtitle translator. Translate text into ${params.targetLanguage}. Keep original intent and natural subtitle style. Return only JSON.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            task: `Translate every subtitle text into ${params.targetLanguage}`,
            items: params.items,
            outputFormat: {
              translations: [{ id: "sub_1", translatedText: "..." }],
            },
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw createHttpError(
      response.status,
      `OpenAI translation failed: ${details || response.statusText}`,
    );
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const parsed = parseJsonResponse(content, '{"translations": []}');
  const translations = Array.isArray(parsed?.translations)
    ? parsed.translations
    : [];
  const map = new Map<string, string>();
  for (const item of translations) {
    const id = String(item?.id ?? "").trim();
    const translatedText = String(item?.translatedText ?? "").trim();
    if (id && translatedText) {
      map.set(id, translatedText);
    }
  }
  return map;
}

async function transcribeWithOpenAI(params: {
  apiKey: string;
  rawBase64: string;
  mimeType: string;
  targetLanguage: string;
  removeFillerWords: boolean;
  smartPunctuation: boolean;
  speakerDetection: boolean;
}): Promise<SubtitleBlock[]> {
  const model = process.env.OPENAI_MODEL_TRANSCRIBE || "gpt-4o-mini-transcribe";
  const audioBuffer = Buffer.from(params.rawBase64, "base64");
  const mimeSubtype = params.mimeType.split("/")[1] || "wav";
  const ext = mimeSubtype === "mpeg" ? "mp3" : mimeSubtype;

  const form = new FormData();
  form.append(
    "file",
    new Blob([audioBuffer], { type: params.mimeType }),
    `audio.${ext}`,
  );
  form.append("model", model);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append(
    "prompt",
    `Transcribe accurately for subtitles. ${params.smartPunctuation ? "Use natural punctuation and capitalization." : "Keep punctuation minimal."}`,
  );

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: form,
    },
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw createHttpError(
      response.status,
      `OpenAI transcription failed: ${details || response.statusText}`,
    );
  }

  const payload = await response.json();
  const segments = Array.isArray(payload?.segments) ? payload.segments : [];
  const defaultSpeaker = params.speakerDetection ? "Speaker 1" : "Speaker 1";

  let subtitles: SubtitleBlock[] = segments
    .map((segment: any, index: number) => {
      const startTime = Number(segment?.start ?? 0);
      const endTime = Number(segment?.end ?? startTime + 1.2);
      let text = String(segment?.text ?? "").trim();

      if (params.removeFillerWords) {
        text = stripFillerWords(text);
      }

      if (!params.smartPunctuation) {
        text = stripPunctuation(text);
      }

      return {
        id: makeSubtitleId(index),
        startTime,
        endTime,
        text,
        speaker: defaultSpeaker,
      };
    })
    .filter((item: SubtitleBlock) => item.text.length > 0);

  if (subtitles.length > 0) {
    const translationMap = await translateTextsWithOpenAI({
      apiKey: params.apiKey,
      targetLanguage: params.targetLanguage,
      items: subtitles.map((item) => ({ id: item.id, text: item.text })),
    });

    subtitles = subtitles.map((item) => ({
      ...item,
      text: translationMap.get(item.id) || item.text,
    }));
  }

  return normalizeSubtitleTimeline(subtitles);
}

async function translateSubtitlesWithGemini(params: {
  subtitles: SubtitleBlock[];
  targetLanguage: string;
}): Promise<SubtitleBlock[]> {
  if (!params.subtitles.length) {
    return params.subtitles;
  }

  const response = await generateContentWithFallback({
    contents: `
Translate each subtitle text into ${params.targetLanguage}.
Keep IDs and timing unchanged.
Only translate text content naturally for subtitle readability.
Input subtitles:
${JSON.stringify(params.subtitles, null, 2)}
`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            text: { type: Type.STRING },
          },
          required: ["id", "text"],
        },
      },
    },
  });

  const translatedItems = parseJsonResponse(response.text, "[]");
  const textById = new Map<string, string>();
  if (Array.isArray(translatedItems)) {
    for (const item of translatedItems) {
      const id = String(item?.id ?? "").trim();
      const text = String(item?.text ?? "").trim();
      if (id && text) {
        textById.set(id, text);
      }
    }
  }

  return params.subtitles.map((sub) => ({
    ...sub,
    text: textById.get(sub.id) || sub.text,
  }));
}

// Shared Gemini client setup (using process.env.GEMINI_API_KEY)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const MODELS_CHAIN = [
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}) {
  let lastError: any = null;

  for (const model of MODELS_CHAIN) {
    let retries = 2;
    while (retries > 0) {
      try {
        console.log(
          `[AI] Attempting generateContent using model: ${model} (${retries} retries left)`,
        );
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const statusCode =
          err.status || err.statusCode || (err.error && err.error.code) || 500;
        console.warn(
          `[AI] Error generating content with model ${model} (status code ${statusCode}):`,
          err.message || err,
        );

        if (isRetryableStatus(statusCode)) {
          retries--;
          if (retries > 0) {
            console.log(`[AI] Retrying in 1.5 seconds...`);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }
        }
        break;
      }
    }
  }

  throw lastError || new Error("All models in the fallback chain failed");
}

function parseJsonResponse(
  rawText: string | undefined | null,
  fallbackValue = "[]",
): any {
  if (!rawText || rawText.trim() === "") {
    console.warn("[AI] Warning: empty or blank response text received.");
    return JSON.parse(fallbackValue);
  }

  let cleanText = rawText.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
  }

  try {
    return JSON.parse(cleanText);
  } catch (err: any) {
    console.error("[AI] JSON Parse Error: failed to parse text:", cleanText);

    const arrayMatch = cleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        console.log("[AI] Attempting parse on regex-extracted JSON array...");
        return JSON.parse(arrayMatch[0]);
      } catch (nestedErr) {
        console.error("[AI] Regex-extracted JSON array parse failed.");
      }
    }

    const objectMatch = cleanText.match(/\{\s*[\s\S]*\}/);
    if (objectMatch) {
      try {
        console.log("[AI] Attempting parse on regex-extracted JSON object...");
        return JSON.parse(objectMatch[0]);
      } catch (nestedErr) {
        console.error("[AI] Regex-extracted JSON object parse failed.");
      }
    }

    throw err;
  }
}

async function startServer() {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === "production" ? undefined : false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: { policy: "unsafe-none" },
    }),
  );

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.GLOBAL_RATE_LIMIT_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false,
  });

  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.AI_RATE_LIMIT_MAX || 30),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many AI requests, please retry later." },
  });

  app.use(globalLimiter);

  // Allow larger payloads (audio/video blocks)
  app.use(express.json({ limit: `${MAX_REQUEST_BODY_MB}mb` }));
  app.use(
    express.urlencoded({ limit: `${MAX_REQUEST_BODY_MB}mb`, extended: true }),
  );

  app.use("/api", (req, res, next) => {
    if (!apiKeyHeaderSecret) {
      return next();
    }

    const supplied = req.header("x-api-key");
    if (supplied !== apiKeyHeaderSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return next();
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.json({ status: "ok" });
    }

    return res.json({
      status: "ok",
      providers: {
        gemini: !!process.env.GEMINI_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
      },
    });
  });

  // Transcription Endpoint
  app.post("/api/transcribe", aiLimiter, async (req, res) => {
    try {
      const {
        fileData,
        mimeType,
        language,
        removeFillerWords,
        smartPunctuation,
        speakerDetection,
      } = req.body;
      const rawBase64 = parseBase64Data(fileData);
      const normalizedMimeType = parseMimeType(mimeType);
      const normalizedLanguage = parseLanguage(language);

      const geminiConfigured = !!process.env.GEMINI_API_KEY;
      const openAIConfigured = !!process.env.OPENAI_API_KEY;
      if (!geminiConfigured && !openAIConfigured) {
        return res
          .status(500)
          .json({ error: "No AI provider key is configured on the server" });
      }

      // Detailed prompt for transcription
      const transcriptionPrompt = `
You are an expert, professional video transcriptionist, translator, and subtitler.
Analyze the audio file and transcribe or translate all the spoken dialogue into the target subtitle language: ${normalizedLanguage}.

Configuration:
- Target Subtitle Language: ${normalizedLanguage}
- Translation Rule: If the spoken speech in the audio is in a different language than the target subtitle language (${normalizedLanguage}), you MUST translate the spoken dialogue into the target language (${normalizedLanguage}) for the generated subtitles. Do NOT output in the original spoken language if it differs from ${normalizedLanguage}.
- Filler Words: ${toBoolean(removeFillerWords) ? "STRICTLY DETECT AND REMOVE filler words (um, uh, hmm, repeated words) from the output text." : 'PRESERVE filler words as spoken (e.g. keep "um", "uh", "hmm").'}
- Smart Punctuation: ${toBoolean(smartPunctuation) ? "Apply professional, natural punctuation. Add periods, commas, colons, question marks, exclamation marks, and capitalize proper nouns and starts of sentences correctly." : "Output plain words without formal punctuation."}
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

      const runGeminiTranscription = async (): Promise<SubtitleBlock[]> => {
        const response = await generateContentWithFallback({
          contents: [
            {
              inlineData: {
                data: rawBase64,
                mimeType: normalizedMimeType,
              },
            },
            transcriptionPrompt,
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              description:
                "A chronological list of formatted subtitle segments synchronized with the video audio",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: {
                    type: Type.STRING,
                    description:
                      "A unique sequence identifier, e.g., 'sub_1', 'sub_2'",
                  },
                  startTime: {
                    type: Type.NUMBER,
                    description: "Start time of the subtitle block in seconds",
                  },
                  endTime: {
                    type: Type.NUMBER,
                    description: "End time of the subtitle block in seconds",
                  },
                  text: {
                    type: Type.STRING,
                    description:
                      "The transcribed subtitle text containing words spoken in this interval",
                  },
                  speaker: {
                    type: Type.STRING,
                    description:
                      "Label of the speaker, e.g., 'Speaker 1', 'Speaker 2'",
                  },
                },
                required: ["id", "startTime", "endTime", "text", "speaker"],
              },
            },
          },
        });

        const responseText = response.text;
        const parsedSubtitles = parseJsonResponse(responseText, "[]");
        const normalized = normalizeSubtitleTimeline(
          parsedSubtitles as SubtitleBlock[],
        );
        const translated = await translateSubtitlesWithGemini({
          subtitles: normalized,
          targetLanguage: normalizedLanguage,
        });
        return normalizeSubtitleTimeline(translated);
      };

      const runOpenAITranscription = async (): Promise<SubtitleBlock[]> => {
        if (!process.env.OPENAI_API_KEY) {
          throw createHttpError(500, "OpenAI fallback key is not configured");
        }

        return transcribeWithOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          rawBase64,
          mimeType: normalizedMimeType,
          targetLanguage: normalizedLanguage,
          removeFillerWords: toBoolean(removeFillerWords),
          smartPunctuation: toBoolean(smartPunctuation, true),
          speakerDetection: toBoolean(speakerDetection),
        });
      };

      let subtitles: SubtitleBlock[] = [];
      let provider: "gemini" | "openai" = "gemini";
      let fallbackUsed = false;
      if (geminiConfigured) {
        try {
          subtitles = await runGeminiTranscription();
          provider = "gemini";
        } catch (geminiError: any) {
          if (openAIConfigured && isGeminiFailoverEligibleError(geminiError)) {
            console.warn(
              "[AI] Gemini unavailable/rate-limited. Falling back to OpenAI transcription.",
            );
            subtitles = await runOpenAITranscription();
            provider = "openai";
            fallbackUsed = true;
          } else {
            throw geminiError;
          }
        }
      } else {
        subtitles = await runOpenAITranscription();
        provider = "openai";
      }

      res.json({ success: true, subtitles, provider, fallbackUsed });
    } catch (error: any) {
      const { status, message } = safeError(error);
      console.error("Transcription Error:", error);
      res
        .status(status)
        .json({
          error: status >= 500 ? "Transcription request failed" : message,
        });
    }
  });

  // AI Punctuation and Correction Suggestions
  app.post("/api/suggest-corrections", aiLimiter, async (req, res) => {
    try {
      const subtitles = parseSubtitleArray(req.body?.subtitles);

      const response = await generateContentWithFallback({
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
                id: {
                  type: Type.STRING,
                  description:
                    "The original subtitle element ID needing correction",
                },
                originalText: {
                  type: Type.STRING,
                  description: "The text as it currently exists",
                },
                suggestedText: {
                  type: Type.STRING,
                  description: "The corrected text recommendation",
                },
                reason: {
                  type: Type.STRING,
                  description:
                    "A short reason or explanation for this correction",
                },
              },
              required: ["id", "originalText", "suggestedText", "reason"],
            },
          },
        },
      });

      const parsedSuggestions = parseJsonResponse(response.text, "[]");
      res.json({ success: true, suggestions: parsedSuggestions });
    } catch (error) {
      const { status, message } = safeError(error);
      console.error("Correction Suggestion Error:", error);
      res
        .status(status)
        .json({ error: status >= 500 ? "Suggestion request failed" : message });
    }
  });

  // AI Filler Words Cleaner Endpoint
  app.post("/api/clean-fillers", aiLimiter, async (req, res) => {
    try {
      const subtitles = parseSubtitleArray(req.body?.subtitles);

      const response = await generateContentWithFallback({
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
                speaker: { type: Type.STRING },
              },
              required: ["id", "startTime", "endTime", "text", "speaker"],
            },
          },
        },
      });

      const cleaned = parseJsonResponse(response.text, "[]");
      res.json({ success: true, subtitles: cleaned });
    } catch (error) {
      const { status, message } = safeError(error);
      console.error("Filler Words Cleaning Error:", error);
      res
        .status(status)
        .json({
          error: status >= 500 ? "Filler-clean request failed" : message,
        });
    }
  });

  // Serve static files and handle Vite logic on singleport setup
  if (process.env.NODE_ENV === "production") {
    app.use(express.static("./dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("./dist/index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

startServer();
