"use client";

import { type MouseEvent, useEffect, useState } from "react";

type ResearchResponse = {
  executedAt: string;
  provider: string;
  niche: string;
  tool: string;
  format: string;
  data: unknown;
};

type ImageResponse = {
  executedAt: string;
  provider: string;
  prompt: string;
  style: string;
  format: string;
  data: {
    imageBase64: string;
    mimeType: string;
    textResponse: string;
  };
};

type TTSResponse = {
  executedAt: string;
  provider: string;
  format: string;
  data: {
    audioBase64: string;
    voiceName: string;
    bytes: number;
  };
};

type RunHistoryEntry = {
  id: string;
  executedAt: string;
  type: string;
  provider: string;
  status: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const LANGUAGES = [
  { code: "en", label: "🇺🇸 English" },
  { code: "de", label: "🇩🇪 German" },
  { code: "fr", label: "🇫🇷 French" },
  { code: "es", label: "🇪🇸 Spanish" },
  { code: "it", label: "🇮🇹 Italian" },
  { code: "pt", label: "🇧🇷 Portuguese" },
  { code: "ar", label: "🇸🇦 Arabic" },
];

const VOICES = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura" },
];

const STYLES = [
  { id: "watercolor", label: "🎨 Watercolor" },
  { id: "realistic", label: "📷 Realistic" },
  { id: "cartoon", label: "🖌️ Cartoon" },
  { id: "minimal", label: "⬜ Minimal" },
  { id: "vintage", label: "📜 Vintage" },
  { id: "modern", label: "✨ Modern" },
];

const IMAGE_FORMATS = [
  { id: "cover", label: "📖 Book Cover" },
  { id: "illustration", label: "🖼️ Illustration" },
  { id: "page", label: "📄 Page Design" },
  { id: "back-cover", label: "📕 Back Cover" },
];

const RESEARCH_FORMATS = [
  { id: "trends", label: "📊 Google Trends" },
  { id: "keywords", label: "🔍 Keywords" },
  { id: "amazon", label: "📦 Amazon Search" },
  { id: "competitors", label: "⚔️ Competitors" },
  { id: "generic", label: "📋 Market Summary" },
];

