import { NextResponse } from 'next/server';

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

    // 8. Get video data
    const arrayBuffer = await videoRes.arrayBuffer();

    // 9. Return the video
    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: {
        'Content-Type': 'video/mp4',
      },
    });
  } catch (e) {
    // 10. Error handling: return error message
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
