
import { NextResponse } from 'next/server';
import fs from 'fs';
import fetch from 'node-fetch';
import { Readable } from 'stream';

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

    // Save to /tmp/output.mp4 (Vercel-compatible)
    const tmpPath = '/tmp/output.mp4';
    const fileStream = fs.createWriteStream(tmpPath);
    await new Promise<void>((resolve, reject) => {
      (videoRes.body!).pipe(fileStream);
      (videoRes.body!).on('error', reject);
      fileStream.on('finish', () => resolve());
      fileStream.on('error', reject);
    });

    // Stream the video file back in the response
    const stat = fs.statSync(tmpPath);
    const stream = fs.createReadStream(tmpPath);
    const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;
    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(stat.size),
        'Content-Disposition': 'inline; filename="output.mp4"',
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
