import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('file');
    if (!url) {
      return new NextResponse('Missing file parameter', { status: 400 });
    }
    const videoPath = path.join(process.cwd(), 'videos', url);
    if (!fs.existsSync(videoPath)) {
      return new NextResponse('File not found', { status: 404 });
    }
    const stat = fs.statSync(videoPath);
    const range = req.headers.get('range');
    let start = 0;
    let end = stat.size - 1;
    let status = 200;
    let headers: Record<string, string> = {
      'Content-Type': 'video/mp4',
      'Content-Length': String(stat.size),
    };
    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        start = parseInt(match[1], 10);
        if (match[2]) end = parseInt(match[2], 10);
        status = 206;
        headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
        headers['Accept-Ranges'] = 'bytes';
        headers['Content-Length'] = String(end - start + 1);
      }
    }
    const stream = fs.createReadStream(videoPath, { start, end });
    return new NextResponse(stream as any, { status, headers });
  } catch (e: any) {
    return new NextResponse(e.message || 'Unknown error', { status: 500 });
  }
}
