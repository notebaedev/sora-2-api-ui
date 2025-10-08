import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, videoId, prompt } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Remix prompt is required' }, { status: 400 });
    }

    // Make direct API call to OpenAI remix endpoint
    const response = await fetch(`https://api.openai.com/v1/videos/${videoId}/remix`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API error:', {
        status: response.status,
        error: data.error?.message || data.error || 'Unknown error'
      });
      
      const errorMessage = data.error?.message || data.error || 'Failed to remix video';
      throw new Error(errorMessage);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error remixing video:', error);
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to remix video';
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'Network error. Please check your connection.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: error.status || 500 }
    );
  }
}