const ACTIVE_TOOLS = [
  { key: "serpapi", label: "SerpApi", tier: "Live Data", desc: "Amazon + Google Trends" },
  { key: "dataforseo", label: "DataForSEO", tier: "Live Data", desc: "Keyword volume + difficulty" },
  { key: "gemini", label: "Gemini (Nano Banana)", tier: "Image", desc: "Book covers + illustrations" },
  { key: "elevenlabs", label: "ElevenLabs", tier: "TTS", desc: "Audiobook voice generation" },
  { key: "solene", label: "Solene AI", tier: "AI Fallback", desc: "Market analysis + summaries" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"research" | "image" | "tts">("research");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [imageResult, setImageResult] = useState<ImageResponse | null>(null);
  const [ttsResult, setTTSResult] = useState<TTSResponse | null>(null);
  const [history, setHistory] = useState<RunHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Research state
  const [niche, setNiche] = useState("");
  const [language, setLanguage] = useState("en");
  const [researchFormat, setResearchFormat] = useState("trends");

  // Image state
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageStyle, setImageStyle] = useState("watercolor");
  const [imageFormat, setImageFormat] = useState("cover");
  const [imageTitle, setImageTitle] = useState("");

  // TTS state
  const [ttsText, setTtsText] = useState("");
  const [voiceId, setVoiceId] = useState(VOICES[0].id);

  // PWA install
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setShowInstall(false);
  };

  const addHistory = (type: string, provider: string, status: string) => {
    setHistory((h) => [
      {
        id: `run-${Date.now()}`,
        executedAt: new Date().toISOString(),
        type,
        provider,
        status,
      },
      ...h,
    ].slice(0, 20));
  };

  const runResearch = async () => {
    if (!niche) return setError("Enter a niche first");
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/agent-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, tool: researchFormat, format: researchFormat, language }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        addHistory(`Research: ${researchFormat}`, "Error", "failed");
      } else {
        setResult(data);
        addHistory(`Research: ${researchFormat}`, data.provider, "success");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      addHistory(`Research: ${researchFormat}`, "Error", "failed");
    }
    setLoading(false);
  };

  const generateImage = async () => {
    if (!imagePrompt) return setError("Enter an image prompt");
    setLoading(true);
    setError(null);
    setImageResult(null);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt, style: imageStyle, format: imageFormat, title: imageTitle, language }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        addHistory("Image Generation", "Error", "failed");
      } else {
        setImageResult(data);
        addHistory("Image Generation", data.provider, "success");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      addHistory("Image Generation", "Error", "failed");
    }
    setLoading(false);
  };

  const generateTTS = async () => {
    if (!ttsText) return setError("Enter text to convert");
    setLoading(true);
    setError(null);
    setTTSResult(null);
    try {
      const res = await fetch("/api/agent-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: "tts", tool: "elevenlabs", format: "tts", text: ttsText, voiceId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        addHistory("TTS", "Error", "failed");
      } else {
        setTTSResult(data);
        addHistory("TTS", data.provider, "success");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      addHistory("TTS", "Error", "failed");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              📚 Book Market Research
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              KDP research, cover generation & audiobook TTS
            </p>
          </div>
          {showInstall && (
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              📲 Install App
            </button>
          )}
        </div>

        {/* Tool badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {ACTIVE_TOOLS.map((tool) => (
            <div
              key={tool.key}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            >
              <span className="font-semibold text-slate-900 dark:text-white">{tool.label}</span>
              <span className="text-slate-400 ml-1">· {tool.tier}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-slate-200 dark:border-slate-700">
          {[
            { id: "research", label: "🔍 Research" },
            { id: "image", label: "🎨 Image Gen" },
            { id: "tts", label: "🎤 TTS" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm">
            ⏳ Working on it...
          </div>
        )}

        {/* Research tab */}
        {activeTab === "research" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Niche / Topic
                  </label>
                  <input
                    type="text"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g. romance, self-help, cooking"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Language / Market
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Research Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {RESEARCH_FORMATS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setResearchFormat(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          researchFormat === f.id
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-blue-400"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={runResearch}
                disabled={loading || !niche}
                className="mt-4 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                🔍 Run Research
              </button>
            </div>

            {result && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Result</h3>
                  <span className="text-xs text-slate-500">{result.provider}</span>
                </div>
                <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto max-h-96 text-slate-700 dark:text-slate-300">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Image tab */}
        {activeTab === "image" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Cover / Image Prompt
                  </label>
                  <input
                    type="text"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="e.g. A magical garden with fairy lights, mystical atmosphere"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Book Title (optional)
                  </label>
                  <input
                    type="text"
                    value={imageTitle}
                    onChange={(e) => setImageTitle(e.target.value)}
                    placeholder="e.g. The Magic Garden"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Style</label>
                  <select
                    value={imageStyle}
                    onChange={(e) => setImageStyle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                  >
                    {STYLES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Format</label>
                  <select
                    value={imageFormat}
                    onChange={(e) => setImageFormat(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                  >
                    {IMAGE_FORMATS.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={generateImage}
                disabled={loading || !imagePrompt}
                className="mt-4 w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                🎨 Generate Image
              </button>
            </div>

            {imageResult && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Generated Image</h3>
                  <span className="text-xs text-slate-500">{imageResult.provider}</span>
                </div>
                {imageResult.data.textResponse && (
                  <p className="text-sm text-slate-500 mb-3">{imageResult.data.textResponse}</p>
                )}
                <img
                  src={`data:${imageResult.data.mimeType};base64,${imageResult.data.imageBase64}`}
                  alt="Generated book cover"
                  className="w-full rounded-lg"
                />
                <a
                  href={`data:${imageResult.data.mimeType};base64,${imageResult.data.imageBase64}`}
                  download="book-cover.png"
                  className="mt-3 inline-block px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  ⬇️ Download Image
                </a>
              </div>
            )}
          </div>
        )}

        {/* TTS tab */}
        {activeTab === "tts" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Text to Convert
                  </label>
                  <textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="Paste your book text, chapter, or summary here..."
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-y"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Voice</label>
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                  >
                    {VOICES.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={generateTTS}
                disabled={loading || !ttsText}
                className="mt-4 w-full px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50"
              >
                🎤 Generate Audio
              </button>
            </div>

            {ttsResult && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Audio Result</h3>
                  <span className="text-xs text-slate-500">
                    {ttsResult.data.voiceName} · {(ttsResult.data.bytes / 1024).toFixed(0)} KB
                  </span>
                </div>
                <audio
                  controls
                  className="w-full"
                  src={`data:audio/mpeg;base64,${ttsResult.data.audioBase64}`}
                >
                  Your browser does not support audio playback.
                </audio>
                <a
                  href={`data:audio/mpeg;base64,${ttsResult.data.audioBase64}`}
                  download="audiobook.mp3"
                  className="mt-3 inline-block px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  ⬇️ Download MP3
                </a>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Recent Runs</h3>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={h.status === "success" ? "text-green-600" : "text-red-600"}>
                      {h.status === "success" ? "✅" : "❌"}
                    </span>
                    <span className="text-slate-900 dark:text-white">{h.type}</span>
                    <span className="text-slate-400 text-xs">{h.provider}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(h.executedAt).toLocaleTimeString("en-NO", { timeZone: "Europe/Oslo" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
