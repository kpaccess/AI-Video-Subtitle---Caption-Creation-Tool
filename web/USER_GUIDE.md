# User Guide: AI Video Subtitle & Caption Creation Tool

Welcome to the **AI Video Subtitle & Caption Creation Tool**! This professional studio application is designed to help video creators generate, refine, style, and export highly engaging subtitles and captions for their videos. Powered by Google Gemini models, the tool automates transcription and copy-editing while giving you complete creative control over typography, visual effects, and animations.

---

## Table of Contents
1. [Prerequisites & Getting Started](#1-prerequisites--getting-started)
2. [How to Use the App: Core Workflows](#2-how-to-use-the-app-core-workflows)
   - [Step 1: Upload or Load a Video](#step-1-upload-or-load-a-video)
   - [Step 2: AI Speech-to-Text Transcription](#step-2-ai-speech-to-text-transcription)
   - [Step 3: Timeline & Manuscript Editing](#step-3-timeline--manuscript-editing)
   - [Step 4: Typography, Styles & Backgrounds](#step-4-typography-styles--backgrounds)
   - [Step 5: Interactive Layout & Drag-and-Drop Placement](#step-5-interactive-layout--drag-and-drop-placement)
   - [Step 6: AI Co-Pilot Improvements](#step-6-ai-co-pilot-improvements)
   - [Step 7: Exporting Your Project](#step-7-exporting-your-project)
3. [Understanding Reel Types: Multi-Speaker, Tech, and Dynamic Reels](#3-understanding-reel-types-multi-speaker-tech-and-dynamic-reels)
   - [Multi-Speaker Reel](#multi-speaker-reel)
   - [Tech Reel](#tech-reel)
   - [Dynamic Reel](#dynamic-reel)
   - [Comparison Table](#comparison-table)
4. [Developer & Technical Architecture Guide](#4-developer--technical-architecture-guide)
   - [Technical Stack & Folder Structure](#technical-stack--folder-structure)
   - [Audio Extraction Pipeline](#audio-extraction-pipeline)
   - [AI Engine Integration](#ai-engine-integration)
   - [Rendering & Burn-In Mechanism](#rendering--burn-in-mechanism)

---

## 1. Prerequisites & Getting Started

### Prerequisites
- **Node.js** (v18+)
- **npm** (v9+)
- A **Gemini API Key** from Google AI Studio.

### Quick Start
1. **Configure Environment Variables:**
   Create a `.env` file in the root of the repository:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Start the Development Server:**
   ```bash
   npm run dev
   ```
4. **Access the App:** Open `http://localhost:3000` in your web browser.

---

## 2. How to Use the App: Core Workflows

### Step 1: Upload or Load a Video
You can start using the application in two ways:
- **Use Sample Videos:** Under the video player, click on any of the three pre-loaded projects (**Podcast**, **Tech Vlog**, or **Travel Reel**) to instantly load a video and its pre-synchronized subtitles.
- **Upload Your Own Video:** Drag and drop your MP4 or WebM video file, or click to choose a file from your system. 
  - *Technical Note:* When you upload a video, the app uses the browser's Web Audio API (`OfflineAudioContext`) to extract the audio track and convert it into a mono WAV file locally on your computer. This means no huge video files are sent to the server, resulting in lightning-fast processing and zero upload size limits!

### Step 2: AI Speech-to-Text Transcription
If you've uploaded your own video, open the **AI Transcription** tab in the right-hand panel:
1. Select the spoken **Language** (e.g., English, Spanish, French, Kannada, Hindi, etc.).
2. Toggle advanced options:
   - **Filler Word Cleanup:** Remove hesitation sounds (e.g., "um", "uh", "hmm") from the transcription.
   - **Smart Punctuation:** Automatically insert periods, commas, and question marks.
   - **Speaker Identity Tracking:** Group spoken segments by different speakers (e.g., "Speaker 1", "Speaker 2").
3. Click **Trigger Gemini AI Transcription**. In seconds, the transcription will be generated and mapped to a visual timeline.

### Step 3: Timeline & Manuscript Editing
Once your subtitles are loaded, you can edit them in two interactive ways:
- **Timeline Pill Bars (Bottom):** Below the video player, each subtitle is rendered as a draggable colored pill.
  - **Drag a pill** to move its start and end times.
  - **Click a pill** to seek the video player directly to that segment.
- **Manuscript Editor Panel (Right Tab):** 
  - **Filter Search:** Type in the search bar to locate specific spoken words.
  - **Direct Text Editing:** Click inside any subtitle card's text area to rewrite or correct transcriptions.
  - **Time-code Adjustments:** Directly change the `In` (start time) and `Out` (end time) numeric fields.
  - **Split Segment:** Click the **Scissors icon** to split a long subtitle block into two equal halves.
  - **Merge Segment:** Click the **Layers icon** to merge a subtitle block with the one immediately following it.
  - **Delete Block:** Click the **Trash icon** to remove a segment.
  - **Append Block:** Click the **Append New Subtitle Block** button to create a new caption segment.

### Step 4: Typography, Styles & Backgrounds
Switch to the **Visual Styling** tab in the right-hand panel to customize the visual appearance of your captions:
- **Instant Presets:** Click on badges like **TikTok Creator**, **Cinema Classic**, **Cyber Rebel**, or **Karaoke Stage** to apply pre-configured style layouts.
- **Typography Settings:** Adjust the font family (e.g., *Space Grotesk*, *Playfair Display*, *Fira Code*, *Inter*), font size, line weights (Bold/Normal), italics, color, and letter spacing.
- **Background & Card Fill:** Set a background card behind the subtitles, control its color and opacity, and select the **Backdrop Style** (choose between *Solid Card Fill*, *Frosted Glass* using CSS backdrop filter/canvas stroke, or *Transparent / None*).
- **Outline & Stroke:** Add a dark outline border to subtitles to ensure they are readable against any video frame.
- **Outer Glow:** Add a glowing, neon drop-shadow to make text pop off the screen.
- **Animated Caption Styles:** Select from multiple rendering animations:
  - **TikTok Dynamic:** Displays words and highlights syllables dynamically.
  - **Karaoke Pro:** Highlights words in yellow sequentially as they are spoken.
  - **Bouncing Active:** Active words bounce slightly.
  - **Pop Sequentially:** Words pop onto the screen as they appear.
  - **Pure Word-by-Word:** Displays only the currently spoken word, hiding the rest of the sentence.
  - **Speaker Highlight:** Displays colored badges or speaker labels.

### Step 5: Interactive Layout & Drag-and-Drop Placement
Captions are placed relative to the video frame:
- **Drag-and-Drop:** You can click directly on the text subtitle overlay inside the video player preview and drag it to any position (top, center, lower thirds, left/right margins).
- The coordinates will be locked in real-time, allowing you to position captions perfectly depending on the video's composition (e.g., avoiding covering a face or key graphic).

### Step 6: AI Co-Pilot Improvements
If you have an active subtitle sequence, navigate to the **Smart AI** tab to refine your captions using Gemini models:
- **Clean Speech Filler Words:** Click **Scrub Blocks** to automatically scrub hesitation sounds ("um", "uh", "like") from all active segments while keeping the timestamps synchronized.
- **Gemini Transcription Quality Assurance:** Click **Scan Manuscripts** to analyze the context of your text. Gemini will flag proper nouns (e.g., correcting "Gimini" to "Gemini"), logical grammar slips, or spelling errors, and offer you a list of suggestions with an **Accept Change** button for each.

### Step 7: Exporting Your Project
Once you are satisfied with your captions, use the **Export Options** at the bottom of the video player deck:
- **Export SRT:** Download a standard `.srt` subtitle file.
- **Export VTT:** Download a `.vtt` file, ideal for web media players.
- **Export Plain TXT:** Download a structured script transcript of your video, formatted with speaker name headers.
- **Export Caption Project:** Save your entire project configuration (video path, subtitle timings, speaker designations, visual styles, and drag coordinates) as a `.json` file. You can load this file back into the app later to continue editing.
- **Export Burned-In Video:** Overlay your styled and animated subtitles directly onto the video frames. Click the **Export Video** button next to the download options to record the canvas stream (combining the video player and subtitle canvas) alongside the audio track. The final video will download with the custom fonts, gradients, rotation tilts, and frosted glass backdrops burned in natively!

---

## 3. Understanding Reel Types: Multi-Speaker, Tech, and Dynamic Reels

The three sample projects provided in the app represent distinct video editing scenarios. These are **not** just random categories; they are different video formatting subjects with unique characteristics:

### Multi-Speaker Reel
*   **Context:** Typically used for podcasts, interviews, panel discussions, or group vlogs.
*   **Key Challenge:** Tracking who is talking, managing overlapping speech, and labeling speaker turns.
*   **How to Style:**
    *   Use the **Speaker Highlight** animation preset to overlay speaker names or display distinct colors.
    *   Enable **Speaker Identity Tracking** during AI transcription to automatically parse who spoke when.
    *   Use global speaker renaming to rename default labels (like "Speaker 1" to "Sarah").

### Tech Reel
*   **Context:** Best for tutorials, software walkthroughs, product unboxing videos, or educational content.
*   **Key Challenge:** Transcription of specialized technical jargon, maintaining long, continuous, and highly readable blocks of descriptive text.
*   **How to Style:**
    *   Use highly readable clean fonts like **Inter** or **Fira Code**.
    *   Use the **Cinema Classic** or **Karaoke Stage** presets to keep the user focused on the educational context.
    *   Leverage **Smart Punctuation** and the **AI QA Scanner** to ensure technical acronyms and complex terms are capitalized and spelled correctly.

### Dynamic Reel
*   **Context:** Built for short-form, high-impact social media posts (TikTok, Instagram Reels, YouTube Shorts).
*   **Key Challenge:** Maintaining user engagement in fast-paced videos with high energy and music.
*   **How to Style:**
    *   Use the **TikTok Creator** or **Cyber Rebel** style presets.
    *   Use **bold uppercase fonts** (e.g., Space Grotesk), bright text outline strokes, and a neon outer glow.
    *   Set the animation preset to **TikTok Dynamic** or **Bouncing Active** (word-by-word or syllable popping).
    *   Drag the subtitle block to the middle of the screen (vertical center) to stay in the primary visual safe-zone for social feeds.

### Comparison Table

| Feature / Metric | Multi-Speaker Reel | Tech Reel | Dynamic Reel |
| :--- | :--- | :--- | :--- |
| **Primary Video Type** | Podcast, Interview, Conversation | Tutorial, Review, Walkthrough | Social Short, Promo, Ad |
| **Number of Speakers** | Multi-speaker ($2+$) | Solo Host | Solo Host / Voiceover |
| **Pacing** | Conversational, pauses | Structured, informative | Rapid, high-energy |
| **Caption Animation** | Speaker Highlight / Fade | Zoom / Fade / Karaoke | TikTok Dynamic / Bouncing |
| **Typography Style** | Subdued, clear font sizes | Clean, readable, medium size | Large, uppercase, neon glow |
| **Layout Position** | Lower-third or custom | Lower-third | Center frame (safe-zone) |
| **Key AI Tools Used** | Speaker Identity Tracking | Smart Punctuation, QA Scanner | Filler Word Scrubbing |

---

## 4. Developer & Technical Architecture Guide

This section outlines the technical implementation details for software developers looking to extend, debug, or host the caption creator studio.

### Technical Stack & Folder Structure
- **Frontend Layer:** Built with **React 19** and compiled via **Vite**. Styling is written in **Vanilla CSS** coupled with Tailwind CSS for layout building. Responsive design is integrated natively.
- **Backend Service Layer:** Built on **Node.js/Express** using `tsx` for TypeScript execution.
- **AI Orchestration:** Leverages `@google/genai` (SDK v2.4.0) pointing to `gemini-3.5-flash` model.
- **File Structure:**
  - `server.ts`: Configures Express routing, security headers (Helmet), request rate limiting, and handles Gemini AI API queries.
  - `src/main.tsx`: Main React entry point.
  - `src/App.tsx`: Houses the core frontend layout, client state logic, browser video player overlay, canvas subtitle drawing, and project configuration managers.
  - `public/`: Hosts static assets, including demo reel video configurations (e.g. `whatsapp_sample.mp4`).

### Audio Extraction Pipeline
To avoid transmission of large video files, the app does not perform full video uploads. Instead:
1. When a user uploads a video file, it gets loaded in-browser.
2. We instantiate an `OfflineAudioContext` (via Web Audio API) matching the audio track's duration.
3. The video's audio channel data is decoded, downsampled to a lightweight **16kHz mono WAV** format, and converted to base64.
4. Only this tiny base64 audio payload is uploaded to the backend server `/api/transcribe` endpoint, providing high speed and bypassing body size limits.

### AI Engine Integration
Three server routes manage interaction with Google Gemini (`gemini-3.5-flash`):
- `/api/transcribe`: Expects the base64 audio payload. It uses structured JSON output schema targeting subtitle timing segments. Gemini analyzes the speech, splits them into logical intervals, identifies speaker designations (if requested), and output timings in seconds.
- `/api/clean-fillers`: Cleans speech hesitation markers ("um", "uh", "like") from a subtitles array, returning updated texts with matching timings.
- `/api/correct-transcript`: Scans the entire manuscript to detect context-based typos or proper name spelling anomalies (e.g. correcting "Gimini" to "Gemini"), returning a list of discrete suggestions with reasons for the user to review.

### Rendering & Burn-In Mechanism
Subtitle styling parameters are synced across two rendering pipelines:
1. **Live Preview Overlay:** Positioned absolutely over the HTML5 video element. Visual properties (slanting tilt rotation, linear text color gradients, frosted glass backdrop filters, and text-shadow glow intensities) are rendered dynamically using inline React CSS styles.
2. **Canvas Subtitle Burn-In:** In order to burn subtitles directly into the video for export, the app captures the raw frames of the playing HTML5 video onto a canvas.
   - For every frame, the app draws the video frame, then calls `drawCaptionsOnCanvas` to overlay the styled subtitle cards.
   - The canvas coordinate system is translated and rotated (`ctx.translate` and `ctx.rotate`) to render rotated captions at the appropriate target position.
   - A `MediaStream` is constructed from the canvas recording stream and multiplexed with the original video's audio track. This stream is processed via the browser's `MediaRecorder` API to compile a downloadable, burned-in video file.
