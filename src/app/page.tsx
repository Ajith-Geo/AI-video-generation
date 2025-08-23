"use client";

import React, { useState, useEffect } from "react";


export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [token, setToken] = useState("");
  const [duration, setDuration] = useState("2.0");
  const [durationError, setDurationError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // For animated dots
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDurationError("");
    const numDuration = Number(duration);
    if (isNaN(numDuration) || numDuration < 1 || numDuration > 8) {
      setDurationError("Duration must be a number between 1 and 8 seconds.");
      return;
    }
    setLoading(true);
    setError("");
    setVideoUrl("");
    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt, token, duration: numDuration }),
      });
      if (res.ok) {
        const data: { url?: string; error?: string } = await res.json();
        if (data.url) {
          setVideoUrl(data.url);
        } else {
          setError(data.error || "No video URL returned");
        }
      } else {
        let errorMsg = "Error generating video";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {}
        setError(errorMsg);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error generating video";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cyan-50">
      <div className="bg-white rounded-2xl shadow-lg p-12 w-full max-w-2xl">
        <div className="mb-4 text-center text-yellow-700 text-sm font-medium">
          Note: Video generation might take up to 3 minutes. Please wait.
        </div>
        <h1 className="text-3xl font-bold text-center mb-2">AI Video Generator</h1>
        <p className="text-center text-gray-500 mb-6">
          Enter a prompt and generate a short AI video!
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            className="border rounded px-3 py-2"
            placeholder="Enter Prompt *"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
          <input
            type="text"
            className="border rounded px-3 py-2"
            placeholder="Enter Hugging Face Token (hf_...)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Duration (1 to 8 seconds):</span>
            {/* Plain text box for duration, as before */}
            <input
              type="text"
              className="border rounded px-3 py-2"
              placeholder="Enter Duration (seconds)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
            {durationError && (
              <span className="text-red-600 text-xs">{durationError}</span>
            )}
          </label>
          <button
            type="submit"
            className="bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700 transition"
            disabled={loading}
          >
            {loading ? (
              <>
                Generating{'.'.repeat(dotCount)}
              </>
            ) : (
              "Generate Video"
            )}
          </button>
        </form>
        {error && (
          <p className="text-red-600 text-center mt-4">{error}</p>
        )}
        {videoUrl && !loading && (
          <div className="mt-8 flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-4">Generated Video</h2>
            <video src={videoUrl} controls className="w-[640px] h-[360px] rounded-lg border shadow-lg" />
          </div>
        )}
      </div>
    </main>
  );
}