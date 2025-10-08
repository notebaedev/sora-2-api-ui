import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, limit, after } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });
    const params: any = {};
    
    if (limit) params.limit = limit;
    if (after) params.after = after;

    const videos = await openai.videos.list(params);

    return NextResponse.json(videos);
  } catch (error: any) {
    console.error('Error listing videos:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list videos' },
      { status: 500 }
    );
  }
}
