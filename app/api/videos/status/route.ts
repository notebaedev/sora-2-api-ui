import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, videoId } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });
    const video = await openai.videos.retrieve(videoId);

    return NextResponse.json(video);
  } catch (error: any) {
    console.error('Error retrieving video status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve video status' },
      { status: 500 }
    );
  }
}
