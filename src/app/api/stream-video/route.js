import { NextResponse } from 'next/server';
import fs from 'fs';
import { Readable } from 'stream';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    // 1. Get video filename from query string
    const url = req.nextUrl.searchParams.get('file');
    if (!url) {
      return new NextResponse('Missing file parameter', { status: 400 });
    }

    // 2. Build full path to video file
    const videoPath = `${process.cwd()}/videos/${url}`;
    if (!fs.existsSync(videoPath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    // 3. Get file stats (size, etc.)
    const stat = fs.statSync(videoPath);

    // 4. Handle HTTP Range requests for streaming/seek
    const range = req.headers.get('range');
    let start = 0;
    let end = stat.size - 1;
    let status = 200;
    const headers = {
      'Content-Type': 'video/mp4',
      'Content-Length': String(stat.size),
    };
    if (range) {
      // Parse range header (e.g. bytes=0-1023)
      const match = range.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        start = parseInt(match[1], 10);
        if (match[2]) end = parseInt(match[2], 10);
        status = 206; // Partial content
        headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
        headers['Accept-Ranges'] = 'bytes';
        headers['Content-Length'] = String(end - start + 1);
      }
    }

    // 5. Create readable stream for requested range
    const stream = fs.createReadStream(videoPath, { start, end });
    const webStream = Readable.toWeb(stream);

    // 6. Return video stream response
    return new NextResponse(webStream, { status, headers });
  } catch (e) {
    // 7. Error handling: return error message
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new NextResponse(message, { status: 500 });
  }
}
