/** MIME и тип предпросмотра по имени файла (метаданные вложения в submissions.answers.attachments). */

export function guessMimeFromFilename(filename: string): string {
  const lower = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    docx:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
  };
  return map[lower] ?? 'application/octet-stream';
}

export type AttachmentPreviewKind = 'pdf' | 'image' | 'docx' | 'none';

export function attachmentPreviewKind(filename: string): AttachmentPreviewKind {
  const mime = guessMimeFromFilename(filename);
  if (mime === 'application/pdf') return 'pdf';
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (mime.startsWith('image/')) return 'image';
  return 'none';
}
