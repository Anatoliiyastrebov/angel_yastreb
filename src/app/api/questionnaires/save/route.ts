import { NextRequest, NextResponse } from 'next/server';

import { saveLegacyQuestionnaire } from '@/lib/server/save-legacy-questionnaire';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await saveLegacyQuestionnaire(body);
  return NextResponse.json(result.body, { status: result.status });
}
