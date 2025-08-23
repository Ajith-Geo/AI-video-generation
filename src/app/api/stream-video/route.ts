import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import fs from 'fs';
// path import removed (not needed)
import { Readable } from 'stream';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('file');
    if (!url) {
      return new NextResponse('Missing file parameter', { status: 400 });
    }
  const videoPath = `${process.cwd()}/videos/${url}`;
    if (!fs.existsSync(videoPath)) {
      return new NextResponse('File not found', { status: 404 });
    }
    const stat = fs.statSync(videoPath);
    const range = req.headers.get('range');
  let start = 0;
  let end = stat.size - 1;
  let status = 200;
  const headers: Record<string, string> = {
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
    const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;
    return new NextResponse(webStream as unknown as BodyInit, { status, headers });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new NextResponse(message, { status: 500 });
  }
}
