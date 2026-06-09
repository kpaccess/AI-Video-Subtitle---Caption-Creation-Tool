import { GoogleGenAI, Type } from "@google/genai";

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

export type SubtitleBlock = {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker: string;
};

export const createHttpError = (
  status: number,
  message: string,
): Error & { status?: number } => {
  const err: Error & { status?: number } = new Error(message);
  err.status = status;
  return err;
};

export const safeError = (error: unknown): { status: number; message: string } => {
  if (error instanceof Error && (error as Error & { status?: number }).status) {
    const status = (error as Error & { status?: number }).status || 500;
    return { status, message: error.message };
  }
  return { status: 500, message: "Internal server error" };
};

export const requireApiKey = (requestHeaders: Headers): void => {
  const expected = process.env.APP_API_KEY;
  if (!expected) return;

  const supplied = requestHeaders.get("x-api-key");
  if (supplied !== expected) {
    throw createHttpError(401, "Unauthorized");
  }
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

    if (!id || !Number.isFinite(startTime) || !Number.isFinite(endTime) || !speaker) {
      throw createHttpError(400, `Malformed subtitle at index ${index}`);
    }

    if (text.length > MAX_SUBTITLE_TEXT_LENGTH) {
      throw createHttpError(400, `Subtitle text too long at index ${index}`);
    }

    return { id, startTime, endTime, text, speaker };
  });
};

const isRetryableStatus = (statusCode: number): boolean => {
  return statusCode === 429 || statusCode === 500 || statusCode === 503;
};

const isGeminiFailoverEligibleError = (error: any): boolean => {
  const statusCode = Number(error?.status || error?.statusCode || error?.error?.code || 0);
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

const normalizeSubtitleTimeline = (subtitles: SubtitleBlock[]): SubtitleBlock[] => {
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
  return text.replace(/[.,!?;:]/g, "").replace(/\s{2,}/g, " ").trim();
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "nextjs-netlify-build",
    },
  },
});

const MODELS_CHAIN = [
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

const parseJsonResponse = (rawText: string | undefined | null, fallbackValue = "[]"): any => {
  if (!rawText || rawText.trim() === "") {
    return JSON.parse(fallbackValue);
  }

  let cleanText = rawText.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }

  try {
    return JSON.parse(cleanText);
  } catch {
    const arrayMatch = cleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);
    const objectMatch = cleanText.match(/\{\s*[\s\S]*\}/);
    if (objectMatch) return JSON.parse(objectMatch[0]);
    throw createHttpError(500, "Invalid AI JSON response");
  }
};

const generateContentWithFallback = async (params: { contents: any; config?: any }) => {
  let lastError: any = null;

  for (const model of MODELS_CHAIN) {
    let retries = 2;
    while (retries > 0) {
      try {
        return await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
      } catch (err: any) {
        lastError = err;
        const statusCode = err.status || err.statusCode || (err.error && err.error.code) || 500;
        if (isRetryableStatus(statusCode)) {
          retries--;
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }
        }
        break;
      }
    }
  }

  throw lastError || new Error("All models in the fallback chain failed");
};

