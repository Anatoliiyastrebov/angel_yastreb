import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PRIVACY_SECTIONS } from '@/lib/legal/privacy-policy-content';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ShieldCheck } from 'lucide-react';

interface PrivacyPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PrivacyPolicyDialog: React.FC<PrivacyPolicyDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { language } = useLanguage();
  const sections = PRIVACY_SECTIONS[language];
  const title =
    language === 'ru'
      ? 'Политика конфиденциальности'
      : language === 'de'
        ? 'Datenschutzerklärung'
        : 'Privacy Policy';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {language === 'ru'
              ? 'Информация о сборе и обработке персональных данных'
              : language === 'de'
                ? 'Informationen zur Erhebung und Verarbeitung personenbezogener Daten'
                : 'Information about collection and processing of personal data'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {sections.map((section, index) => (
            <div key={index} className="space-y-2">
              <h3 className="font-semibold text-foreground text-base">{section.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
