
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { prompt, token, duration } = await req.json();
    if (!token || !token.startsWith('hf_')) {
      return NextResponse.json({ error: 'Valid Hugging Face token required' }, { status: 400 });
    }

    const { Client } = await import("@gradio/client");
    const client = await Client.connect("zerogpu-aoti/wan2-2-fp8da-aoti", { hf_token: token as `hf_${string}` });
    const result = await client.predict("/generate_video", {
      prompt: prompt,
      negative_prompt: "色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, 静止, 整体发灰, 最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, 多余的手指, 画得不好的手部, 画得不好的脸部, 畸形的, 毁容的, 形态畸形的肢体, 手指融合, 静止不动的画面, 杂乱的背景, 三条腿, 背景人很多, 倒着走",
      duration_seconds: duration,
      guidance_scale: 1,
      guidance_scale_2: 3,
      steps: 4,
      seed: 42,
      randomize_seed: true
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
    const videosDir = path.join(process.cwd(), 'videos');
    if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
  const filePath = path.join(videosDir, filename);
  const arrayBuffer = await videoRes.arrayBuffer();
  await fs.promises.writeFile(filePath, Buffer.from(arrayBuffer));
    const urlForClient = `/api/stream-video?file=${encodeURIComponent(filename)}`;
    return NextResponse.json({ url: urlForClient });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
