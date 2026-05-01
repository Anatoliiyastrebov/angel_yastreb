import { NextRequest, NextResponse } from 'next/server';

import { sendOtpFlow } from '@/lib/server/send-otp-flow';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await sendOtpFlow(body);
  return NextResponse.json(result.body, { status: result.status });
}
