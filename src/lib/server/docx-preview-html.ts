import 'server-only';

import mammoth from 'mammoth';
import sanitizeHtml from 'sanitize-html';

/** DOCX → одна HTML-страница для iframe (без внешних скриптов). */
export async function docxBlobToSafeHtmlPage(blob: Blob): Promise<string> {
  const buf = Buffer.from(await blob.arrayBuffer());
  const { value: raw } = await mammoth.convertToHtml({ buffer: buf });

  const safe = sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img',
      'h1',
      'h2',
      'h3',
      'h4',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'colgroup',
      'col',
      'hr',
      'sup',
      'sub',
      'figure',
      'figcaption',
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      a: ['href', 'name', 'target', 'rel'],
    },
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgba?\(/],
        'background-color': [/^#[0-9a-fA-F]{3,8}$/, /^rgba?\(/],
        'text-align': [/^left|right|center|justify$/],
        'font-weight': [/^\d+$/, /^bold|normal|bolder|lighter$/],
        'font-size': [/^\d+(?:px|pt|em|rem|%)$/],
        width: [/^\d+(?:px|%|em)$/],
        'vertical-align': [/^top|middle|bottom|baseline$/],
        'border-collapse': [/^collapse|separate$/],
      },
      table: {
        width: [/^\d+(?:px|%)$/],
      },
      td: {
        width: [/^\d+(?:px|%)$/],
        padding: [/^\d+(?:px|em|pt)$/],
      },
      th: {
        width: [/^\d+(?:px|%)$/],
        padding: [/^\d+(?:px|em|pt)$/],
      },
    },
  });

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.5;padding:16px;margin:0;color:#1a1a1a;}
    table{border-collapse:collapse;margin:0.5em 0;}
    td,th{border:1px solid #ccc;padding:6px 8px;vertical-align:top;}
    img{max-width:100%;height:auto;}
  </style></head><body>${safe}</body></html>`;
}
