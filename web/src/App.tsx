"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Upload,
  Settings,
  Trash2,
  Plus,
  Download,
  Sparkles,
  Type as FontIcon,
  Check,
  Sliders,
  Layers,
  Volume2,
  RotateCcw,
  Activity,
  Moon,
  Scissors,
  FolderSync,
  Eye,
  FileText,
  PlusCircle,
  AlertCircle,
  Clock,
  User,
  ExternalLink,
  Camera,
  Film,
} from "lucide-react";

// Subtitle segment type Definition
interface Subtitle {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker: string;
}

// AI Suggestion type Definition
interface AISuggestion {
  id: string;
  originalText: string;
  suggestedText: string;
  reason: string;
}

interface AITranscriptionError {
  message: string;
  status?: number;
  provider?: string;
  at: string;
}

// Sample Project Definition
interface SampleProject {
  name: string;
  description: string;
  videoUrl: string;
  webmUrl?: string;
  subtitles: Subtitle[];
}

const SAMPLE_PROJECTS: SampleProject[] = [
  {
    name: "Multi-Speaker Studio Podcast",
    description:
      "Two-seater podcast conversation analyzing modern design systems.",
    videoUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    webmUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/ec/Nature_Clip_%28Water%29_1080p.webm",
    subtitles: [
      {
        id: "sub_1",
        startTime: 1.0,
        endTime: 4.5,
        text: "Hey everyone! Welcome back to the Design Studio.",
        speaker: "Speaker 1",
      },
      {
        id: "sub_2",
        startTime: 4.8,
        endTime: 7.5,
        text: "Wait, have you seen this new caption generator yet?",
        speaker: "Speaker 2",
      },
      {
        id: "sub_3",
        startTime: 8.0,
        endTime: 11.2,
        text: "It uses Gemini to transcribe everything with zero latency.",
        speaker: "Speaker 1",
      },
      {
        id: "sub_4",
        startTime: 11.5,
        endTime: 14.8,
        text: "And we can customize glowing interactive subtitles directly over the frames!",
        speaker: "Speaker 2",
      },
    ],
  },
  {
    name: "Tech Vlog Tutorial",
    description:
      "Single-speaker unboxing and walkthrough with fluid sentences.",
    videoUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    webmUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/22/Volcano_Lava_Sample.webm",
    subtitles: [
      {
        id: "sub_1",
        startTime: 0.5,
        endTime: 3.8,
        text: "Today we are looking at some extreme high-performance rendering.",
        speaker: "Host",
      },
      {
        id: "sub_2",
        startTime: 4.2,
        endTime: 8.0,
        text: "I've been testing this unit on local rendering streams for several days.",
        speaker: "Host",
      },
      {
        id: "sub_3",
        startTime: 8.5,
        endTime: 11.5,
        text: "And as you can see, the thermal outputs remain incredibly moderate.",
        speaker: "Host",
      },
      {
        id: "sub_4",
        startTime: 12.0,
        endTime: 15.0,
        text: "Don't forget to like, subscribe and leave a comment downstairs!",
        speaker: "Host",
      },
    ],
  },
  {
    name: "Dynamic Social Media Reel",
    description:
      "Short fast-paced clip perfect for TikTok-style animated pop text.",
    videoUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    webmUrl:
      "https://upload.wikimedia.org/wikipedia/commons/transcoded/f/f1/Aurora_and_sunset_seen_from_orbit.ogv/Aurora_and_sunset_seen_from_orbit.ogv.360p.vp9.webm",
    subtitles: [
      {
        id: "sub_1",
        startTime: 0.0,
        endTime: 3.5,
        text: "ATTENTION ALL CREATORS!",
        speaker: "Speaker 1",
      },
      {
        id: "sub_2",
        startTime: 4.0,
        endTime: 8.0,
        text: "TAP OR DRAG SUBTITLES ANYWHERE ON YOUR TIMELINE",
        speaker: "Speaker 1",
      },
      {
        id: "sub_3",
        startTime: 8.5,
        endTime: 12.0,
        text: "BOUNCING NEON GRAPHICS BOOST ENGAGEMENT RADICALLY!",
        speaker: "Speaker 1",
      },
    ],
  },
  {
    name: "WhatsApp Custom Reel",
    description:
      "Your custom imported WhatsApp sample video. Ready for instant transcription.",
    videoUrl: "/whatsapp_sample.mp4",
    subtitles: [
      {
        id: "sub_1",
        startTime: 1.0,
        endTime: 5.0,
        text: "Click the Trigger Gemini AI button in the AI panel to transcribe this video!",
        speaker: "Speaker 1",
      },
    ],
  },
];

