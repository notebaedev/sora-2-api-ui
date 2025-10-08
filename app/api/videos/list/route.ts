import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, limit, after } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (after) params.append('after', after);

    const url = `https://api.openai.com/v1/videos${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to list videos');
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error listing videos:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list videos' },
      { status: 500 }
    );
  }
}
