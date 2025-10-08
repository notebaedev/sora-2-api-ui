import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, videoId, variant } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Build URL with variant query parameter if provided
    const url = variant 
      ? `https://api.openai.com/v1/videos/${videoId}/content?variant=${variant}`
      : `https://api.openai.com/v1/videos/${videoId}/content`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || 'Failed to download video');
    }

    // Get the binary content
    const arrayBuffer = await response.arrayBuffer();
    
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