export default function App() {
  const apiKey = process.env.NEXT_PUBLIC_APP_API_KEY as string | undefined;

  const getApiHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey && apiKey.trim().length > 0) {
      headers["x-api-key"] = apiKey.trim();
    }
    return headers;
  };

  const parseApiResponse = async (response: Response): Promise<any> => {
    const bodyText = await response.text();
    if (!bodyText || bodyText.trim().length === 0) {
      return {};
    }

    try {
      return JSON.parse(bodyText);
    } catch {
      const compactBody = bodyText.slice(0, 240).replace(/\s+/g, " ").trim();
      throw new Error(
        `Server returned a non-JSON response (${response.status}). ${compactBody || response.statusText || "No details available."}`,
      );
    }
  };

  // Main states
  const [subtitles, setSubtitles] = useState<Subtitle[]>(
    SAMPLE_PROJECTS[0].subtitles,
  );
  const [selectedSubId, setSelectedSubId] = useState<string | null>("sub_1");
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(15.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playLimitTime, setPlayLimitTime] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>(SAMPLE_PROJECTS[0].videoUrl);
  const [activeTab, setActiveTab] = useState<
    "ai" | "style" | "editor" | "smart"
  >("style");
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isSubtitlesVisible, setIsSubtitlesVisible] = useState<boolean>(true);

  // Video fallback and player simulator states
  const [virtualVideoMode, setVirtualVideoMode] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [triedWebm, setTriedWebm] = useState<boolean>(false);
  const [isAudioLoaded, setIsAudioLoaded] = useState<boolean>(false);

  // File states
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  // AI states
  const [txLang, setTxLang] = useState<string>("English (US)");
  const [txFillerWords, setTxFillerWords] = useState<boolean>(true);
  const [txSmartPunc, setTxSmartPunc] = useState<boolean>(true);
  const [txSpeakerDet, setTxSpeakerDet] = useState<boolean>(true);
  const [txLoading, setTxLoading] = useState<boolean>(false);
  const [txStep, setTxStep] = useState<string>("");
  const [lastAIProvider, setLastAIProvider] = useState<string | null>(null);
  const [lastAIFallbackUsed, setLastAIFallbackUsed] = useState<boolean>(false);
  const [aiTranscriptionError, setAITranscriptionError] =
    useState<AITranscriptionError | null>(null);

  // AI Suggestions
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] =
    useState<boolean>(false);

  // Styling States
  const [fontFamily, setFontFamily] = useState<string>("Space Grotesk");
  const [fontSize, setFontSize] = useState<number>(24);
  const [textColor, setTextColor] = useState<string>("#ffffff");
  const [textOpacity, setTextOpacity] = useState<number>(1);
  const [fontWeight, setFontWeight] = useState<"bold" | "normal">("bold");
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [letterSpacing, setLetterSpacing] = useState<string>("normal");
  const [backgroundColor, setBackgroundColor] = useState<string>("#000000");
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(0.55);
  const [outlineColor, setOutlineColor] = useState<string>("#000000");
  const [outlineWidth, setOutlineWidth] = useState<number>(2);
  const [textShadowColor, setTextShadowColor] = useState<string>("#000000");
  const [textShadowOpacity, setTextShadowOpacity] = useState<number>(0.5);
  const [glowColor, setGlowColor] = useState<string>("#3b82f6");
  const [glowIntensity, setGlowIntensity] = useState<number>(0);

  // Instagram-style upgrades
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [textGradient, setTextGradient] = useState<
    "none" | "sunset" | "neon" | "forest"
  >("none");
  const [backdropStyle, setBackdropStyle] = useState<
    "none" | "shadow" | "frosted"
  >("shadow");
  const [textCase, setTextCase] = useState<
    "original" | "uppercase" | "lowercase" | "startcase"
  >("original");

  // Caption alignment & dragging
  const [alignment, setAlignment] = useState<"bottom" | "top" | "custom">(
    "bottom",
  );
  const [customX, setCustomX] = useState<number>(50); // percentage
  const [customY, setCustomY] = useState<number>(85); // percentage
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Animation Preset
  const [animationPreset, setAnimationPreset] = useState<
    | "pop"
    | "karaoke"
    | "bounce"
    | "zoom"
    | "fade"
    | "social"
    | "word"
    | "speaker"
  >("social");

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Camera recording states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [mediaRecorderInstance, setMediaRecorderInstance] =
    useState<MediaRecorder | null>(null);
  const [isRecordingCamera, setIsRecordingCamera] = useState<boolean>(false);
  const [cameraRecordingUrl, setCameraRecordingUrl] = useState<string | null>(
    null,
  );
  const [cameraDuration, setCameraDuration] = useState<number>(0);

  // Video exporting / subtitle burning states
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportVideoUrl, setExportVideoUrl] = useState<string | null>(null);
  const [exportRecorder, setExportRecorder] = useState<MediaRecorder | null>(
    null,
  );

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const subtitleListRef = useRef<HTMLDivElement>(null);

  // Sync video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 15.0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [videoUrl]);

  // Adjust volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Adjust speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Load a Predefined Sample Project
  const handleSelectSample = (sample: SampleProject) => {
    setVideoUrl(sample.videoUrl);
    setSubtitles(sample.subtitles);
    setUploadedFileName(null);
    setCurrentTime(0);
    setSelectedSubId(sample.subtitles[0]?.id || null);
    setVideoError(null);
    setTriedWebm(false);
    setVirtualVideoMode(false);
    setIsAudioLoaded(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.load();
    }
  };

  // Handle native video player load/playback errors
  const handleVideoError = () => {
    // Attempt WebM fallback first if we haven't already
    const currentSample = SAMPLE_PROJECTS.find((p) => p.videoUrl === videoUrl);
    if (currentSample && currentSample.webmUrl && !triedWebm) {
      setTriedWebm(true);
      setVideoUrl(currentSample.webmUrl);
      console.log(
        "Primary video source failed. Successfully routed down-sampled WebM fallback stream.",
      );
      return;
    }

    // Direct fallback to Virtual Simulator
    setVideoError("Native file codec support not detected.");
    setVirtualVideoMode(true);
  };

  // Find currently active subtitle
  const activeSub = subtitles.find(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime,
  );

  // Play / Pause toggling
  const handlePlayPause = () => {
    if (virtualVideoMode) {
      const audio = audioRef.current;
      if (audio) {
        if (isPlaying) {
          audio.pause();
          setIsPlaying(false);
        } else {
          audio.currentTime = currentTime;
          audio
            .play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch((err) => {
              console.warn("Fallback audio play failed:", err);
              setIsPlaying(true);
            });
        }
      } else {
        setIsPlaying((prev) => !prev);
      }
    } else {
      const video = videoRef.current;
      if (!video) return;
      if (isPlaying) {
        video.pause();
      } else {
        video.play().catch((err) => {
          console.error("Playback interrupted:", err);
          if (err.name === "NotAllowedError") {
            setIsPlaying(false);
            alert(
              "Playback blocked by browser autoplay policy. Please click the play button or video preview directly to enable sound.",
            );
          } else {
            setVirtualVideoMode(true);
            setIsPlaying(true);
          }
        });
      }
    }
  };

  // Skip / seek video
  const handleSeek = (newTime: number) => {
    const boundedTime = Math.max(0, Math.min(newTime, duration));
    setCurrentTime(boundedTime);
    if (virtualVideoMode) {
      if (audioRef.current) {
        try {
          audioRef.current.currentTime = boundedTime;
        } catch (err) {
          console.warn("Fallback audio seeking failed:", err);
        }
      }
    } else if (videoRef.current) {
      try {
        videoRef.current.currentTime = boundedTime;
      } catch (err) {
        console.warn("Direct HTML5 video seeking failed:", err);
      }
    }
  };

  // Play a specific subtitle segment (line preview)
  const handlePlaySegment = (sub: Subtitle) => {
    const media = virtualVideoMode ? audioRef.current : videoRef.current;
    if (media) {
      handleSeek(sub.startTime);
      setPlayLimitTime(sub.endTime);
      media.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.warn("Play segment failed:", err));
    }
  };

  // Sync audio time when in virtual mode
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !virtualVideoMode) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 15.0);
      setIsAudioLoaded(true);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    if (audio.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [videoUrl, virtualVideoMode]);

  // Smooth high-frequency playhead tracking to prevent subtitle/audio sync lag
  useEffect(() => {
    if (!isPlaying) return;

    let frameId: number;
    const trackPlayhead = () => {
      const media = virtualVideoMode ? audioRef.current : videoRef.current;
      if (media) {
        const time = media.currentTime;
        setCurrentTime(time);

        // Auto-pause if we have a play limit (for play segment preview)
        if (playLimitTime !== null && time >= playLimitTime) {
          media.pause();
          setIsPlaying(false);
          setPlayLimitTime(null);
        }
      }
      frameId = requestAnimationFrame(trackPlayhead);
    };

    frameId = requestAnimationFrame(trackPlayhead);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, virtualVideoMode, playLimitTime]);

  // Auto-scroll active subtitle card into view in the editor list
  useEffect(() => {
    if (activeSub && activeTab === "editor") {
      const activeCard = document.getElementById(`editor-card-${activeSub.id}`);
      if (activeCard && subtitleListRef.current) {
        activeCard.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [activeSub?.id, activeTab]);

  // Virtual Codec Simulation / Playback ticking simulator (only when audio isn't active/loaded)
  useEffect(() => {
    if (!virtualVideoMode || !isPlaying || isAudioLoaded) return;

    let lastTime = performance.now();
    let frameId: number;

    const tick = () => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000; // seconds
      lastTime = now;

      setCurrentTime((prev) => {
        const next = prev + delta * playbackSpeed;
        if (next >= duration) {
          setIsPlaying(false);
          return 0;
        }
        if (playLimitTime !== null && next >= playLimitTime) {
          setIsPlaying(false);
          setPlayLimitTime(null);
          return playLimitTime;
        }
        return next;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [virtualVideoMode, isPlaying, playbackSpeed, duration, isAudioLoaded, playLimitTime]);

  // Timeline mouse seeking
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const rect = timeline.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(clickX / rect.width, 1));
    handleSeek(ratio * duration);
  };

  // Downsample & Extract Audio Track in-browser as standard WAV Mono (16000Hz)
  const extractAudio = async (
    file: File,
  ): Promise<{ fileData: string; mimeType: string }> => {
    try {
      setTxStep("Interpreting uploaded file properties...");
      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const arrayBuffer = await file.arrayBuffer();

      setTxStep("Decoding audio frequencies (Web Audio API)...");
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      setTxStep("Resampling audio to mono 16000Hz WAV...");
      const targetSampleRate = 16000;
      const offlineCtx = new OfflineAudioContext(
        1,
        Math.floor(audioBuffer.duration * targetSampleRate),
        targetSampleRate,
      );

      const bufferSource = offlineCtx.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(offlineCtx.destination);
      bufferSource.start();

      const resampledBuffer = await offlineCtx.startRendering();

      setTxStep("Assembling Wave data buffers...");
      const wavBytes = encodeWAV(resampledBuffer);
      const blob = new Blob([wavBytes], { type: "audio/wav" });

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            fileData: reader.result as string,
            mimeType: "audio/wav",
          });
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn(
        "Fast audio extraction failed. Processing direct file fallback...",
        e,
      );
      // Fallback: Read source file directly as base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            fileData: reader.result as string,
            mimeType: file.type,
          });
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    }
  };

  // Helper arrays/structures for WAV Encoder
  const encodeWAV = (audioBuffer: AudioBuffer): Uint8Array => {
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = 1;
    const samples = audioBuffer.getChannelData(0);
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, s: string) => {
      for (let i = 0; i < s.length; i++) {
        view.setUint8(offset + i, s.charCodeAt(i));
      }
    };

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // Linear PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); // Byte rate
    view.setUint16(32, numChannels * 2, true); // Block align
    view.setUint16(34, 16, true); // 16 bits
    writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);

    // Quantize floating samples to 16-bit PCM short integers
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Uint8Array(buffer);
  };

  // Handle local video/audio uploading
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadStatus(`Extracted ${file.name}. Ready for AI transcription.`);

    // Create local object URL for preview
    const objectUrl = URL.createObjectURL(file);
    setVideoUrl(objectUrl);
    setCurrentTime(0);
    setSubtitles([]);
    setSelectedSubId(null);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.load();
    }
  };

  // Camera recording timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRecordingCamera) {
      setCameraDuration(0);
      timer = setInterval(() => {
        setCameraDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCameraDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecordingCamera]);

  // Camera recording helpers
  const handleStartCamera = async () => {
    try {
      setCameraRecordingUrl(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setCameraStream(stream);
      setIsCameraActive(true);

      // Delay slightly to ensure element exists in DOM
      setTimeout(() => {
        const cameraVideo = document.getElementById(
          "camera-preview-video",
        ) as HTMLVideoElement;
        if (cameraVideo) {
          cameraVideo.srcObject = stream;
          cameraVideo.play().catch(() => {});
        }
      }, 200);
    } catch (err) {
      console.error(err);
      alert(
        "Failed to access camera/microphone. Please ensure permissions are granted.",
      );
    }
  };

  const handleStopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setIsRecordingCamera(false);
    if (mediaRecorderInstance && mediaRecorderInstance.state !== "inactive") {
      mediaRecorderInstance.stop();
    }
  };

  const handleStartRecordingCamera = () => {
    if (!cameraStream) return;
    const recorder = new MediaRecorder(cameraStream, {
      mimeType: "video/webm",
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setCameraRecordingUrl(url);

      // Stop the stream tracks after recording stops
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    };

    recorder.start();
    setMediaRecorderInstance(recorder);
    setIsRecordingCamera(true);
  };

  const handleStopRecordingCamera = () => {
    if (mediaRecorderInstance && mediaRecorderInstance.state !== "inactive") {
      mediaRecorderInstance.stop();
    }
    setIsRecordingCamera(false);
  };

  const handleUseRecording = () => {
    if (!cameraRecordingUrl) return;

    fetch(cameraRecordingUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], "camera_recording.webm", {
          type: "video/webm",
        });
        const fileInput = document.getElementById(
          "video_file_input",
        ) as HTMLInputElement;
        if (fileInput) {
          const container = new DataTransfer();
          container.items.add(file);
          fileInput.files = container.files;
        }

        setUploadedFileName("camera_recording.webm");
        setUploadStatus(
          "Imported camera recording. Ready for AI transcription.",
        );
        setVideoUrl(cameraRecordingUrl);
        setCurrentTime(0);
        setSubtitles([]);
        setSelectedSubId(null);
        setIsCameraActive(false);
        setCameraRecordingUrl(null);
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to import camera recording.");
      });
  };

  // Canvas drawing helper for rounded rectangles
  const drawRoundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) => {
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
    } else {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  };

  // Canvas Captions Renderer
  const drawCaptionsOnCanvas = (
    ctx: CanvasRenderingContext2D,
    time: number,
    vWidth: number,
    vHeight: number,
    scale: number,
  ) => {
    if (!isSubtitlesVisible) return;

    const sub = subtitles.find((s) => time >= s.startTime && time <= s.endTime);
    if (!sub) return;

    const fontSizeScaled = fontSize * scale;
    const outlineWidthScaled = outlineWidth * scale;
    const glowBlurScaled = glowIntensity * 4 * scale;

    const fontString = `${fontWeight} ${isItalic ? "italic" : ""} ${fontSizeScaled}px ${
      fontFamily === "Space Grotesk"
        ? '"Space Grotesk", sans-serif'
        : fontFamily === "Playfair Display"
          ? '"Playfair Display", serif'
          : fontFamily === "Fira Code"
            ? '"Fira Code", monospace'
            : "sans-serif"
    }`;
    ctx.font = fontString;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let posX = vWidth / 2;
    let posY = vHeight * 0.85;
    if (alignment === "top") {
      posY = vHeight * 0.12;
    } else if (alignment === "custom") {
      posX = (customX / 100) * vWidth;
      posY = (customY / 100) * vHeight;
    }

    const localHexToRgba = (hexStr: string, alpha: number): string => {
      const clean = hexStr.replace("#", "");
      const r = parseInt(clean.substring(0, 2), 16) || 0;
      const g = parseInt(clean.substring(2, 4), 16) || 0;
      const b = parseInt(clean.substring(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const formatTextCaseLocal = (txt: string): string => {
      if (textCase === "uppercase") return txt.toUpperCase();
      if (textCase === "lowercase") return txt.toLowerCase();
      if (textCase === "startcase") {
        return txt.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
      }
      return txt;
    };

    const getCanvasGradient = (
      startX: number,
      endX: number,
    ): CanvasGradient | string => {
      if (textGradient === "none") return textColor;
      const grad = ctx.createLinearGradient(startX, 0, endX, 0);
      if (textGradient === "sunset") {
        grad.addColorStop(0, "#f97316");
        grad.addColorStop(0.5, "#ec4899");
        grad.addColorStop(1, "#8b5cf6");
      } else if (textGradient === "neon") {
        grad.addColorStop(0, "#06b6d4");
        grad.addColorStop(0.5, "#d946ef");
        grad.addColorStop(1, "#6366f1");
      } else if (textGradient === "forest") {
        grad.addColorStop(0, "#10b981");
        grad.addColorStop(0.5, "#84cc16");
        grad.addColorStop(1, "#3b82f6");
      }
      return grad;
    };

    // Save initial state, translate & rotate coordinate space
    ctx.save();
    ctx.translate(posX, posY);
    ctx.rotate((rotationAngle * Math.PI) / 180);

    if (
      ["social", "karaoke", "bounce", "pop", "word"].includes(animationPreset)
    ) {
      const words = sub.text.split(" ");
      const spaceWidth = ctx.measureText(" ").width;

      const wordWidths = words.map((w) => {
        const textToMeasure = formatTextCaseLocal(w);
        return ctx.measureText(textToMeasure).width;
      });

      const totalWidth =
        wordWidths.reduce((acc, w) => acc + w, 0) +
        (words.length - 1) * spaceWidth;

      // Draw background card (respecting backdropStyle)
      if (backdropStyle !== "none" && backgroundOpacity > 0) {
        ctx.save();
        ctx.fillStyle = localHexToRgba(backgroundColor, backgroundOpacity);
        const boxWidth = totalWidth + 24 * scale;
        const boxHeight = fontSizeScaled * 1.5;
        const boxX = -boxWidth / 2;
        const boxY = -boxHeight / 2;
        const radius = 8 * scale;
        ctx.beginPath();
        drawRoundRect(ctx, boxX, boxY, boxWidth, boxHeight, radius);
        ctx.fill();
        if (backdropStyle === "frosted") {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 1 * scale;
          ctx.stroke();
        }
        ctx.restore();
      }

      let relativeX = -totalWidth / 2;
      const segmentDuration = sub.endTime - sub.startTime;
      const wordDuration = segmentDuration / Math.max(words.length, 1);
      const sentenceGrad = getCanvasGradient(-totalWidth / 2, totalWidth / 2);

      words.forEach((word, index) => {
        const wordStart = sub.startTime + index * wordDuration;
        const wordEnd = sub.startTime + (index + 1) * wordDuration;
        const isActiveWord = time >= wordStart && time < wordEnd;
        const isPastWord = time >= wordEnd;

        ctx.save();

        let drawWord = formatTextCaseLocal(word);
        let wColor = sentenceGrad;
        let wScale = 1.0;
        let wShadowBlur = glowBlurScaled;
        let wShadowColor = glowColor;

        if (animationPreset === "social") {
          drawWord = drawWord.toUpperCase();
          if (isActiveWord) {
            wColor = "#facc15";
            wScale = 1.1;
          } else {
            wColor =
              textGradient !== "none"
                ? sentenceGrad
                : localHexToRgba(textColor, 0.7);
            wScale = 0.95;
            wShadowBlur = 0;
          }
        } else if (animationPreset === "karaoke") {
          if (isActiveWord || isPastWord) {
            wColor = "#fbbf24";
          } else {
            wColor =
              textGradient !== "none"
                ? sentenceGrad
                : localHexToRgba(textColor, 0.6);
          }
        } else if (animationPreset === "bounce") {
          if (isActiveWord) {
            wColor = "#f472b6";
            wScale = 1.1;
            ctx.translate(0, -6 * scale);
          } else {
            wColor = sentenceGrad;
          }
        } else if (animationPreset === "pop") {
          const isWordVisible = time >= wordStart;
          if (!isWordVisible) {
            ctx.restore();
            relativeX += wordWidths[index] + spaceWidth;
            return;
          }
        } else if (animationPreset === "word") {
          if (!isActiveWord) {
            ctx.restore();
            return;
          }
          relativeX = -wordWidths[index] / 2;
          wScale = 1.05;
          wColor = "#3b82f6";
        }

        ctx.fillStyle = wColor;
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidthScaled;
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;

        if (wShadowBlur > 0) {
          ctx.shadowColor = wShadowColor;
          ctx.shadowBlur = wShadowBlur;
        }

        const wordX = relativeX + wordWidths[index] / 2;
        ctx.translate(wordX, 0);
        ctx.scale(wScale, wScale);

        if (outlineWidthScaled > 0) {
          ctx.strokeText(drawWord, 0, 0);
        }
        ctx.fillText(drawWord, 0, 0);

        ctx.restore();

        if (animationPreset === "word") {
          // No advance
        } else {
          relativeX += wordWidths[index] + spaceWidth;
        }
      });
    } else {
      const formattedText = formatTextCaseLocal(sub.text);
      const textWidth = ctx.measureText(formattedText).width;
      const sentenceGrad = getCanvasGradient(-textWidth / 2, textWidth / 2);

      if (backdropStyle !== "none" && backgroundOpacity > 0) {
        ctx.save();
        ctx.fillStyle = localHexToRgba(backgroundColor, backgroundOpacity);
        const boxWidth = textWidth + 24 * scale;
        const boxHeight = fontSizeScaled * 1.5;
        const boxX = -boxWidth / 2;
        const boxY = -boxHeight / 2;
        const radius = 8 * scale;
        ctx.beginPath();
        drawRoundRect(ctx, boxX, boxY, boxWidth, boxHeight, radius);
        ctx.fill();
        if (backdropStyle === "frosted") {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 1 * scale;
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = sentenceGrad;
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = outlineWidthScaled;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      if (glowBlurScaled > 0) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = glowBlurScaled;
      }

      let textScale = 1.0;
      if (animationPreset === "zoom") {
        const timeIntoSub = time - sub.startTime;
        if (timeIntoSub < 0.25) {
          textScale = 0.5 + (timeIntoSub / 0.25) * 0.5;
        }
      } else if (animationPreset === "fade") {
        const timeIntoSub = time - sub.startTime;
        if (timeIntoSub < 0.3) {
          ctx.globalAlpha = timeIntoSub / 0.3;
        }
      }

      ctx.scale(textScale, textScale);

      if (animationPreset === "speaker") {
        ctx.save();
        ctx.font = `${fontWeight} ${Math.round(12 * scale)}px monospace`;
        ctx.fillStyle = "#fde047";
        ctx.fillText(
          `[ ${sub.speaker.toUpperCase()} ]`,
          0,
          -fontSizeScaled * 0.75,
        );
        ctx.restore();
      }

      if (outlineWidthScaled > 0) {
        ctx.strokeText(formattedText, 0, 0);
      }
      ctx.fillText(formattedText, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  };

  const handleStartBurnVideo = async () => {
    const video = videoRef.current;
    if (!video) {
      alert("No video loaded to export!");
      return;
    }

    if (subtitles.length === 0) {
      const confirmExport = window.confirm(
        "You have no subtitles loaded. Export the video without captions?",
      );
      if (!confirmExport) return;
    }

    setIsExportingVideo(true);
    setExportProgress(0);
    setExportVideoUrl(null);

    const originalMuted = video.muted;
    const originalTime = video.currentTime;
    const originalRate = video.playbackRate;
    const wasPlaying = !video.paused;

    video.pause();
    video.muted = false;
    video.currentTime = 0;

    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 360;

    const canvas = document.createElement("canvas");
    canvas.width = vWidth;
    canvas.height = vHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      alert("Failed to create canvas rendering context");
      setIsExportingVideo(false);
      return;
    }

    const canvasStream = canvas.captureStream(30);
    const canvasVideoTrack = canvasStream.getVideoTracks()[0];

    let audioTrack: MediaStreamTrack | null = null;
    try {
      if (typeof (video as any).captureStream === "function") {
        const videoStream = (video as any).captureStream();
        if (videoStream.getAudioTracks().length > 0) {
          audioTrack = videoStream.getAudioTracks()[0];
        }
      }
    } catch (err) {
      console.warn("Could not capture video audio track:", err);
    }

    const exportStream = new MediaStream();
    exportStream.addTrack(canvasVideoTrack);
    if (audioTrack) {
      exportStream.addTrack(audioTrack);
    }

    let recorder: MediaRecorder;
    const chunks: Blob[] = [];

    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];

    let selectedMime = "";
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    try {
      recorder = selectedMime
        ? new MediaRecorder(exportStream, { mimeType: selectedMime })
        : new MediaRecorder(exportStream);
    } catch (e) {
      console.warn("MediaRecorder creation error, falling back:", e);
      recorder = new MediaRecorder(exportStream);
    }

    setExportRecorder(recorder);

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: selectedMime || "video/webm" });
      const downloadUrl = URL.createObjectURL(blob);
      setExportVideoUrl(downloadUrl);
      setExportProgress(100);

      video.muted = originalMuted;
      video.currentTime = originalTime;
      video.playbackRate = originalRate;
      if (wasPlaying) video.play().catch(() => {});
    };

    const startRecording = async () => {
      try {
        await video.play();
        recorder.start();

        let active = true;
        const renderLoop = () => {
          if (!active) return;

          if (video.ended || video.currentTime >= video.duration) {
            if (recorder.state !== "inactive") {
              recorder.stop();
            }
            video.pause();
            active = false;
            return;
          }

          ctx.drawImage(video, 0, 0, vWidth, vHeight);

          const containerWidth = videoContainerRef.current?.clientWidth || vWidth || 640;
          const scale = containerWidth > 0 ? vWidth / containerWidth : 1;

          drawCaptionsOnCanvas(ctx, video.currentTime, vWidth, vHeight, scale);

          const percent = Math.min(
            99,
            Math.round((video.currentTime / video.duration) * 100),
          );
          setExportProgress(percent);

          requestAnimationFrame(renderLoop);
        };

        requestAnimationFrame(renderLoop);
      } catch (err) {
        console.error("Failed to start export playback:", err);
        alert("Playback error during export. Ensure video can play natively.");
        setIsExportingVideo(false);
        video.muted = originalMuted;
        video.currentTime = originalTime;
        video.playbackRate = originalRate;
      }
    };

    if (video.readyState >= 1) {
      startRecording();
    } else {
      video.onloadedmetadata = startRecording;
    }
  };

  const handleAbortExport = () => {
    if (exportRecorder && exportRecorder.state !== "inactive") {
      exportRecorder.stop();
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.muted = false;
    }
    setIsExportingVideo(false);
    setExportProgress(0);
    setExportVideoUrl(null);
    setExportRecorder(null);
  };

  // Execute Gemini Speech-to-Text Transcription
  const handleAIStartTranscription = async () => {
    const inputElement = document.getElementById(
      "video_file_input",
    ) as HTMLInputElement;
    const file = inputElement?.files?.[0];

    if (!file) {
      alert("Please select or upload a video/audio file first!");
      return;
    }

    setTxLoading(true);
    setTxStep("Decoding audio track in-browser...");
    setAITranscriptionError(null);
    let didSetDetailedError = false;
    try {
      // 1. Extract audio array wav base64
      const extracted = await extractAudio(file);

      // 2. Query server endpoint
      setTxStep("Sending audio frequencies to server...");
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          fileData: extracted.fileData,
          mimeType: extracted.mimeType,
          language: txLang,
          removeFillerWords: txFillerWords,
          smartPunctuation: txSmartPunc,
          speakerDetection: txSpeakerDet,
        }),
      });

      const data = await parseApiResponse(response);
      if (!response.ok) {
        const errMessage = data.error || "Failed transcribing video";
        setAITranscriptionError({
          message: errMessage,
          status: response.status,
          provider:
            typeof data.provider === "string" ? data.provider : undefined,
          at: new Date().toLocaleTimeString(),
        });
        didSetDetailedError = true;
        throw new Error(errMessage);
      }

      // Populate result
      if (data.subtitles && data.subtitles.length > 0) {
        setSubtitles(data.subtitles);
        setSelectedSubId(data.subtitles[0].id);
        setCurrentTime(0);
        if (videoRef.current) videoRef.current.currentTime = 0;
        if (typeof data.provider === "string") {
          setLastAIProvider(data.provider);
        }
        setLastAIFallbackUsed(Boolean(data.fallbackUsed));
        setUploadStatus(
          `Successfully processed ${data.subtitles.length} subtitle segments!`,
        );
      } else {
        throw new Error(
          "No dialogues detected from Gemini transcription. Is the audio silent?",
        );
      }
    } catch (err: any) {
      console.error(err);
      if (!didSetDetailedError) {
        setAITranscriptionError({
          message: err?.message || "Transcription request failed",
          at: new Date().toLocaleTimeString(),
        });
      }
      alert(
        `AI Transcription error: ${err?.message || "Verify your backend server and Gemini API key."}`,
      );
    } finally {
      setTxLoading(false);
      setTxStep("");
    }
  };

  // Trigger Gemini Auto-Correction
  const handleSuggestCorrections = async () => {
    if (!subtitles.length) return;
    setIsSuggestionsLoading(true);
    try {
      const response = await fetch("/api/suggest-corrections", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({ subtitles }),
      });
      const data = await parseApiResponse(response);
      if (!response.ok)
        throw new Error(data.error || "Error scanning subtitles");
      setAiSuggestions(data.suggestions || []);
    } catch (err: any) {
      alert(`Suggestions scan failed: ${err.message}`);
    } finally {
      setIsSuggestionsLoading(false);
    }
  };

  // Apply single AI suggestion to our subtitle list
  const applyCorrection = (id: string, correctedText: string) => {
    setSubtitles((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text: correctedText } : s)),
    );
    setAiSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  // Scrub Filler Words with AI
  const handleScrubFillerWords = async () => {
    if (!subtitles.length) return;
    if (
      !confirm(
        "Are you sure you want to scan and remove filler words from all subtitles?",
      )
    )
      return;

    setIsSuggestionsLoading(true);
    try {
      const response = await fetch("/api/clean-fillers", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({ subtitles }),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || "Filler removal error");
      if (data.subtitles) {
        setSubtitles(data.subtitles);
        alert(
          "Scribbed all 'um', 'uh', 'hmm' and repeated phrases successfully!",
        );
      }
    } catch (err: any) {
      alert(`Scrumming failed: ${err.message}`);
    } finally {
      setIsSuggestionsLoading(false);
    }
  };

  // Apply Styling Presets directly (TikTok, Future, Cinema etc.)
  const applyStylePreset = (preset: string) => {
    if (preset === "tiktok") {
      setFontFamily("Space Grotesk");
      setFontSize(28);
      setTextColor("#facc15"); // Yellow
      setTextOpacity(1);
      setFontWeight("bold");
      setIsItalic(false);
      setLetterSpacing("wider");
      setBackgroundColor("#000000");
      setBackgroundOpacity(0.8);
      setOutlineColor("#000000");
      setOutlineWidth(4);
      setGlowIntensity(2);
      setGlowColor("#f59e0b");
      setAlignment("custom");
      setCustomX(50);
      setCustomY(75);
      setAnimationPreset("social");
      setRotationAngle(-4);
      setTextGradient("none");
      setBackdropStyle("frosted");
      setTextCase("uppercase");
    } else if (preset === "cinema") {
      setFontFamily("Playfair Display");
      setFontSize(22);
      setTextColor("#ffffff");
      setTextOpacity(0.95);
      setFontWeight("normal");
      setIsItalic(false);
      setLetterSpacing("normal");
      setBackgroundColor("#000000");
      setBackgroundOpacity(0.4);
      setOutlineColor("#ffffff");
      setOutlineWidth(0);
      setGlowIntensity(0);
      setAlignment("bottom");
      setAnimationPreset("fade");
      setRotationAngle(0);
      setTextGradient("none");
      setBackdropStyle("shadow");
      setTextCase("original");
    } else if (preset === "cyberpunk") {
      setFontFamily("Fira Code");
      setFontSize(24);
      setTextColor("#f43f5e"); // Rose Magenta
      setTextOpacity(1);
      setFontWeight("bold");
      setIsItalic(true);
      setLetterSpacing("wide");
      setBackgroundColor("#171717");
      setBackgroundOpacity(0.9);
      setOutlineColor("#000000");
      setOutlineWidth(2);
      setGlowIntensity(6);
      setGlowColor("#ec4899");
      setAlignment("custom");
      setCustomX(50);
      setCustomY(80);
      setAnimationPreset("bounce");
      setRotationAngle(2);
      setTextGradient("neon");
      setBackdropStyle("none");
      setTextCase("lowercase");
    } else if (preset === "karaoke") {
      setFontFamily("Inter");
      setFontSize(25);
      setTextColor("#ffffff");
      setTextOpacity(1);
      setFontWeight("bold");
      setIsItalic(false);
      setLetterSpacing("normal");
      setBackgroundColor("#000000");
      setBackgroundOpacity(0.6);
      setOutlineColor("#000000");
      setOutlineWidth(1);
      setGlowIntensity(0);
      setAnimationPreset("karaoke");
      setRotationAngle(0);
      setTextGradient("sunset");
      setBackdropStyle("shadow");
      setTextCase("original");
    }
  };

  // Subtitle Manual Editing Operations
  const handleUpdateSubText = (id: string, text: string) => {
    setSubtitles((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  const handleUpdateSubSpeaker = (id: string, speaker: string) => {
    setSubtitles((prev) =>
      prev.map((s) => (s.id === id ? { ...s, speaker } : s)),
    );
  };

  // Re-name a speaker globally (changes all instances)
  const renameSpeakerGlobally = (originalName: string) => {
    const newName = prompt(
      `Rename all dialogue blocks by "${originalName}" to:`,
      originalName,
    );
    if (!newName || newName.trim() === "") return;
    setSubtitles((prev) =>
      prev.map((s) =>
        s.speaker === originalName ? { ...s, speaker: newName.trim() } : s,
      ),
    );
  };

  const handleUpdateSubTimes = (
    id: string,
    startTime: number,
    endTime: number,
  ) => {
    setSubtitles((prev) =>
      prev
        .map((s) => {
          if (s.id === id) {
            const validatedStart = Math.max(
              0,
              parseFloat(startTime.toFixed(2)),
            );
            const validatedEnd = Math.max(
              validatedStart + 0.1,
              parseFloat(endTime.toFixed(2)),
            );
            return { ...s, startTime: validatedStart, endTime: validatedEnd };
          }
          return s;
        })
        .sort((a, b) => a.startTime - b.startTime),
    );
  };

  const handleAddSubtitleBlock = () => {
    const newId = `sub_${Date.now()}`;
    const start = parseFloat(currentTime.toFixed(2));
    const end = parseFloat((currentTime + 2.5).toFixed(2));

    const newSub: Subtitle = {
      id: newId,
      startTime: start,
      endTime: end,
      text: "New styled subtitle segment",
      speaker: "Host",
    };

    setSubtitles((prev) =>
      [...prev, newSub].sort((a, b) => a.startTime - b.startTime),
    );
    setSelectedSubId(newId);
  };

  const handleDeleteSubtitleBlock = (id: string) => {
    setSubtitles((prev) => prev.filter((s) => s.id !== id));
    if (selectedSubId === id) setSelectedSubId(null);
  };

  // Split segment in half or at current playhead
  const handleSplitSegment = (sub: Subtitle) => {
    const midpoint = parseFloat(((sub.startTime + sub.endTime) / 2).toFixed(2));
    const words = sub.text.split(" ");
    const halfLen = Math.ceil(words.length / 2);
    const textA = words.slice(0, halfLen).join(" ");
    const textB = words.slice(halfLen).join(" ");

    const subA: Subtitle = {
      id: `${sub.id}_a`,
      startTime: sub.startTime,
      endTime: midpoint,
      text: textA || "Segment part A",
      speaker: sub.speaker,
    };

    const subB: Subtitle = {
      id: `${sub.id}_b`,
      startTime: midpoint,
      endTime: sub.endTime,
      text: textB || "Segment part B",
      speaker: sub.speaker,
    };

    setSubtitles((prev) =>
      prev
        .flatMap((s) => (s.id === sub.id ? [subA, subB] : s))
        .sort((a, b) => a.startTime - b.startTime),
    );
    setSelectedSubId(subA.id);
  };

  // Merge segment with subsequent one
  const handleMergeSegment = (sub: Subtitle) => {
    const subIndex = subtitles.findIndex((s) => s.id === sub.id);
    if (subIndex === -1 || subIndex === subtitles.length - 1) return;

    const nextSub = subtitles[subIndex + 1];
    const mergedSub: Subtitle = {
      id: sub.id,
      startTime: sub.startTime,
      endTime: nextSub.endTime,
      text: `${sub.text} ${nextSub.text}`,
      speaker: sub.speaker,
    };

    setSubtitles((prev) =>
      prev
        .filter((s) => s.id !== nextSub.id)
        .map((s) => (s.id === sub.id ? mergedSub : s)),
    );
  };

  // Drag-and-drop overlay mapping calculations
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (alignment !== "custom") {
      // Switch immediately to custom on drag
      setAlignment("custom");
    }
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !videoContainerRef.current) return;

    const bounding = videoContainerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - bounding.left;
    const relativeY = e.clientY - bounding.top;

    const percentX = Math.round(
      Math.max(5, Math.min((relativeX / bounding.width) * 100, 95)),
    );
    const percentY = Math.round(
      Math.max(5, Math.min((relativeY / bounding.height) * 100, 95)),
    );

    setCustomX(percentX);
    setCustomY(percentY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Export generators (SRT Format)
  const generateSRTContent = (): string => {
    let srtText = "";
    subtitles.forEach((sub, i) => {
      const formatTime = (timeInSecs: number): string => {
        const hours = Math.floor(timeInSecs / 3600);
        const minutes = Math.floor((timeInSecs % 3600) / 60);
        const secs = Math.floor(timeInSecs % 60);
        const ms = Math.floor((timeInSecs % 1) * 1000);

        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
      };

      srtText += `${i + 1}\n`;
      srtText += `${formatTime(sub.startTime)} --> ${formatTime(sub.endTime)}\n`;
      srtText += `[${sub.speaker}] ${sub.text}\n\n`;
    });
    return srtText;
  };

  // WebVTT Format
  const generateVTTContent = (): string => {
    let vttText = "WEBVTT\n\n";
    subtitles.forEach((sub, i) => {
      const formatTime = (timeInSecs: number): string => {
        const hours = Math.floor(timeInSecs / 3600);
        const minutes = Math.floor((timeInSecs % 3600) / 60);
        const secs = Math.floor(timeInSecs % 60);
        const ms = Math.floor((timeInSecs % 1) * 1000);

        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
      };

      vttText += `${sub.id || i + 1}\n`;
      vttText += `${formatTime(sub.startTime)} --> ${formatTime(sub.endTime)}\n`;
      vttText += `[${sub.speaker}] ${sub.text}\n\n`;
    });
    return vttText;
  };

  // Plain continuous text transcript
  const generateTXTContent = (): string => {
    let prevSpeaker = "";
    let txt = "";
    subtitles.forEach((sub) => {
      if (sub.speaker !== prevSpeaker) {
        txt += `\n${sub.speaker.toUpperCase()}:\n`;
        prevSpeaker = sub.speaker;
      }
      txt += `${sub.text} `;
    });
    return txt.trim();
  };

  // Download export action
  const handleDownloadFile = (type: "srt" | "vtt" | "txt" | "project") => {
    let content = "";
    let filename = "";

    if (type === "srt") {
      content = generateSRTContent();
      filename = "subtitles.srt";
    } else if (type === "vtt") {
      content = generateVTTContent();
      filename = "subtitles.vtt";
    } else if (type === "txt") {
      content = generateTXTContent();
      filename = "transcript.txt";
    } else if (type === "project") {
      content = JSON.stringify(
        {
          subtitles,
          styling: {
            fontFamily,
            fontSize,
            textColor,
            fontWeight,
            isItalic,
            backgroundColor,
            backgroundOpacity,
            glowIntensity,
            glowColor,
            alignment,
            customX,
            customY,
            animationPreset,
          },
        },
        null,
        2,
      );
      filename = "caption_project.json";
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtering search query
  const filteredSubtitles = subtitles.filter(
    (s) =>
      s.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.speaker.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Helper for applying text casing
  const formatTextCase = (txt: string): string => {
    if (textCase === "uppercase") return txt.toUpperCase();
    if (textCase === "lowercase") return txt.toLowerCase();
    if (textCase === "startcase") {
      return txt.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return txt;
  };

  // Helper for text gradient style
  const getTextGradientStyle = (): React.CSSProperties => {
    if (textGradient === "sunset") {
      return {
        backgroundImage: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
      };
    }
    if (textGradient === "neon") {
      return {
        backgroundImage: "linear-gradient(135deg, #06b6d4, #d946ef, #6366f1)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
      };
    }
    if (textGradient === "forest") {
      return {
        backgroundImage: "linear-gradient(135deg, #10b981, #84cc16, #3b82f6)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
      };
    }
    return {};
  };

  // Animated Word-by-Word Generator depending on playhead
  const renderAnimatedWords = (sub: Subtitle) => {
    const totalWords = sub.text.split(" ");
    const segmentDuration = sub.endTime - sub.startTime;
    const wordDuration = segmentDuration / Math.max(totalWords.length, 1);

    return totalWords.map((word, index) => {
      const wordStart = sub.startTime + index * wordDuration;
      const wordEnd = sub.startTime + (index + 1) * wordDuration;
      const isActive = currentTime >= wordStart && currentTime < wordEnd;
      const isPast = currentTime >= wordEnd;

      const formattedWord = formatTextCase(word);
      const gradientStyle = getTextGradientStyle();

      // Class mappings based on animationPreset
      if (animationPreset === "social") {
        // Dynamic TikTok center focus mode style
        if (isActive) {
          return (
            <span
              key={index}
              id={`word-${index}`}
              className="inline-block mx-1.5 text-yellow-400 font-extrabold scale-110 tracking-wide transition-all transform duration-150 relative"
              style={{
                textShadow: `0 0 10px ${glowColor}`,
                WebkitTextStroke: `${outlineWidth}px ${outlineColor}`,
              }}
            >
              {formattedWord}
            </span>
          );
        }
        return (
          <span
            key={index}
            className="inline-block mx-1 opacity-70 scale-95 transition-all duration-200"
            style={{
              WebkitTextStroke: `${outlineWidth}px ${outlineColor}`,
              ...gradientStyle,
            }}
          >
            {formattedWord}
          </span>
        );
      }

      if (animationPreset === "karaoke") {
        return (
          <span
            key={index}
            className={`inline-block mx-1 transition-colors duration-150 ${isActive || isPast ? "text-amber-400 font-bold scale-100" : "text-white opacity-60 scale-100"}`}
            style={!(isActive || isPast) ? gradientStyle : {}}
          >
            {formattedWord}
          </span>
        );
      }

      if (animationPreset === "bounce") {
        return (
          <span
            key={index}
            className={`inline-block mx-1 transform transition-all duration-150 ${isActive ? "animate-bounce text-pink-400 font-extrabold scale-110" : "opacity-90"}`}
            style={!isActive ? gradientStyle : {}}
          >
            {formattedWord}
          </span>
        );
      }

      if (animationPreset === "pop") {
        const isVisible = currentTime >= wordStart;
        return (
          <span
            key={index}
            className={`inline-block mx-1 transition-all duration-200 transform ${isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-50 translate-y-2"}`}
            style={gradientStyle}
          >
            {formattedWord}
          </span>
        );
      }

      if (animationPreset === "word") {
        // Literal single word display at a time
        if (isActive) {
          return (
            <span
              key={index}
              className="inline-block mx-1 px-4 py-1 text-white bg-blue-600 rounded-md scale-105 border border-blue-400 shadow-md"
            >
              {formattedWord}
            </span>
          );
        }
        return null;
      }

      // Default representation styled
      return (
        <span key={index} className="inline-block mx-1" style={gradientStyle}>
          {formattedWord}
        </span>
      );
    });
  };

  // Convert seconds to readable MM:SS
  const formatTimeMinutes = (time: number): string => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);
    return `${mins}:${String(secs).padStart(2, "0")}.${ms}`;
  };

  return (
    <div
      id="ai-app-container"
      className="min-h-screen bg-[#020617] text-[#f8fafc] font-sans flex flex-col selection:bg-blue-650 selection:text-white relative overflow-x-hidden"
    >
      {/* Top Bento Header Branding */}
      <header
        id="app-workspace-header"
        className="border-b border-slate-800/50 bg-[#070c1e]/60 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              ></path>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>CaptionFlow</span>
              <span className="text-slate-500 font-normal text-sm">
                / {uploadedFileName || "Startup_Pitch_V2.mp4"}
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              AI Subtitle Workspace & Custom Cap presets
            </p>
          </div>
        </div>

        {/* Rapid Sample Board */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/80 rounded-full text-[10px] font-semibold border border-slate-800 text-slate-350">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span>AI Model Linked</span>
          </div>
          {SAMPLE_PROJECTS.map((proj, idx) => (
            <button
              key={idx}
              id={`btn-sample-proj-${idx}`}
              onClick={() => handleSelectSample(proj)}
              className={`px-3 py-1 text-xs rounded-lg font-bold transition-all ${
                videoUrl === proj.videoUrl
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
              }`}
            >
              {proj.name.split(" ")[0]} Reel
            </button>
          ))}
        </div>
      </header>

      {/* Main Workbench Grid */}
      <main
        id="app-main-grid"
        className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto w-full overflow-hidden"
      >
        {/* LEFT COLUMN: Player Previewer & Bottom Timeline track (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Draggable Active Subtitle Overlay & Video Frame */}
          <div
            id="video-player-container"
            ref={videoContainerRef}
            className="relative rounded-2xl bg-black/80 border border-slate-800/80 shadow-2xl shadow-blue-950/10 overflow-hidden flex flex-col group justify-center aspect-video"
          >
            <video
              id="main-video-player"
              ref={videoRef}
              src={videoUrl}
              onClick={handlePlayPause}
              onError={handleVideoError}
              className="w-full h-full object-contain cursor-pointer aspect-video"
              playsInline
              preload="auto"
              crossOrigin="anonymous"
            />

            {/* Fallback audio element for virtual simulator mode */}
            {virtualVideoMode && (
              <audio
                ref={audioRef}
                src={videoUrl}
                preload="auto"
                className="hidden"
              />
            )}

            {virtualVideoMode && (
              <div className="absolute inset-0 bg-[#070c1e] flex flex-col items-center justify-center p-6 text-center select-none z-10 overflow-hidden">
                {/* Visualizer bars */}
                <div className="flex items-end justify-center gap-[4px] h-24 mb-6">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const baseHeights = [
                      18, 30, 45, 60, 80, 95, 75, 40, 20, 35, 65, 85, 90, 70,
                      50, 25, 45, 60, 40, 20, 50, 80, 55, 30,
                    ];
                    const baseH = baseHeights[i % baseHeights.length];
                    const finalH = isPlaying
                      ? `${Math.max(12, baseH + Math.sin(currentTime * 12 + i) * 20)}%`
                      : `${Math.max(8, baseH * 0.4)}%`;
                    return (
                      <div
                        key={i}
                        className="w-2.5 bg-gradient-to-t from-blue-600 via-indigo-500 to-sky-400 rounded-full transition-all duration-150"
                        style={{ height: finalH }}
                      />
                    );
                  })}
                </div>

                <div className="relative z-10 max-w-md px-4">
                  <h3
                    id="simulation-mode-title"
                    className="text-sm font-extrabold text-blue-400 tracking-wider uppercase mb-1 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse text-yellow-400" />
                    Interactive Simulator Mode
                  </h3>
                  <p className="text-[11px] text-slate-300 mb-4 leading-relaxed font-medium">
                    Native browser codecs were blocked or unavailable.
                    Seamlessly testing subtitle animations and rendering
                    overlays via our full state playhead simulation.
                  </p>
                  <button
                    id="btn-switch-native"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVirtualVideoMode(false);
                      setVideoError(null);
                      if (videoRef.current) {
                        videoRef.current.load();
                        videoRef.current.play().catch(() => {});
                      }
                    }}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 font-bold rounded-lg border border-slate-800 transition-all cursor-pointer"
                  >
                    Force Try Native Player
                  </button>
                </div>

                {/* Aesthetic decorative rings */}
                <div className="absolute w-[600px] h-[600px] border border-blue-500/5 rounded-full pointer-events-none" />
                <div className="absolute w-[400px] h-[400px] border border-indigo-500/5 rounded-full pointer-events-none" />
              </div>
            )}

            {/* LIVE DYNAMIC DRAGGABLE CAPTIONS OVERLAY */}
            {isSubtitlesVisible && activeSub && (
              <div
                id="draggable-subtitle-overlay"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={`absolute select-none z-35 transition-transform ${isDragging ? "scale-105 cursor-grabbing" : "cursor-grab hover:ring-2 hover:ring-blue-500/50 rounded-lg p-1.5"}`}
                style={{
                  left: alignment === "custom" ? `${customX}%` : "50%",
                  top:
                    alignment === "custom"
                      ? `${customY}%`
                      : alignment === "top"
                        ? "12%"
                        : "85%",
                  transform: `translate(-50%, -50%) rotate(${rotationAngle}deg)`,
                }}
              >
                <div
                  id="rendered-subtitle-payload"
                  className="px-4 py-2.5 rounded-lg text-center select-none"
                  style={{
                    fontFamily:
                      fontFamily === "Space Grotesk"
                        ? '"Space Grotesk", sans-serif'
                        : fontFamily === "Playfair Display"
                          ? '"Playfair Display", serif'
                          : fontFamily === "Fira Code"
                            ? '"Fira Code", monospace'
                            : "sans-serif",
                    fontSize: `${fontSize}px`,
                    fontWeight: fontWeight,
                    fontStyle: isItalic ? "italic" : "normal",
                    letterSpacing:
                      letterSpacing === "wide"
                        ? "0.1em"
                        : letterSpacing === "wider"
                          ? "0.18em"
                          : "normal",

                    // Backdrop styling
                    backgroundColor:
                      backdropStyle === "none"
                        ? "transparent"
                        : hexToRgba(backgroundColor, backgroundOpacity),
                    backdropFilter:
                      backdropStyle === "frosted" ? "blur(12px)" : undefined,
                    WebkitBackdropFilter:
                      backdropStyle === "frosted" ? "blur(12px)" : undefined,
                    border:
                      backdropStyle === "frosted"
                        ? "1px solid rgba(255, 255, 255, 0.12)"
                        : undefined,

                    // Text fill & Gradients
                    ...(textGradient !== "none"
                      ? getTextGradientStyle()
                      : {
                          color: textColor,
                          WebkitTextFillColor: textColor,
                        }),

                    textShadow: `${outlineWidth}px ${outlineWidth}px ${outlineWidth}px ${outlineColor}, 0 0 ${glowIntensity * 4}px ${glowIntensity > 0 ? glowColor : "transparent"}`,
                    opacity: textBrightness(backgroundColor, backgroundOpacity),
                  }}
                >
                  {/* Switch between Animation Preset and standard whole-sentence formatting */}
                  {["social", "karaoke", "bounce", "pop", "word"].includes(
                    animationPreset,
                  ) ? (
                    <div className="flex flex-wrap items-center justify-center">
                      {renderAnimatedWords(activeSub)}
                    </div>
                  ) : (
                    <div
                      className={`
                        ${animationPreset === "zoom" ? "animate-[scale-up_0.25s_ease-out]" : ""} 
                        ${animationPreset === "fade" ? "animate-[fade-in_0.3s_ease-out]" : ""}
                      `}
                    >
                      {animationPreset === "speaker" && (
                        <span className="text-xs font-bold uppercase tracking-wider block text-yellow-300 mb-1 font-mono">
                          {activeSub.speaker}
                        </span>
                      )}
                      {formatTextCase(activeSub.text)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Position coordinate indicator on drag */}
            {isDragging && (
              <div className="absolute top-4 left-4 z-40 bg-slate-900/90 text-[10px] px-2 py-1.5 rounded-lg border border-slate-800 text-slate-300 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-blue-400" />
                <span>
                  Coordinates: X:{customX}% Y:{customY}%
                </span>
              </div>
            )}

            {/* Bottom floating playback status bar overlay on hover */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2.5 z-20">
              {/* Slider Seek playhead timeline */}
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.05"
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full select-none h-1.5 rounded bg-slate-800 accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Deck control center */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    id="btn-overlay-play-pause"
                    onClick={handlePlayPause}
                    className="p-2 bg-blue-600 rounded-xl hover:bg-blue-500 hover:scale-105 active:scale-95 text-white transition-all shadow shadow-blue-500/20"
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-white" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-white" />
                    )}
                  </button>

                  <div className="text-xs font-mono text-slate-300 flex items-center">
                    <span>{formatTimeMinutes(currentTime)}</span>
                    <span className="mx-1 text-slate-600">/</span>
                    <span className="text-slate-400">
                      {formatTimeMinutes(duration)}
                    </span>
                  </div>

                  {/* Volume Tracker */}
                  <div className="flex items-center gap-1.5 bg-slate-900/60 rounded-xl px-2 py-1 text-slate-300">
                    <Volume2 className="w-3 h-3 text-slate-400" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-12 h-1 bg-slate-800 accent-slate-300 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Speed toggle */}
                  <select
                    id="select-speed"
                    value={playbackSpeed}
                    onChange={(e) =>
                      setPlaybackSpeed(parseFloat(e.target.value))
                    }
                    className="bg-slate-900 border border-slate-800 text-[11px] px-2 py-1 rounded-lg text-slate-300 outline-none"
                  >
                    <option value="0.5">0.5x Speed</option>
                    <option value="0.75">0.75x Speed</option>
                    <option value="1.0">Normal (1.0x)</option>
                    <option value="1.25">1.25x Speed</option>
                    <option value="1.5">1.5x Speed</option>
                    <option value="2.0">2.0x Speed</option>
                  </select>

                  {/* visibility toggle */}
                  <button
                    id="btn-subtitle-visibility"
                    onClick={() => setIsSubtitlesVisible(!isSubtitlesVisible)}
                    className={`p-1.5 rounded-lg border transition-all text-xs ${isSubtitlesVisible ? "bg-indigo-600/20 text-indigo-300 border-indigo-700/60" : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"}`}
                    title="Toggle captions overlay visibility"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* VISUAL TIMELINE NUDGE TRACK (BOTTOM WORKBENCH) */}
          <div
            id="visual-timeline-track"
            className="bg-[#0f172a]/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 shadow-lg"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60 pb-2">
              <span className="font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Dynamic
                Timelines Waveform
              </span>
              <span className="text-slate-500 font-mono text-[10px]">
                Double click a card to jump
              </span>
            </div>

            {/* Clickable horizontal timelines list */}
            <div
              ref={timelineRef}
              onClick={handleTimelineClick}
              className="relative h-14 bg-slate-950/80 rounded-xl overflow-hidden cursor-crosshair border border-slate-900"
            >
              {/* Dynamic Waveform Background Grid */}
              <div className="absolute inset-x-0 bottom-0 top-1 flex items-end justify-between px-3 pb-1 gap-[2px] opacity-25 pointer-events-none z-1">
                {Array.from({ length: 58 }).map((_, i) => {
                  const heights = [
                    20, 35, 40, 10, 60, 80, 50, 70, 90, 60, 40, 30, 50, 60, 80,
                    70, 40, 20, 10, 40, 60, 30, 50, 70, 80, 50, 30, 40, 70, 90,
                    60, 40, 20, 50, 80, 70, 60, 40, 10, 30, 60, 90, 70, 50, 30,
                    40, 10, 50, 60, 80, 55, 35, 15, 25, 45, 65, 85, 45,
                  ];
                  const baseHeight = heights[i % heights.length];
                  const finalHeight = isPlaying
                    ? `${Math.max(4, baseHeight + Math.sin(currentTime * 8 + i) * 12)}%`
                    : `${baseHeight}%`;
                  return (
                    <div
                      key={i}
                      className="w-[2.5px] bg-[#475569] rounded-sm transition-all duration-300"
                      style={{ height: finalHeight }}
                    />
                  );
                })}
              </div>

              {/* Playhead Indicator bar */}
              <div
                className="absolute top-0 bottom-0 w-px bg-blue-500 z-10 pointer-events-none"
                style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
              >
                <div className="absolute -top-0.5 -left-1 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              </div>

              {/* Subtitle segments block pills */}
              {subtitles.map((sub) => {
                const startPercent = (sub.startTime / (duration || 1)) * 100;
                const endPercent = (sub.endTime / (duration || 1)) * 100;
                const blockWidth = endPercent - startPercent;
                const isSelected = selectedSubId === sub.id;

                return (
                  <div
                    key={sub.id}
                    title={`[${sub.speaker}]: ${sub.text}`}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleSeek(sub.startTime);
                      setSelectedSubId(sub.id);
                    }}
                    className={`absolute top-2 bottom-2 rounded text-[9px] px-2 flex items-center overflow-hidden border transition-all cursor-pointer select-none z-5 ${
                      isSelected
                        ? "bg-blue-600/30 text-blue-200 border-blue-500 font-bold shadow-lg shadow-blue-500/10"
                        : "bg-slate-800/60 text-slate-300 border-slate-700/50 hover:bg-slate-700"
                    }`}
                    style={{
                      left: `${startPercent}%`,
                      width: `${Math.max(blockWidth, 1.5)}%`,
                    }}
                  >
                    <span className="truncate">{sub.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Quick Timeline nudge counters & add button */}
            <div className="flex items-center justify-between gap-4 mt-1">
              <div className="flex items-center gap-2">
                <button
                  id="btn-timeline-add-sub"
                  onClick={handleAddSubtitleBlock}
                  className="bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 border border-blue-900/50 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add Subtitle Card
                </button>

                {selectedSubId && (
                  <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800/80 rounded-xl">
                    <button
                      onClick={() => {
                        const sub = subtitles.find(
                          (s) => s.id === selectedSubId,
                        );
                        if (sub)
                          handleUpdateSubTimes(
                            sub.id,
                            sub.startTime - 0.1,
                            sub.endTime - 0.1,
                          );
                      }}
                      className="px-2 py-1 text-[10px] bg-slate-800 rounded-lg hover:bg-slate-755 text-slate-300"
                      title="Nudge selection back by 0.1 seconds"
                    >
                      -0.1s Shift
                    </button>
                    <span className="text-[10px] px-1 text-slate-400 font-mono">
                      Shift Selected Bounds
                    </span>
                    <button
                      onClick={() => {
                        const sub = subtitles.find(
                          (s) => s.id === selectedSubId,
                        );
                        if (sub)
                          handleUpdateSubTimes(
                            sub.id,
                            sub.startTime + 0.1,
                            sub.endTime + 0.1,
                          );
                      }}
                      className="px-2 py-1 text-[10px] bg-slate-800 rounded-lg hover:bg-slate-755 text-slate-300"
                      title="Nudge selection forward by 0.1 seconds"
                    >
                      +0.1s Shift
                    </button>
                  </div>
                )}
              </div>

              {/* Status bar for preloaded/uploaded file */}
              <div className="text-[11px] text-slate-500 font-medium">
                {uploadedFileName
                  ? `Project: ${uploadedFileName}`
                  : "Demo Project Pre-loaded"}
              </div>
            </div>
          </div>

          {/* Quick Package Exports Board */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0c1222]/80 to-[#030712]/90 backdrop-blur-md border border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600/15 text-blue-400 rounded-lg">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">
                  Publish & Export Center
                </h3>
                <p className="text-[10px] text-slate-400">
                  Produce universally-synced caption documents
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                id="export-srt"
                onClick={() => handleDownloadFile("srt")}
                className="bg-slate-900/80 border border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                SRT Captions
              </button>
              <button
                id="export-vtt"
                onClick={() => handleDownloadFile("vtt")}
                className="bg-slate-900/80 border border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <FileText className="w-3.5 h-3.5 text-pink-400" />
                VTT Web Player
              </button>
              <button
                id="export-txt"
                onClick={() => handleDownloadFile("txt")}
                className="bg-slate-900/80 border border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <FileText className="w-3.5 h-3.5 text-green-400" />
                TXT Transcript
              </button>
              <button
                id="export-project"
                onClick={() => handleDownloadFile("project")}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow shadow-blue-500/15 cursor-pointer"
              >
                <FolderSync className="w-3.5 h-3.5" />
                <span>Save Studio Project</span>
              </button>
              <button
                id="export-burned-video"
                onClick={handleStartBurnVideo}
                className="bg-indigo-650 hover:bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow shadow-indigo-500/15 cursor-pointer"
              >
                <Film className="w-3.5 h-3.5 text-indigo-200" />
                <span>Burn & Export Video</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Tool Configuration & Manuscript drawers (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col bg-[#0f172a]/40 backdrop-blur-md rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
          {/* Drawer tab selections */}
          <div className="grid grid-cols-4 border-b border-slate-800/60 bg-[#0c1322]/80">
            <button
              id="tab-style"
              onClick={() => setActiveTab("style")}
              className={`py-3.5 text-xs font-bold transition-all border-b-2 flex flex-col items-center gap-1 ${activeTab === "style" ? "border-blue-500 text-blue-400 bg-[#1e293b]/40" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20"}`}
            >
              <FontIcon className="w-4 h-4" />
              <span>Aesthetic</span>
            </button>
            <button
              id="tab-editor"
              onClick={() => setActiveTab("editor")}
              className={`py-3.5 text-xs font-bold transition-all border-b-2 flex flex-col items-center gap-1 ${activeTab === "editor" ? "border-blue-500 text-blue-400 bg-[#1e293b]/40" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20"}`}
            >
              <Sliders className="w-4 h-4" />
              <span>Edit Timeline</span>
            </button>
            <button
              id="tab-ai"
              onClick={() => setActiveTab("ai")}
              className={`py-3.5 text-xs font-bold transition-all border-b-2 flex flex-col items-center gap-1 ${activeTab === "ai" ? "border-blue-500 text-blue-400 bg-[#1e293b]/40" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20"}`}
            >
              <Upload className="w-4 h-4" />
              <span>AI Transcription</span>
            </button>
            <button
              id="tab-smart"
              onClick={() => setActiveTab("smart")}
              className={`py-3.5 text-xs font-bold transition-all border-b-2 flex flex-col items-center gap-1 ${activeTab === "smart" ? "border-blue-500 text-blue-400 bg-[#1e293b]/40" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20"}`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Smart AI Tools</span>
            </button>
          </div>

          {/* Drawer content frame wrapper */}
          <div className="flex-1 p-5 overflow-y-auto max-h-[640px] mini-scroll">
            {/* TAB 1: AI TRANSCRIPTION OVER PANEL */}
            {activeTab === "ai" && (
              <div className="flex flex-col gap-5">
                <div className="bg-gradient-to-r from-blue-950/20 to-indigo-950/10 border border-blue-900/40 p-4 rounded-xl">
                  <h3 className="text-sm font-bold text-blue-300 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Automatic Speech-to-Text
                    Transcription
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Upload a video or audio file. Our smart local encoder
                    extracts audio tracks as tiny wave buffers, before querying
                    Gemini to generate non-overlapping captions automatically.
                  </p>
                </div>

                {/* File Drop Drag Box */}
                <div className="border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/80 rounded-xl p-6 text-center transition-all flex flex-col gap-4">
                  <div>
                    <Upload className="w-8 h-8 text-slate-450 mx-auto mb-2" />
                    <label
                      htmlFor="video_file_input"
                      className="cursor-pointer"
                    >
                      <span className="text-sm font-bold block text-slate-250 hover:text-blue-400">
                        Choose video / audio file
                      </span>
                      <span className="text-xs text-slate-500 block mt-1">
                        Support MP4, WEBM, MKV, MP3, WAV (processed fully)
                      </span>
                      <input
                        id="video_file_input"
                        type="file"
                        accept="video/*,audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-center gap-2 border-t border-slate-900/60 pt-3">
                    <button
                      id="btn-record-camera"
                      onClick={handleStartCamera}
                      className="px-3.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-900/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-blue-400" />
                      <span>Record from Camera</span>
                    </button>
                  </div>

                  {uploadedFileName && (
                    <div className="mt-1 p-2 bg-slate-900/80 rounded-lg text-xs text-slate-300 border border-slate-800 truncate">
                      File: {uploadedFileName}
                    </div>
                  )}
                </div>

                {uploadStatus && (
                  <div className="p-3 bg-indigo-950/15 border border-indigo-900/50 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>{uploadStatus}</span>
                  </div>
                )}

                {(lastAIProvider || aiTranscriptionError) && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="text-slate-400 font-bold uppercase tracking-wide">
                        AI Diagnostics
                      </span>
                      {lastAIProvider && (
                        <span className="px-2 py-0.5 rounded-full border border-blue-900/50 bg-blue-950/30 text-blue-300 font-semibold">
                          Provider: {lastAIProvider}
                        </span>
                      )}
                    </div>

                    {lastAIProvider && (
                      <div className="text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">
                          Fallback:
                        </span>{" "}
                        {lastAIFallbackUsed
                          ? "Gemini exhausted, switched to OpenAI."
                          : "Not used in last successful run."}
                      </div>
                    )}

                    {aiTranscriptionError && (
                      <div className="p-2.5 rounded-lg border border-red-900/50 bg-red-950/20 text-[11px] text-red-200 flex flex-col gap-1">
                        <span className="font-semibold">
                          Last error: {aiTranscriptionError.message}
                        </span>
                        <span className="text-red-300/90">
                          Time: {aiTranscriptionError.at}
                        </span>
                        {typeof aiTranscriptionError.status === "number" && (
                          <span className="text-red-300/90">
                            HTTP Status: {aiTranscriptionError.status}
                          </span>
                        )}
                        {aiTranscriptionError.provider && (
                          <span className="text-red-300/90">
                            Provider: {aiTranscriptionError.provider}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Settings list configuration */}
                <div className="flex flex-col gap-3 bg-slate-950 border border-slate-900 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">
                    Transcripter Configuration
                  </h4>

                  {/* Lang selection */}
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-xs font-bold text-slate-350">
                      Speech Language:
                    </label>
                    <select
                      id="select-tx-lang"
                      value={txLang}
                      onChange={(e) => setTxLang(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 outline-none"
                    >
                      <option value="English (US)">English (US)</option>
                      <option value="English (UK)">English (UK)</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Hindi">Hindi / हिन्दी</option>
                      <option value="Kannada">Kannada / ಕನ್ನಡ</option>
                      <option value="Portuguese">Portuguese</option>
                      <option value="Japanese">Japanese</option>
                    </select>
                  </div>
                  <div className="text-[10px] text-slate-500 -mt-1">
                    Target subtitle language only. This does not dub or replace
                    the original video audio track.
                  </div>

                  {/* Filler words removal switch */}
                  <div className="flex items-center justify-between gap-4 mt-1">
                    <div>
                      <label className="text-xs font-bold text-slate-350 block">
                        Filter Out Speech Clutter
                      </label>
                      <span className="text-[10px] text-slate-500">
                        Mute fill words (um, uh, hmm) automatically
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={txFillerWords}
                      onChange={(e) => setTxFillerWords(e.target.checked)}
                      className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Smart punctuation */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-350 block">
                        Punctuate Subtitles
                      </label>
                      <span className="text-[10px] text-slate-500">
                        Incorporate commas, colons and full stops
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={txSmartPunc}
                      onChange={(e) => setTxSmartPunc(e.target.checked)}
                      className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Speaker detector */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-350 block">
                        Speaker Identity Tracking
                      </label>
                      <span className="text-[10px] text-slate-500">
                        Detect multi-speaker dialogue boundaries
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={txSpeakerDet}
                      onChange={(e) => setTxSpeakerDet(e.target.checked)}
                      className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Submit action */}
                <button
                  id="btn-ai-transcribe"
                  onClick={handleAIStartTranscription}
                  disabled={txLoading}
                  className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${txLoading ? "bg-indigo-900 border border-indigo-800 text-indigo-300 font-medium cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white font-bold hover:scale-[1.01] active:scale-95 shadow-blue-500/20"}`}
                >
                  <Activity
                    className={`w-4 h-4 ${txLoading ? "animate-spin text-indigo-400" : "text-blue-100"}`}
                  />
                  <span>
                    {txLoading
                      ? "Processing Audio Timeline..."
                      : "Trigger AI Transcription"}
                  </span>
                </button>

                {txLoading && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-center items-center text-center gap-3 animate-pulse">
                    <LoaderRing />
                    <span className="text-xs text-blue-300 font-semibold">
                      {txStep}
                    </span>
                    <span className="text-[10px] text-slate-500 leading-relaxed">
                      Please sit tight. High-resolution transcription utilizes
                      offline sample audio extraction, causing fast speeds
                      without file transfer limits.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: VISUAL STYLING ENGINE */}
            {activeTab === "style" && (
              <div className="flex flex-col gap-6">
                {/* 1. Quick Presets Card */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">
                    Instant Visual Presets
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      id="preset-tiktok"
                      onClick={() => applyStylePreset("tiktok")}
                      className="p-3 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 transition-all text-left rounded-xl border border-slate-800 flex flex-col gap-1 text-slate-200"
                    >
                      <span className="text-xs font-extrabold text-yellow-400 tracking-wide uppercase">
                        TikTok Creator
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Heavy strokes, yellow neon spacing, pop text
                      </span>
                    </button>
                    <button
                      id="preset-cinema"
                      onClick={() => applyStylePreset("cinema")}
                      className="p-3 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 transition-all text-left rounded-xl border border-slate-800 flex flex-col gap-1 text-slate-200"
                    >
                      <span className="text-xs font-serif text-white italic">
                        Cinema Classic
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Playfair font, soft black bounding card, minimal style
                      </span>
                    </button>
                    <button
                      id="preset-cyberpunk"
                      onClick={() => applyStylePreset("cyberpunk")}
                      className="p-3 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 transition-all text-left rounded-xl border border-slate-800 flex flex-col gap-1 text-slate-200"
                    >
                      <span className="text-xs font-mono font-bold text-pink-400">
                        Cyber Rebel
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Bright outline, glowing borders, code formatting
                      </span>
                    </button>
                    <button
                      id="preset-karaoke"
                      onClick={() => applyStylePreset("karaoke")}
                      className="p-3 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 transition-all text-left rounded-xl border border-slate-800 flex flex-col gap-1 text-slate-200"
                    >
                      <span className="text-xs font-sans font-bold text-blue-300">
                        Karaoke Stage
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Continuous sentence highlighting words
                      </span>
                    </button>
                  </div>
                </div>
                {/* 2. Text Style Parameters */}
                <div className="bg-[#0c1222]/50 border border-slate-800/60 p-4.5 rounded-2xl flex flex-col gap-4 shadow-md backdrop-blur-sm">
                  <h4 className="text-xs font-bold text-slate-350 tracking-wider uppercase flex items-center gap-1.5">
                    <FontIcon className="w-3.5 h-3.5 text-blue-400" />{" "}
                    Typography Settings
                  </h4>

                  {/* Font Family selector */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-300 font-semibold">
                      Font Family:
                    </span>
                    <select
                      id="select-font-family"
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 outline-none w-44 focus:border-blue-500/80"
                    >
                      <option value="Space Grotesk">
                        Space Grotesk (Modern)
                      </option>
                      <option value="Playfair Display">
                        Playfair Display (Serif)
                      </option>
                      <option value="Fira Code">Fira Code (Code/Mono)</option>
                      <option value="Inter">Inter (Sans-serif)</option>
                      <option value="Outfit">Outfit (Geometric Sans)</option>
                      <option value="Pacifico">Pacifico (Neon Script)</option>
                      <option value="Cinzel">Cinzel (Roman Serif)</option>
                      <option value="DM Mono">DM Mono (Typewriter)</option>
                    </select>
                  </div>

                  {/* Font Size range slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-semibold">
                        Font Size:
                      </span>
                      <span className="font-mono text-blue-400 font-medium">
                        {fontSize}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="14"
                      max="48"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 accent-blue-500 cursor-pointer"
                    />
                  </div>

                  {/* Letter spacing */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-300 font-semibold">
                      Letter Spacing:
                    </span>
                    <select
                      value={letterSpacing}
                      onChange={(e) => setLetterSpacing(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2 py-1 text-slate-200 outline-none focus:border-blue-500/80"
                    >
                      <option value="normal">Normal</option>
                      <option value="wide">Wide (0.1em)</option>
                      <option value="wider">Wider (0.18em)</option>
                    </select>
                  </div>

                  {/* Font Weight and Italic toggle row */}
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <span className="text-xs text-slate-300 font-semibold">
                      Styles:
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setFontWeight(
                            fontWeight === "bold" ? "normal" : "bold",
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${fontWeight === "bold" ? "bg-blue-600/20 text-blue-350 border-blue-500/50" : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"}`}
                      >
                        Bold
                      </button>
                      <button
                        onClick={() => setIsItalic(!isItalic)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold italic transition-all border ${isItalic ? "bg-blue-600/20 text-blue-350 border-blue-500/50" : "bg-slate-955 border-slate-800 text-slate-400 hover:bg-slate-900"}`}
                      >
                        Italic
                      </button>
                    </div>
                  </div>

                  {/* Text Case Selector */}
                  <div className="flex items-center justify-between gap-4 border-t border-slate-800/40 pt-3">
                    <span className="text-xs text-slate-300 font-semibold">
                      Text Case:
                    </span>
                    <select
                      value={textCase}
                      onChange={(e) => setTextCase(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 outline-none w-44 focus:border-blue-500/80"
                    >
                      <option value="original">As Spoken / Original</option>
                      <option value="uppercase">ALL UPPERCASE</option>
                      <option value="lowercase">all lowercase</option>
                      <option value="startcase">Start Case Words</option>
                    </select>
                  </div>

                  {/* Text Gradient Fill */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-300 font-semibold">
                      Text Gradient:
                    </span>
                    <select
                      value={textGradient}
                      onChange={(e) => setTextGradient(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 outline-none w-44 focus:border-blue-500/80"
                    >
                      <option value="none">Solid Color Fill</option>
                      <option value="sunset">Sunset Glow (Orange-Pink)</option>
                      <option value="neon">Neon Dream (Cyan-Purple)</option>
                      <option value="forest">Forest Lime (Green-Blue)</option>
                    </select>
                  </div>

                  {/* Rotation Slant Angle Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-semibold">
                        Slant / Rotation Angle:
                      </span>
                      <span className="font-mono text-indigo-400 font-medium">
                        {rotationAngle}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-15"
                      max="15"
                      value={rotationAngle}
                      onChange={(e) =>
                        setRotationAngle(parseInt(e.target.value))
                      }
                      className="w-full h-1 bg-slate-800 accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Font Color & Opacity Picker */}
                  <div className="flex items-center justify-between gap-4 border-t border-slate-800/40 pt-3">
                    <span className="text-xs text-slate-305 font-semibold">
                      Font Color:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-8 h-8 rounded border border-slate-805 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={textColor.toUpperCase()}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-800 text-xs p-1.5 rounded text-center text-slate-300 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Background block & Effects Properties */}
                <div className="bg-[#0c1222]/50 border border-slate-800/60 p-4.5 rounded-2xl flex flex-col gap-4 shadow-md backdrop-blur-sm">
                  <h4 className="text-xs font-bold text-slate-350 tracking-wider uppercase flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" /> Background
                    & Outline Effects
                  </h4>

                  {/* Background Fill Color & Opacity slider */}
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-slate-300 font-semibold">
                      Card Fill:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-8 h-8 rounded border border-slate-800 cursor-pointer bg-transparent"
                      />
                      <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg">
                        <span className="text-[10px] text-slate-500 pl-1 font-mono">
                          Opacity:
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={backgroundOpacity}
                          onChange={(e) =>
                            setBackgroundOpacity(parseFloat(e.target.value))
                          }
                          className="w-16 h-1 bg-slate-800 accent-slate-350 cursor-pointer"
                        />
                        <span className="text-[9px] text-slate-305 font-mono min-w-[25px] text-right">
                          {Math.round(backgroundOpacity * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Backdrop Card Style selector */}
                  <div className="flex justify-between items-center gap-4 border-t border-slate-800/40 pt-3">
                    <span className="text-xs text-slate-300 font-semibold">
                      Backdrop Style:
                    </span>
                    <select
                      value={backdropStyle}
                      onChange={(e) =>
                        setBackdropStyle(
                          e.target.value as "none" | "shadow" | "frosted",
                        )
                      }
                      className="bg-[#0c1222]/90 border border-slate-800/80 text-xs p-2 rounded-lg text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-all duration-150 hover:border-slate-700 hover:text-white"
                    >
                      <option value="shadow">Solid Card Fill</option>
                      <option value="frosted">Frosted Glass</option>
                      <option value="none">Transparent / None</option>
                    </select>
                  </div>

                  {/* Text Outline Stroke parameters */}
                  <div className="flex flex-col gap-1.5 border-t border-slate-800/40 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-300 font-semibold">
                        Text Outline Width:
                      </span>
                      <span className="text-xs font-mono text-slate-450">
                        {outlineWidth}px
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="6"
                        step="1"
                        value={outlineWidth}
                        onChange={(e) =>
                          setOutlineWidth(parseInt(e.target.value))
                        }
                        className="flex-1 h-1 bg-slate-800 accent-blue-500 cursor-pointer"
                      />
                      <input
                        type="color"
                        value={outlineColor}
                        onChange={(e) => setOutlineColor(e.target.value)}
                        className="w-6 h-6 rounded border border-slate-808 cursor-pointer bg-transparent"
                        title="Outline color picker"
                      />
                    </div>
                  </div>

                  {/* Glowing intensities */}
                  <div className="flex flex-col gap-1.5 border-t border-slate-800/40 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-300 font-semibold">
                        Active Outer Glow:
                      </span>
                      <span className="text-xs font-mono text-indigo-400 font-bold">
                        {glowIntensity * 10}% Intensity
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="8"
                        step="1"
                        value={glowIntensity}
                        onChange={(e) =>
                          setGlowIntensity(parseInt(e.target.value))
                        }
                        className="flex-1 h-1 bg-slate-800 accent-indigo-500 cursor-pointer"
                      />
                      <input
                        type="color"
                        value={glowColor}
                        onChange={(e) => setGlowColor(e.target.value)}
                        className="w-6 h-6 rounded border border-slate-808 cursor-pointer bg-transparent"
                        title="Glow aura color picker"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Active Animation style configurations */}
                <div className="bg-[#0c1222]/50 border border-slate-800/60 p-4.5 rounded-2xl flex flex-col gap-4 shadow-md backdrop-blur-sm">
                  <h4 className="text-xs font-bold text-slate-350 tracking-wider uppercase flex items-center gap-1.5 font-sans">
                    <Activity className="w-3.5 h-3.5 text-blue-400" /> Animated
                    Cap Preset Style
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        key: "social",
                        label: "TikTok Dynamic",
                        desc: "Syllable highlighted focus",
                      },
                      {
                        key: "karaoke",
                        label: "Karaoke Pro",
                        desc: "Progressive yellow highlight",
                      },
                      {
                        key: "bounce",
                        label: "Bouncing Active",
                        desc: "Speech bounce animation",
                      },
                      {
                        key: "pop",
                        label: "Pop sequentially",
                        desc: "Words pop in linearly",
                      },
                      {
                        key: "word",
                        label: "Pure Word-by-Word",
                        desc: "Single active word block",
                      },
                      {
                        key: "speaker",
                        label: "Speaker Highlight",
                        desc: "Coloured metadata labels",
                      },
                      {
                        key: "zoom",
                        label: "Smooth Zoom",
                        desc: "Scale entire block cards",
                      },
                      {
                        key: "fade",
                        label: "Smooth Fade",
                        desc: "Transition elements smoothly",
                      },
                    ].map((anim) => (
                      <button
                        key={anim.key}
                        id={`btn-anim-preset-${anim.key}`}
                        onClick={() => setAnimationPreset(anim.key as any)}
                        className={`p-2 rounded-lg border text-left transition-all ${animationPreset === anim.key ? "bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold" : "bg-slate-900 border-slate-850 hover:bg-slate-800 text-slate-350"}`}
                      >
                        <div className="text-xs font-bold">{anim.label}</div>
                        <div className="text-[9px] text-slate-500 line-clamp-1">
                          {anim.desc}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Drag drop alert notification info */}
                  <div className="p-3 bg-blue-950/15 border border-blue-900/40 rounded-xl text-[10px] text-blue-300 flex items-start gap-2 leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Interactive Placement Active:</strong> Drag
                      coordinates are set to Bottom by default. You can click
                      and drag the caption directly over the preview player
                      screen to register custom positions!
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TIMELINE MANUSCRIPT EDITOR */}
            {activeTab === "editor" && (
              <div className="flex flex-col gap-4">
                {/* Search query box */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      id="search-captions"
                      type="text"
                      placeholder="Search subtitle manuscript phrases..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs px-3 py-2 pl-8 rounded-xl text-slate-200 outline-none focus:border-blue-500"
                    />
                    <Sparkles className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  <button
                    onClick={handleAddSubtitleBlock}
                    className="p-2 bg-blue-600 text-white hover:bg-blue-500 duration-150 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
                    title="Insert new blank block"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Subtitle manuscript cards lists */}
                <div
                  ref={subtitleListRef}
                  className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1"
                >
                  {filteredSubtitles.length > 0 ? (
                    filteredSubtitles.map((sub, idx) => {
                      const isSelected = selectedSubId === sub.id;
                      const isActive = activeSub?.id === sub.id;

                      return (
                        <div
                          key={sub.id}
                          id={`editor-card-${sub.id}`}
                          onClick={() => {
                            if (selectedSubId !== sub.id) {
                              setSelectedSubId(sub.id);
                              handleSeek(sub.startTime);
                            }
                          }}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col gap-3 group relative cursor-pointer ${
                            isSelected
                              ? "bg-slate-900 border-blue-500 shadow-md shadow-blue-500/5"
                              : isActive
                                ? "bg-indigo-950/20 border-indigo-900/60"
                                : "bg-slate-900/40 border-slate-850 hover:bg-slate-900 hover:border-slate-800"
                          }`}
                        >
                          {/* Top metadata tags */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {/* Index */}
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-850 text-slate-450">
                                #{idx + 1}
                              </span>

                              {/* Speaker renaming button badge */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  renameSpeakerGlobally(sub.speaker);
                                }}
                                className="text-[10px] bg-indigo-900/30 text-indigo-300 font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-950/50 hover:bg-indigo-800/40"
                                title="Click to rename this speaker globally across all segments"
                              >
                                <User className="w-2.5 h-2.5" />
                                <span>{sub.speaker || "No Speaker"}</span>
                              </button>
                            </div>

                            {/* Timing indicators */}
                            <div className="flex items-center gap-2 select-none font-mono text-[10px]">
                              {/* Play segment button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlaySegment(sub);
                                }}
                                className="p-1 text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border border-emerald-900/60 rounded transition-all flex items-center gap-1 cursor-pointer"
                                title="Play this specific segment only"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>Play</span>
                              </button>

                              {/* Clickable Seek button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSeek(sub.startTime);
                                  setSelectedSubId(sub.id);
                                }}
                                className="text-blue-400 hover:underline hover:text-blue-300 flex items-center gap-1"
                                title="Snap playback to subtitle start"
                              >
                                {sub.startTime}s - {sub.endTime}s
                              </button>
                            </div>
                          </div>

                           {/* Editable Main Subtitle Textarea box */}
                          <textarea
                            value={sub.text}
                            onChange={(e) =>
                              handleUpdateSubText(sub.id, e.target.value)
                            }
                            onFocus={() => {
                              setSelectedSubId(sub.id);
                              handleSeek(sub.startTime);
                            }}
                            rows={1}
                            className="w-full bg-slate-950 border border-slate-900 hover:border-slate-800 text-xs px-2.5 py-1.5 rounded-lg text-slate-100 outline-none focus:border-blue-500 resize-none"
                            placeholder="Enter captions line dialogue..."
                          />

                          {/* Editable times block fields */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-900">
                            <div className="flex items-center gap-2">
                              {/* Start Time input */}
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-slate-500 uppercase font-mono">
                                  In:
                                </span>
                                <input
                                  type="number"
                                  step="0.05"
                                  value={sub.startTime}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    handleUpdateSubTimes(
                                      sub.id,
                                      val,
                                      sub.endTime,
                                    );
                                    if (!isNaN(val)) {
                                      handleSeek(val);
                                    }
                                  }}
                                  className="w-[50px] bg-slate-950 border border-slate-900 text-[10px] p-1 rounded font-mono text-center outline-none"
                                />
                              </div>

                              {/* End Time input */}
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-slate-500 uppercase font-mono">
                                  Out:
                                </span>
                                <input
                                  type="number"
                                  step="0.05"
                                  value={sub.endTime}
                                  onChange={(e) =>
                                    handleUpdateSubTimes(
                                      sub.id,
                                      sub.startTime,
                                      parseFloat(e.target.value),
                                    )
                                  }
                                  className="w-[50px] bg-slate-950 border border-slate-900 text-[10px] p-1 rounded font-mono text-center outline-none"
                                />
                              </div>
                            </div>

                            {/* Utility segment buttons */}
                            <div className="flex items-center gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-slate-900">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSplitSegment(sub);
                                }}
                                className="p-1.5 hover:bg-slate-900 rounded text-slate-400 hover:text-blue-300"
                                title="Split segment in half"
                              >
                                <Scissors className="w-3 h-3" />
                              </button>
                              {idx < subtitles.length - 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMergeSegment(sub);
                                  }}
                                  className="p-1.5 hover:bg-slate-900 rounded text-slate-400 hover:text-pink-300"
                                  title="Merge with next segment"
                                >
                                  <Layers className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSubtitleBlock(sub.id);
                                }}
                                className="p-1.5 hover:bg-slate-900 rounded text-slate-400 hover:text-red-400"
                                title="Delete caption block entirely"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-850 text-slate-500 text-xs">
                      No matching caption dialogue found. Clear your filter.
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <button
                    onClick={handleAddSubtitleBlock}
                    className="w-full py-2.5 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-1 transition-all duration-150"
                  >
                    <Plus className="w-4 h-4 text-blue-400" />
                    <span>Append New Subtitle Block</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: SMART AI CAPTIONS TOOLS */}
            {activeTab === "smart" && (
              <div className="flex flex-col gap-5">
                <div className="bg-gradient-to-r from-blue-950/25 to-sky-950/15 border border-indigo-900/40 p-4 rounded-xl flex flex-col gap-2">
                  <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" /> Co-Pilot AI
                    Helper Workspace
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Refine formatting errors, remove stuttering filler sounds,
                    or scan and resolve minor phonetic misalignments completely
                    driven by Gemini context models.
                  </p>
                </div>

                {/* AI Filler Word Eraser button */}
                <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-xl flex items-center justify-between gap-4 group">
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-200 block group-hover:text-blue-300 transition-colors">
                      Clean Speech Filler Words
                    </h4>
                    <span className="text-[10px] text-slate-500 block leading-relaxed mt-0.5">
                      Scans all manuscript dialogues to automatically delete
                      "um", "uh", "hmm", or stammered repeated words.
                    </span>
                  </div>
                  <button
                    id="btn-smart-scrub-fillers"
                    onClick={handleScrubFillerWords}
                    disabled={isSuggestionsLoading || !subtitles.length}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-850 hover:border-slate-700 hover:scale-[1.02] active:scale-95 duration-150 text-xs font-bold rounded-xl flex-shrink-0"
                  >
                    Scrub Blocks
                  </button>
                </div>

                {/* Auto Correction Checker trigger */}
                <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-xl flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">
                        Gemini Transcription Quality Assurance
                      </h4>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Detect logical grammar slips or contextual proper nouns
                        misaligned phonetic streams.
                      </span>
                    </div>
                    <button
                      id="btn-smart-scan-corrections"
                      onClick={handleSuggestCorrections}
                      disabled={isSuggestionsLoading || !subtitles.length}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.01] text-white text-xs font-bold rounded-xl flex-shrink-0 transition-transform flex items-center gap-1"
                    >
                      {isSuggestionsLoading ? (
                        <Activity className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Scan Manuscripts</span>
                    </button>
                  </div>

                  {/* Corrections results stack */}
                  {aiSuggestions.length > 0 ? (
                    <div className="flex flex-col gap-3 mt-1.5 border-t border-slate-900 pt-3">
                      <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">
                        AI Quality Improvement Suggestions:
                      </span>

                      <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {aiSuggestions.map((sug) => {
                          const targetSub = subtitles.find(s => s.id === sug.id);
                          const subIndex = subtitles.findIndex(s => s.id === sug.id) + 1;

                          return (
                            <div
                              key={sug.id}
                              className="p-3 bg-slate-900 border border-slate-850 rounded-xl flex flex-col gap-1.5"
                            >
                              <div className="flex items-center justify-between gap-2 border-b border-slate-850 pb-1.5">
                                <span className="text-[10px] font-mono font-bold bg-slate-850 px-1.5 py-0.5 rounded text-slate-350">
                                  #{subIndex} {targetSub ? `(${targetSub.speaker})` : ""}
                                </span>
                                {targetSub && (
                                  <button
                                    onClick={() => {
                                      setActiveTab("editor");
                                      setSelectedSubId(sug.id);
                                      handlePlaySegment(targetSub);
                                    }}
                                    className="text-[9px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono cursor-pointer"
                                    title="Jump to card in editor and play audio segment"
                                  >
                                    <Sparkles className="w-2.5 h-2.5" />
                                    Locate & Play ({targetSub.startTime}s)
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-450 leading-relaxed italic border-l-2 border-indigo-500 pl-2">
                                Reason: {sug.reason}
                              </p>
                              <div className="flex items-center justify-between gap-3 text-xs pt-1">
                                <div>
                                  <span className="line-through text-red-500 opacity-60 mr-2 font-mono">
                                    {sug.originalText}
                                  </span>
                                  <span className="text-green-400 font-bold font-semibold font-mono">
                                    {sug.suggestedText}
                                  </span>
                                </div>
                                <button
                                  onClick={() =>
                                    applyCorrection(sug.id, sug.suggestedText)
                                  }
                                  className="px-2 py-0.5 bg-green-950 text-green-300 hover:bg-green-900/60 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Accept Change
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    !isSuggestionsLoading && (
                      <div className="p-4 bg-slate-900/80 border border-slate-880/40 rounded-xl text-center text-xs text-slate-500 leading-normal">
                        No active QA suggestions generated. Click "Scan
                        Manuscripts" to analyze timelines with the Gemini
                        models.
                      </div>
                    )
                  )}

                  {isSuggestionsLoading && (
                    <div className="flex flex-col justify-center items-center p-6 text-center gap-3">
                      <LoaderLinear />
                      <span className="text-[11px] text-indigo-400 font-semibold animate-pulse">
                        Gemini Speech Models parsing timeline semantics...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 1. Camera Recording Modal Dialog */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Studio Camera Recorder</span>
              </h3>
              <button
                onClick={handleStopCamera}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
              >
                Close
              </button>
            </div>

            <div className="p-6 flex flex-col items-center gap-4 bg-slate-950/40">
              {/* Show Live Stream Video if no recorded URL exists */}
              {!cameraRecordingUrl ? (
                <div className="relative w-full aspect-video bg-black rounded-xl border border-slate-800 overflow-hidden">
                  <video
                    id="camera-preview-video"
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  {isRecordingCamera && (
                    <div className="absolute top-4 left-4 bg-red-650/90 text-white text-[10px] px-2 py-1.5 rounded-lg font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="w-2.5 h-2.5 rounded-full bg-white block" />
                      <span>
                        REC {Math.floor(cameraDuration / 60)}:
                        {String(cameraDuration % 60).padStart(2, "0")}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full aspect-video bg-black rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-center">
                  <video
                    src={cameraRecordingUrl}
                    className="w-full h-full object-contain"
                    controls
                    playsInline
                  />
                </div>
              )}

              <div className="flex items-center gap-3 w-full justify-center">
                {!cameraRecordingUrl ? (
                  !isRecordingCamera ? (
                    <button
                      onClick={handleStartRecordingCamera}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow shadow-red-500/25 cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                      <span>Start Recording</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopRecordingCamera}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-white border border-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 bg-red-500 rounded block" />
                      <span>Stop & Process</span>
                    </button>
                  )
                ) : (
                  <>
                    <button
                      onClick={handleUseRecording}
                      className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow shadow-green-500/25 cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-green-100" />
                      <span>Import Recording</span>
                    </button>
                    <button
                      onClick={handleStartCamera}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Record Again
                    </button>
                  </>
                )}

                <button
                  onClick={handleStopCamera}
                  className="px-5 py-2.5 bg-slate-955 hover:bg-slate-900 text-slate-400 border border-slate-850 hover:border-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Video Export Burn-In Modal */}
      {isExportingVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span>Burn Subtitles & Export Video</span>
              </h3>
              {exportProgress === 100 && (
                <button
                  onClick={() => {
                    setIsExportingVideo(false);
                    setExportVideoUrl(null);
                  }}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  Close
                </button>
              )}
            </div>

            <div className="p-6 flex flex-col items-center gap-5 bg-slate-950/40">
              {exportProgress < 100 ? (
                <div className="w-full flex flex-col items-center gap-4 text-center">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <LoaderRing />
                    <span className="absolute text-[11px] font-bold text-blue-400 font-mono">
                      {exportProgress}%
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">
                      Rendering Captions onto Video Frames...
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed max-w-sm">
                      This processes the video frame-by-frame and burns your
                      customized style overlay directly into the track. Please
                      keep this tab open.
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-850">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-150"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>

                  <button
                    onClick={handleAbortExport}
                    className="mt-2 px-4 py-2 bg-red-950 hover:bg-red-900/60 text-red-300 border border-red-950/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Abort Export
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-4 text-center">
                  <div className="p-2.5 bg-green-500/10 border border-green-500/25 rounded-2xl text-green-400 flex items-center justify-center mb-1 animate-[scale-up_0.3s_ease-out]">
                    <Check className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">
                      Video Encoded Successfully!
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed max-w-sm">
                      Your finished video containing fully-burned captioned
                      overlays is ready for download.
                    </p>
                  </div>

                  {exportVideoUrl && (
                    <div className="w-full aspect-video rounded-xl border border-slate-800 overflow-hidden bg-black mt-2">
                      <video
                        src={exportVideoUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    <a
                      href={exportVideoUrl || "#"}
                      download="captioned_video.webm"
                      className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow shadow-indigo-500/20"
                    >
                      <Download className="w-4 h-4 text-indigo-100" />
                      <span>Download Captioned Video</span>
                    </a>

                    <button
                      onClick={() => {
                        setIsExportingVideo(false);
                        setExportVideoUrl(null);
                      }}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Close Workspace
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visual background decorations - keeping outer interface strictly empty other than functional studio */}
      <div className="opacity-15 pointer-events-none absolute -top-40 -left-40 w-96 h-96 bg-blue-500 rounded-full blur-[160px] z-1" />
      <div className="opacity-10 pointer-events-none absolute bottom-10 right-10 w-96 h-96 bg-indigo-500 rounded-full blur-[180px] z-1" />
    </div>
  );
}

// Compact helper components: Loader Ringer
function LoaderRing() {
  return (
    <div className="relative w-10 h-10">
      <div className="absolute inset-0 rounded-full border-4 border-indigo-950" />
      <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  );
}

// Linear scanning animation
function LoaderLinear() {
  return (
    <div className="w-2/3 h-1.5 bg-slate-900 rounded-full overflow-hidden">
      <div className="h-full bg-indigo-500 rounded-full w-1/3 animate-[loading_1.5s_infinite_ease-out]" />
    </div>
  );
}

// Calculate readability/darkness brightness for overlay sizing
function textBrightness(color: string, opacity: number): number {
  if (opacity < 0.2) return 1;
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  // If light background, return full, else normal
  return brightness > 150 ? 0.95 : 1;
}

// Helper to convert HEX and opacity transparency to real CSS RGBA
function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
