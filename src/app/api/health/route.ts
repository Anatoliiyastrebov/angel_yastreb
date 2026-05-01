import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Дымовый тест деплоя: должен вернуть JSON с `"stack":"next"`.
 * Если браузер или curl показывают HTML с `<div id="root">`, домен всё ещё указывает на старый статический Vite-сборщик, а не на этот Next-проект.
 */
export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return NextResponse.json(
    {
      ok: true,
      stack: 'next',
      router: 'app',
      ...(sha ? { commit: sha.slice(0, 7) } : {}),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
