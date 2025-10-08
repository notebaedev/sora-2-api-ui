import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const apiKey = formData.get('apiKey') as string;
    const prompt = formData.get('prompt') as string;
    const model = formData.get('model') as string;
    const size = formData.get('size') as string;
    const seconds = formData.get('seconds') as string;
    const inputReference = formData.get('inputReference') as File | null;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Prepare the form data for the OpenAI API
    const apiFormData = new FormData();
    apiFormData.append('prompt', prompt);
    apiFormData.append('model', model);
    apiFormData.append('size', size);
    apiFormData.append('seconds', seconds);

    // Handle input reference image
    if (inputReference) {
      apiFormData.append('input_reference', inputReference);
    }

    // Make direct API call to OpenAI
    const response = await fetch('https://api.openai.com/v1/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: apiFormData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to create video');
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create video' },
      { status: 500 }
    );
  }
}
