
# AI Video Generation


## Tech Stack & Model Details

- **Framework:** [Next.js](https://nextjs.org/) (React, App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS (utility-first CSS framework)
- **Hosting:** Vercel (serverless, edge-ready)
- **Storage:** Vercel Blob (for production video streaming)
- **AI Model:** [`zerogpu-aoti/wan2-2-fp8da-aoti`](https://huggingface.co/zerogpu-aoti/wan2-2-fp8da-aoti) (Hugging Face, via Gradio client)
- **API Client:** @gradio/client (for model inference)
- **Node.js:** 18+ (native fetch, streaming support)
- **Other:** ESLint, Prettier (for code quality)

## Overview
This project is an AI-powered video generator built with Next.js, TypeScript, and Vercel. It allows users to enter a prompt, Hugging Face token, and duration to generate a short AI video, which is streamed directly in the browser for a seamless experience.

---

## Features & Functionality
- **Prompt-based video generation**: Enter a text prompt, Hugging Face token, and duration to generate a video using the Hugging Face/Gradio API.
- **Streaming playback**: Videos are streamed to the browser using HTTP Range requests (no full download required).
- **Error handling**: Clear feedback for invalid tokens, API errors, and deployment/storage issues.
- **Bonus**: True streaming (not just download), with fallback for local/dev and production.

---

## Deployment
- **Vercel-ready**: Fully compatible with Vercel’s serverless environment.
- **Blob storage**: Uses [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for persistent, streamable video URLs in production.
- **Local fallback**: In development, videos are saved to `./videos` and streamed via a custom API endpoint.
- **Easy deploy**: One-click deploy to Vercel, or run locally with Node.js 18+.

### Environment Variables
- `BLOB_READ_WRITE_TOKEN` (Production): Required for Vercel Blob uploads. Set in Vercel Project Settings > Environment Variables.

---

## Code Quality
- **TypeScript**: Strict typing, no `any` types, and safe error handling.
- **Linted**: Passes ESLint and type checks.
- **Clean code**: No unused imports, dead code, or unnecessary dependencies.
- **Modular**: API and UI are separated and easy to maintain.

---

## Documentation

### Setup & Usage
1. **Clone the repo:**
	```bash
	git clone https://github.com/Ajith-Geo/AI-video-generation.git
	cd AI-video-generation
	```
2. **Install dependencies:**
	```bash
	npm install
	```
3. **Run locally:**
	```bash
	npm run dev
	# Visit http://localhost:3000
	```

### Hugging Face Token
- Get a token from [Hugging Face](https://huggingface.co/settings/tokens) (must start with `hf_`).
- Paste it in the UI when generating a video.

### Streaming Details
- Videos are streamed using HTTP Range requests for instant playback and seeking.
- In production, videos are uploaded to Vercel Blob and served from a public, range-enabled URL.
- In local/dev, videos are saved to `./videos` and streamed via `/api/stream-video`.

### Security
- All secrets are loaded from environment variables. (If running locally)

---

## Innovation
- **True streaming**: Uses `<video src={url}>` with a streamable endpoint (Blob or custom) for progressive playback.
- **Fallback logic**: Works both locally and in production, adapting to available storage.
- **Bonus**: Handles CORS, Range, and error edge cases for robust UX.

---