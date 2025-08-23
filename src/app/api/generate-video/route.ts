
import { NextResponse } from 'next/server';
import fs from 'fs';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { prompt, token, duration } = await req.json();
    if (!token || !token.startsWith('hf_')) {
      return NextResponse.json({ error: 'Valid Hugging Face token required' }, { status: 400 });
    }

    const { Client } = await import("@gradio/client");
    const client = await Client.connect("ginigen/VEO3-Free", { hf_token: token as `hf_${string}` });
    const result = await client.predict("/generate_video_with_audio", {
      prompt: prompt,
      nag_negative_prompt: "Static, motionless, still, ugly, bad quality, worst quality, poorly drawn, low resolution, blurry, lack of details",
      nag_scale: 11,
      height: 480,
      width: 832,
      duration_seconds: duration,
      steps: 4,
      seed: 2025,
      randomize_seed: true,
      enable_audio: false,
    });

  // Safely extract the video URL from the result without using `any`
  type ResultShape = { data?: Array<{ video?: { url?: unknown } }> };
  const maybe: ResultShape = (typeof result === 'object' && result !== null) ? (result as ResultShape) : {};
  const urlCandidate = maybe.data?.[0]?.video?.url;
  const videoUrl: string | undefined = typeof urlCandidate === 'string' ? urlCandidate : undefined;
    if (!videoUrl) {
      return NextResponse.json({ error: 'No video URL found in response' }, { status: 500 });
    }
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok || !videoRes.body) {
      return NextResponse.json({ error: 'Failed to download video' }, { status: 500 });
    }
    // Prefer Vercel Blob (supports Range and is production-safe). Fallback to local dev file.
    const filename = `output_${Date.now()}.mp4`;
    const tokenEnv = process.env.BLOB_READ_WRITE_TOKEN;
    if (tokenEnv) {
      const blob = await videoRes.blob();
      const { url } = await put(`videos/${filename}`, blob, {
        access: 'public',
        contentType: 'video/mp4',
        token: tokenEnv,
      });
      return NextResponse.json({ url });
    }

    // If running on Vercel without Blob token, avoid filesystem writes and return the upstream URL.
    if (process.env.VERCEL === '1') {
      return NextResponse.json({ url: videoUrl });
    }

    // Local fallback: save under ./videos and stream via our Range-enabled endpoint
  // Local fallback: save under ./videos and stream via our Range-enabled endpoint
  const videosDir = `${process.cwd()}/videos`;
  if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
  const filePath = `${videosDir}/${filename}`;
  const arrayBuffer = await videoRes.arrayBuffer();
  await fs.promises.writeFile(filePath, Buffer.from(arrayBuffer));
  const urlForClient = `/api/stream-video?file=${encodeURIComponent(filename)}`;
  return NextResponse.json({ url: urlForClient });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
