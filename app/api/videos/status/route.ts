import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, videoId } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const response = await fetch(`https://api.openai.com/v1/videos/${videoId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn('OpenAI API error:', {
        status: response.status,
        error: data.error?.message || data.error || 'Unknown error'
      });
      
      // For 5xx server errors, return success with retry flag instead of throwing
      // This allows polling to continue gracefully
      if (response.status >= 500) {
        return NextResponse.json({
          id: videoId,
          status: 'in_progress',
          retry: true,
          tempError: data.error?.message || 'Temporary server error, retrying...'
        });
      }
      
      // For 4xx client errors, throw to stop polling
      throw new Error(data.error?.message || 'Failed to retrieve video status');
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error retrieving video status:', error);
    
    // Check if it's a network error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return NextResponse.json({
        error: 'Network error. Please check your connection.',
        retriable: true
      }, { status: 503 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve video status' },
      { status: 500 }
    );
  }
}
