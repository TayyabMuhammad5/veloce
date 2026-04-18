
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { processBriefAI } from '@/lib/ai-pipeline';

export async function POST(req: Request) {
  try {
    // 1. Get the raw text body 
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature');
    const secret = process.env.WEBHOOK_SECRET;

    if (!secret) {
      console.error("WEBHOOK_SECRET is not set in environment variables.");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing x-webhook-signature header' }, { status: 401 });
    }

    // 2. Verify the HMAC Signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn("Webhook rejected: Invalid signature.");
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Parse and Validate the Payload
    const payload = JSON.parse(rawBody);
    const { title, description, budget, urgency, contactInfo } = payload;

    if (!title || !description || !budget || !urgency || !contactInfo) {
      return NextResponse.json({ error: 'Missing required fields in payload' }, { status: 400 });
    }

    // 4. Save to the Database 
    const brief = await prisma.brief.create({
      data: {
        title,
        description,
        budget,
        urgency,
        contactInfo,
        status: 'NEW',
      }
    });

    // 5. Trigger the AI Pipeline asynchronously
    processBriefAI(brief.id, description);

    // 6. Return success immediately
    return NextResponse.json({ success: true, briefId: brief.id }, { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}