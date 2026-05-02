import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, Copy, Check } from 'lucide-react';

interface MarkdownPreviewProps {
  markdown: string;
  onClose: () => void;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown, onClose }) => {
  const { t } = useLanguage();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-medical-900/20 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col border border-medical-200">
        <div className="flex items-center justify-between p-4 border-b border-medical-200">
          <h3 className="font-semibold text-lg text-medical-800">{t('previewMarkdown')}</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-medical-100 flex items-center justify-center hover:bg-medical-200 transition-colors duration-200 min-h-[44px] min-w-[44px]"
          >
            <X className="w-5 h-5 text-medical-700" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {/* Сообщение для Telegram в HTML-режиме (<b>, <i>); в предпросмотре рендерим теги, копирование — сырая строка */}
          <div
            className="telegram-html-preview whitespace-pre-wrap text-sm bg-medical-50 rounded-lg p-4 text-medical-700 border border-medical-200 [&_b]:font-semibold [&_i]:italic [&_a]:text-primary-700 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary-900 [&_a]:break-all sm:[&_a]:break-normal"
            dangerouslySetInnerHTML={{ __html: markdown }}
          />
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-medical-200">
          <button onClick={handleCopy} className="btn-secondary flex items-center gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={onClose} className="btn-primary">
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
