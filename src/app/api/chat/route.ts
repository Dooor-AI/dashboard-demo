import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId } = body as { message: string; sessionId?: string };

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let session;
    if (sessionId) {
      session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
    } else {
      const titlePreview = message.trim().slice(0, 50);
      session = await prisma.chatSession.create({
        data: {
          title: titlePreview.length < message.trim().length ? `${titlePreview}...` : titlePreview,
        },
      });
    }

    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message.trim(),
      },
    });

    let assistantContent: string;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      assistantContent =
        'AI chat is not configured. Set the GEMINI_API_KEY environment variable to enable AI responses.';
    } else {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const existingMessages = await prisma.chatMessage.findMany({
          where: { sessionId: session.id, id: { not: userMessage.id } },
          orderBy: { createdAt: 'asc' },
        });

        const history = existingMessages.map((m) => ({
          role: m.role === 'user' ? 'user' as const : 'model' as const,
          parts: [{ text: m.content }],
        }));

        const chat = model.startChat({
          history,
          systemInstruction: {
            role: 'user',
            parts: [{ text: 'You are a helpful AI assistant integrated into Dooor OS, an enterprise PaaS platform for AI governance and deployment. Be concise, technical, and professional.' }],
          },
        });

        const result = await chat.sendMessage(message.trim());
        assistantContent = result.response.text() || 'I could not generate a response. Please try again.';
      } catch (aiError) {
        console.error('Gemini API error:', aiError);
        assistantContent =
          'There was an error communicating with the AI service. Please check your API key and try again.';
      }
    }

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: assistantContent,
      },
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      sessionId: session.id,
      message: assistantContent,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
