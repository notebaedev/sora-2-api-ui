import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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

    const openai = new OpenAI({ apiKey });

    const requestBody: any = {
      model,
      prompt,
      size,
      seconds,
    };

    // Handle input reference image
    if (inputReference) {
      const buffer = await inputReference.arrayBuffer();
      const file = new File([buffer], inputReference.name, { type: inputReference.type });
      requestBody.input_reference = file;
    }

    const video = await openai.videos.create(requestBody);

    return NextResponse.json(video);
  } catch (error: any) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create video' },
      { status: 500 }
    );
  }
}
