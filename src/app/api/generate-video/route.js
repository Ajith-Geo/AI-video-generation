import { NextResponse } from 'next/server';
import fs from 'fs';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    // 1. Parse request body
    const { prompt, token, duration } = await req.json();

    // 2. Validate Hugging Face token
    if (!token || !token.startsWith('hf_')) {
      return NextResponse.json({ error: 'Valid Hugging Face token required' }, { status: 400 });
    }

    // 3. Validate duration
    if (typeof duration !== 'number' || duration < 1 || duration > 6) {
      return NextResponse.json({ error: 'Duration must be a number between 1 and 6 seconds.' }, { status: 400 });
    }

    // 4. Connect to Hugging Face model
    const { Client } = await import("@gradio/client");
    const client = await Client.connect("KingNish/wan2-2-fast", { hf_token: token });

    // 5. Request video generation
    const result = await client.predict("/generate_video", {
      input_image: null,
      prompt,
      height: 896,
      width: 896,
      negative_prompt: "Bright tones, overexposed, static, blurred details, subtitles, style, works, paintings, images, static, overall gray, worst quality, low quality, JPEG compression residue, ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn faces, deformed, disfigured, misshapen limbs, fused fingers, still picture, messy background, three legs, many people in the background, walking backwards, watermark, text, signature",
      duration_seconds: duration,
      guidance_scale: 0,
      steps: 4,
      seed: 1337137907,
      randomize_seed: true,
    });

    // 6. Extract video URL from model response
    const videoUrl = result?.data?.[0]?.video?.url;
    if (!videoUrl) {
      return NextResponse.json({ error: 'No video URL found in response' }, { status: 500 });
    }

    // 7. Download video from Hugging Face
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok || !videoRes.body) {
      return NextResponse.json({ error: 'Failed to download video' }, { status: 500 });
    }

    // 8. Prepare filename for saving
    const filename = `output_${Date.now()}.mp4`;

    // 9. If running in production with Vercel Blob, upload video
    const tokenEnv = process.env.BLOB_READ_WRITE_TOKEN;
    if (tokenEnv) {
      const blob = await videoRes.blob();
      const { url } = await put(`videos/${filename}`, blob, {
        access: 'public',
        contentType: 'video/mp4',
        token: tokenEnv,
      });
      // Return public Blob URL
      return NextResponse.json({ url });
    }

    // 10. If running in Vercel (no Blob), return direct video URL
    if (process.env.VERCEL === '1') {
      return NextResponse.json({ url: videoUrl });
    }

    // 11. Otherwise, save video locally and stream via custom endpoint
    const videosDir = `${process.cwd()}/videos`;
    if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
    const filePath = `${videosDir}/${filename}`;
    const arrayBuffer = await videoRes.arrayBuffer();
    await fs.promises.writeFile(filePath, Buffer.from(arrayBuffer));
    const urlForClient = `/api/stream-video?file=${encodeURIComponent(filename)}`;
    return NextResponse.json({ url: urlForClient });
  } catch (e) {
    // 12. Error handling: return error message
    let message = 'Unknown error';
    if (e instanceof Error) {
      message = e.message;
    } else if (typeof e === 'string') {
      message = e;
    } else if (typeof e === 'object' && e !== null) {
      try {
        message = JSON.stringify(e);
      } catch {
        message = 'Unknown error';
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
