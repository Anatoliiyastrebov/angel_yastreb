import 'server-only';

import type { Language } from '@/lib/translations';
import type { QuestionnaireType } from '@/lib/questionnaire-data';
import { getQuestionnaire } from '@/lib/questionnaire-data';
import type { ContactData, FormAdditionalData, FormData } from '@/lib/form-utils';
import { validateForm } from '@/lib/form-utils';
import { buildInternationalPhone } from '@/lib/phone-format';
import { countryCodes } from '@/lib/country-codes';

export type SubmissionPayload = {
  questionnaireType: QuestionnaireType;
  language: Language;
  consentAccepted: boolean;
  formData: FormData;
  additionalData: FormAdditionalData;
  contactData: ContactData;
};

export function validateSubmissionPayload(payload: SubmissionPayload): {
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!payload.consentAccepted) {
    errors.consent =
      payload.language === 'ru'
        ? 'Подтвердите согласие на обработку данных'
        : payload.language === 'de'
          ? 'Bitte stimmen Sie der Datenverarbeitung zu'
          : 'Please confirm consent to data processing';
  }

  const sections = getQuestionnaire(payload.questionnaireType);
  Object.assign(
    errors,
    validateForm(
      sections,
      payload.formData,
      payload.contactData,
      payload.language,
      payload.additionalData
    )
  );

  return { errors };
}

export function buildDisplayName(formData: FormData): string {
  const first = String(formData.name ?? '').trim();
  const last = String(formData.last_name ?? '').trim();
  const combined = `${first} ${last}`.trim();
  return combined || first || last || 'Unknown';
}

export function normalizePhone(contact: ContactData): string {
  const raw = contact.phone?.trim() ?? '';
  if (!raw) return '';
  const countryCode = contact.phoneCountryCode || 'DE';
  let dialCode: string;
  if (countryCode === 'CUSTOM' && contact.customDialCode) {
    dialCode = contact.customDialCode.startsWith('+')
      ? contact.customDialCode
      : `+${contact.customDialCode}`;
  } else {
    const country = countryCodes.find((c) => c.code === countryCode);
    dialCode = country?.dialCode || '+49';
  }
  return buildInternationalPhone(dialCode, raw).slice(0, 40);
}
