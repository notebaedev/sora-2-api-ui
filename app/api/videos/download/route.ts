import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, videoId, variant } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });
    
    // Download the content
    const content = await openai.videos.downloadContent(videoId, { variant });
    const arrayBuffer = await content.arrayBuffer();
    
    // Convert to base64 for easy transfer
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Determine content type based on variant
    let contentType = 'video/mp4';
    if (variant === 'thumbnail') {
      contentType = 'image/webp';
    } else if (variant === 'spritesheet') {
      contentType = 'image/jpeg';
    }

    return NextResponse.json({ 
      data: base64,
      contentType 
    });
  } catch (error: any) {
    console.error('Error downloading video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download video' },
      { status: 500 }
    );
  }
}
