import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    // Try to read from public directory first
    const filePath = join(process.cwd(), 'public', '.well-known', 'apple-developer-domain-association.txt');
    const content = await readFile(filePath, 'utf-8');

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch {
    // Return placeholder if file not found
    // User needs to download the actual file from Apple Developer Console
    return new NextResponse(
      'Apple domain verification file not configured. Please download from Apple Developer Console.',
      { status: 404 }
    );
  }
}