const translateTextsWithOpenAI = async (params: {
  apiKey: string;
  targetLanguage: string;
  items: Array<{ id: string; text: string }>;
}): Promise<Map<string, string>> => {
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
    throw createHttpError(response.status, `OpenAI translation failed: ${details || response.statusText}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const parsed = parseJsonResponse(content, '{"translations": []}');
  const translations = Array.isArray(parsed?.translations) ? parsed.translations : [];
  const map = new Map<string, string>();
  for (const item of translations) {
    const id = String(item?.id ?? "").trim();
    const translatedText = String(item?.translatedText ?? "").trim();
    if (id && translatedText) map.set(id, translatedText);
  }
  return map;
};

const transcribeWithOpenAI = async (params: {
  apiKey: string;
  rawBase64: string;
  mimeType: string;
  targetLanguage: string;
  removeFillerWords: boolean;
  smartPunctuation: boolean;
  speakerDetection: boolean;
}): Promise<SubtitleBlock[]> => {
  const model = process.env.OPENAI_MODEL_TRANSCRIBE || "gpt-4o-mini-transcribe";
  const audioBuffer = Buffer.from(params.rawBase64, "base64");
  const mimeSubtype = params.mimeType.split("/")[1] || "wav";
  const ext = mimeSubtype === "mpeg" ? "mp3" : mimeSubtype;

  const form = new FormData();
  form.append("file", new Blob([audioBuffer], { type: params.mimeType }), `audio.${ext}`);
  form.append("model", model);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append(
    "prompt",
    `Transcribe accurately for subtitles. ${params.smartPunctuation ? "Use natural punctuation and capitalization." : "Keep punctuation minimal."}`,
  );

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${params.apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw createHttpError(response.status, `OpenAI transcription failed: ${details || response.statusText}`);
  }

  const payload = await response.json();
  const segments = Array.isArray(payload?.segments) ? payload.segments : [];
  const defaultSpeaker = params.speakerDetection ? "Speaker 1" : "Speaker 1";

  let subtitles: SubtitleBlock[] = segments
    .map((segment: any, index: number) => {
      const startTime = Number(segment?.start ?? 0);
      const endTime = Number(segment?.end ?? startTime + 1.2);
      let text = String(segment?.text ?? "").trim();

      if (params.removeFillerWords) text = stripFillerWords(text);
      if (!params.smartPunctuation) text = stripPunctuation(text);

      return { id: makeSubtitleId(index), startTime, endTime, text, speaker: defaultSpeaker };
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
};

const translateSubtitlesWithGemini = async (params: {
  subtitles: SubtitleBlock[];
  targetLanguage: string;
}): Promise<SubtitleBlock[]> => {
  if (!params.subtitles.length) return params.subtitles;

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
      if (id && text) textById.set(id, text);
    }
  }

  return params.subtitles.map((sub) => ({
    ...sub,
    text: textById.get(sub.id) || sub.text,
  }));
};

export const getHealthPayload = () => {
  if (process.env.NODE_ENV === "production") {
    return { status: "ok" };
  }

  return {
    status: "ok",
    providers: {
      gemini: !!process.env.GEMINI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
    },
  };
};

export const transcribeFromPayload = async (payload: any) => {
  const { fileData, mimeType, language, removeFillerWords, smartPunctuation, speakerDetection } = payload || {};

  const rawBase64 = parseBase64Data(fileData);
  const normalizedMimeType = parseMimeType(mimeType);
  const normalizedLanguage = parseLanguage(language);

  const geminiConfigured = !!process.env.GEMINI_API_KEY;
  const openAIConfigured = !!process.env.OPENAI_API_KEY;
  if (!geminiConfigured && !openAIConfigured) {
    throw createHttpError(500, "No AI provider key is configured on the server");
  }

  const transcriptionPrompt = `
You are an expert, professional video transcriptionist, translator, and subtitler.
Analyze the audio file and transcribe or translate all the spoken dialogue into the target subtitle language: ${normalizedLanguage}.

Configuration:
- Target Subtitle Language: ${normalizedLanguage}
- Translation Rule: If the spoken speech in the audio is in a different language than the target subtitle language (${normalizedLanguage}), you MUST translate the spoken dialogue into the target language (${normalizedLanguage}) for the generated subtitles. Do NOT output in the original spoken language if it differs from ${normalizedLanguage}.
- Filler Words: ${toBoolean(removeFillerWords) ? "STRICTLY DETECT AND REMOVE filler words (um, uh, hmm, repeated words) from the output text." : 'PRESERVE filler words as spoken (e.g. keep "um", "uh", "hmm").'}
- Smart Punctuation: ${toBoolean(smartPunctuation) ? "Apply professional, natural punctuation. Add periods, commas, colons, question marks, exclamation marks, and capitalize proper nouns and starts of sentences correctly." : "Output plain words without formal punctuation."}
- Speaker Detection: ${toBoolean(speakerDetection) ? 'Identify different speakers. Carefully segment when a different person starts speaking and label them sequentially (e.g. "Speaker 1", "Speaker 2").' : 'Keep as a single default speaker (e.g. "Speaker 1").'}
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

    const parsedSubtitles = parseJsonResponse(response.text, "[]");
    const normalized = normalizeSubtitleTimeline(parsedSubtitles as SubtitleBlock[]);
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

  return { subtitles, provider, fallbackUsed };
};

export const suggestCorrectionsFromPayload = async (payload: any) => {
  const subtitles = parseSubtitleArray(payload?.subtitles);

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
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            originalText: { type: Type.STRING },
            suggestedText: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ["id", "originalText", "suggestedText", "reason"],
        },
      },
    },
  });

  const suggestions = parseJsonResponse(response.text, "[]");
  return { suggestions };
};

export const cleanFillersFromPayload = async (payload: any) => {
  const subtitles = parseSubtitleArray(payload?.subtitles);

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
  return { subtitles: cleaned };
};
