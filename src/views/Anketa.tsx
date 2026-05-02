'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ContactSection } from '@/components/form/ContactSection';
import { DSGVOCheckbox } from '@/components/form/DSGVOCheckbox';
import { MarkdownPreview } from '@/components/form/MarkdownPreview';
import { SectionCard } from '@/components/form/SectionCard';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getQuestionnaire,
  getQuestionnaireTitle,
  QuestionnaireType,
} from '@/lib/questionnaire-data';
import {
  FormData as QuestionnaireFormValues,
  FormAdditionalData,
  ContactData,
  FormErrors,
  validateForm,
  generateMarkdown,
  saveFormData,
  loadFormData,
  clearFormData,
  getSubmittedQuestionnaireById,
} from '@/lib/form-utils';
import { getQuestionnaires, getSessionToken, type QuestionnaireListItem } from '@/lib/api-client';
import { Eye, Send, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Anketa: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language, t } = useLanguage();

  const type = (searchParams.get('type') as QuestionnaireType) || 'infant';
  const sections = useMemo(() => getQuestionnaire(type), [type]);
  const title = getQuestionnaireTitle(type, language);

  const [formData, setFormData] = useState<QuestionnaireFormValues>({});
  const [additionalData, setAdditionalData] = useState<FormAdditionalData>({});
  const [contactData, setContactData] = useState<ContactData>({
    telegram: '',
    phone: '',
    phoneCountryCode: 'DE',
    whatsapp: '',
    viber: '',
    instagram: '',
    vk: '',
  });
  const [dsgvoAccepted, setDsgvoAccepted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingQuestionnaireId, setEditingQuestionnaireId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [medicalDocumentFiles, setMedicalDocumentFiles] = useState<File[]>([]);

  // Load saved form data on mount or load questionnaire for editing
  useEffect(() => {
    const editId = searchParams.get('editId');
    
    if (editId) {
      // Load questionnaire for editing - need to get from Supabase via API
      const loadQuestionnaireForEdit = async () => {
        const sessionToken = getSessionToken();
        if (!sessionToken) {
          toast.error(language === 'ru' 
            ? 'Для редактирования необходимо войти. Перейдите на страницу "Мои анкеты" и войдите.' 
            : language === 'de'
            ? 'Zum Bearbeiten müssen Sie sich anmelden. Gehen Sie zur Seite "Meine Fragebögen" und melden Sie sich an.'
            : 'To edit, you need to sign in. Go to "My Questionnaires" page and sign in.');
          router.push(`/data-request?lang=${language}`);
          return;
        }

        // Load questionnaires from API
        const result = await getQuestionnaires();
        if (result.success && result.data) {
          const questionnaire = result.data.questionnaires.find((q: QuestionnaireListItem) => q.id === editId);
          if (questionnaire) {
            setFormData(questionnaire.formData);
            setAdditionalData(questionnaire.additionalData);
            setContactData(questionnaire.contactData);
            setDsgvoAccepted(true);
            setEditingQuestionnaireId(editId);
            setIsEditing(true);
          } else {
            // Fallback to localStorage for backward compatibility
            const localQuestionnaire = getSubmittedQuestionnaireById(editId);
            if (localQuestionnaire) {
              setFormData(localQuestionnaire.formData);
              setAdditionalData(localQuestionnaire.additionalData);
              setContactData(localQuestionnaire.contactData);
              setDsgvoAccepted(true);
              setEditingQuestionnaireId(editId);
              setIsEditing(true);
            } else {
              toast.error(language === 'ru' ? 'Анкета не найдена' : language === 'de' ? 'Fragebogen nicht gefunden' : 'Questionnaire not found');
              router.push(`/data-request?lang=${language}`);
            }
          }
        } else {
          // Fallback to localStorage for backward compatibility
          const localQuestionnaire = getSubmittedQuestionnaireById(editId);
          if (localQuestionnaire) {
            setFormData(localQuestionnaire.formData);
            setAdditionalData(localQuestionnaire.additionalData);
            setContactData(localQuestionnaire.contactData);
            setDsgvoAccepted(true);
            setEditingQuestionnaireId(editId);
            setIsEditing(true);
          } else {
            toast.error(language === 'ru' ? 'Анкета не найдена' : language === 'de' ? 'Fragebogen nicht gefunden' : 'Questionnaire not found');
            router.push(`/data-request?lang=${language}`);
          }
        }
      };
      
      loadQuestionnaireForEdit();
    } else {
      const fresh = searchParams.get('fresh') === '1';
      if (fresh) {
        clearFormData(type, language);
        setFormData({});
        setAdditionalData({});
        setContactData({
          telegram: '',
          phone: '',
          phoneCountryCode: 'DE',
          whatsapp: '',
          viber: '',
          instagram: '',
          vk: '',
        });
        setDsgvoAccepted(false);
        setMedicalDocumentFiles([]);
        setErrors({});
        const p = new URLSearchParams(searchParams.toString());
        p.delete('fresh');
        const qs = p.toString();
        router.replace(qs ? `/anketa?${qs}` : `/anketa`);
        return;
      }

      // Load saved form data
      const saved = loadFormData(type, language);
      if (saved) {
        setFormData(saved.formData);
        setAdditionalData(saved.additionalData);
        setContactData({
          ...saved.contactData,
          phoneCountryCode: saved.contactData.phoneCountryCode || 'DE', // Default to DE if not set
        });
      }
    }
  }, [type, language, searchParams, router]);

  // Scroll to top when questionnaire type changes or page loads
  useEffect(() => {
    // Scroll to top immediately when component mounts or type changes
    // Use both immediate scroll and delayed scroll to ensure it works on all devices
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Also scroll after a short delay to handle cases where content loads asynchronously
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);
    
    // Also use requestAnimationFrame to ensure it happens after render
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    
    return () => clearTimeout(timeoutId);
  }, [type]);

  // Auto-save form data with debounce
  useEffect(() => {
    // Skip auto-save if editing (to avoid overwriting)
    if (isEditing) return;
    
    const timeout = setTimeout(() => {
      try {
        saveFormData(type, language, formData, additionalData, contactData);
      } catch (err) {
        // Silently fail - localStorage might be full or disabled
        console.warn('Auto-save failed:', err);
      }
    }, 1500); // Increased debounce to reduce localStorage writes
    return () => clearTimeout(timeout);
  }, [formData, additionalData, contactData, type, language, isEditing]);

  // Helper function to clear additional field
  const clearAdditionalField = useCallback((fieldKey: string) => {
    setErrors((prev) => {
      if (!prev[fieldKey]) return prev;
      const newErrors = { ...prev };
      delete newErrors[fieldKey];
      return newErrors;
    });
    setAdditionalData((prev) => {
      if (!prev[fieldKey]) return prev;
      const newData = { ...prev };
      delete newData[fieldKey];
      return newData;
    });
  }, []);

  const handleFieldChange = useCallback((questionId: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [questionId]: value }));
    
    // Clear error when user starts typing
    if (errors[questionId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }

    // Handle conditional field clearing based on question type
    const valueArray = Array.isArray(value) ? value : [value];
    const firstValue = valueArray[0];

    switch (questionId) {
      case 'operations':
        if (firstValue !== 'yes') {
          clearAdditionalField('operations_additional');
        }
        break;
      case 'pregnancy_problems':
        if (firstValue === 'no') {
          clearAdditionalField('pregnancy_problems_additional');
        }
        break;
      case 'injuries':
        if (!valueArray.some((v: string) => v !== 'no_issues')) {
          clearAdditionalField('injuries_additional');
        }
        break;
      case 'allergies':
        if (!valueArray.includes('other')) {
          clearAdditionalField('allergies_additional');
        }
        break;
      case 'illness_antibiotics':
        if (!valueArray.some((v: string) => ['took_antibiotics', 'took_medications', 'both'].includes(v))) {
          clearAdditionalField('illness_antibiotics_additional');
        }
        break;
      case 'skin_condition':
        if (!valueArray.includes('other')) {
          clearAdditionalField('skin_condition_additional');
        }
        break;
      case 'sleep':
        if (firstValue !== 'other') {
          clearAdditionalField('sleep_additional');
        }
        break;
      case 'has_medical_documents':
        if (firstValue !== 'yes') {
          setMedicalDocumentFiles([]);
        }
        break;
      case 'weight_satisfaction':
        if (firstValue !== 'not_satisfied') {
          // Clear weight_goal and its additional field if user is satisfied with weight
          setFormData((prev) => {
            const newData = { ...prev };
            delete newData['weight_goal'];
            return newData;
          });
          clearAdditionalField('weight_goal_additional');
        }
        break;
      case 'weight_goal':
        if (firstValue !== 'lose' && firstValue !== 'gain') {
          clearAdditionalField('weight_goal_additional');
        }
        break;
      case 'had_covid':
        if (firstValue !== 'yes') {
          // Clear covid_times if user didn't have COVID
          setFormData((prev) => {
            const newData = { ...prev };
            delete newData['covid_times'];
            delete newData['covid_complications'];
            return newData;
          });
          // Clear covid_complications additional field
          clearAdditionalField('covid_complications_additional');
        }
        break;
      case 'had_vaccine':
        if (firstValue !== 'yes') {
          // Clear vaccine_doses if user didn't have vaccine
          setFormData((prev) => {
            const newData = { ...prev };
            delete newData['vaccine_doses'];
            return newData;
          });
        }
        break;
      case 'covid_complications':
        if (!valueArray.includes('other')) {
          clearAdditionalField('covid_complications_additional');
        }
        break;
      case 'hair_quality':
        if (!valueArray.includes('other')) {
          clearAdditionalField('hair_quality_additional');
        }
        break;
      case 'teeth_problems':
        if (!valueArray.includes('other')) {
          clearAdditionalField('teeth_problems_additional');
        }
        break;
      case 'stones_kidneys_gallbladder':
        if (!valueArray.includes('stones_kidneys') && !valueArray.includes('stones_gallbladder')) {
          clearAdditionalField('stones_kidneys_gallbladder_additional');
        }
        break;
      case 'regular_medications': {
        const regularMedicationsValue = typeof value === 'string' ? value : (Array.isArray(value) ? value[0] : '');
        if (regularMedicationsValue !== 'yes') {
          clearAdditionalField('regular_medications_additional');
        }
        break;
      }
      case 'digestion_detailed':
      case 'headaches_detailed':
      case 'varicose_hemorrhoids_pigment':
      case 'joints_detailed':
      case 'cysts_polyps_tumors':
      case 'herpes_warts_discharge':
      case 'menstruation_detailed':
      case 'prostatitis':
      case 'skin_problems_detailed':
      case 'lifestyle':
      case 'chronic_diseases':
      case 'sleep_problems':
      case 'energy_morning':
      case 'memory_concentration':
      case 'operations_traumas':
        if (!valueArray.includes('other')) {
          clearAdditionalField(`${questionId}_additional`);
        }
        if (!valueArray.includes('organ_removed')) {
          clearAdditionalField('operations_traumas_organs_additional');
        }
        break;
    }
  }, [errors, clearAdditionalField]);

  const handleAdditionalChange = useCallback((questionId: string, value: string) => {
    setAdditionalData((prev) => ({ ...prev, [`${questionId}_additional`]: value }));
    // Clear error when user starts typing in additional field
    const additionalKey = `${questionId}_additional`;
    if (errors[additionalKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[additionalKey];
        return newErrors;
      });
    }
  }, [errors]);

  const handleClearForm = useCallback(() => {
    setFormData({});
    setAdditionalData({});
    setContactData({
      telegram: '',
      phone: '',
      phoneCountryCode: 'DE',
      whatsapp: '',
      viber: '',
      instagram: '',
      vk: '',
    });
    setDsgvoAccepted(false);
    setErrors({});
    setMedicalDocumentFiles([]);
    clearFormData(type, language);
    toast.success(language === 'ru' ? 'Форма очищена' : language === 'de' ? 'Formular gelöscht' : 'Form cleared');
  }, [type, language]);

  const markdown = useMemo(() => {
    let md = generateMarkdown(type, sections, formData, additionalData, contactData, language);
    
    // Helper function to escape HTML special characters
    const escapeHtml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    // Add file information if files are uploaded
    if (medicalDocumentFiles.length > 0 && formData['has_medical_documents'] === 'yes') {
      if (medicalDocumentFiles.length === 1) {
        const fileName = escapeHtml(medicalDocumentFiles[0].name);
        const fileSize = (medicalDocumentFiles[0].size / 1024 / 1024).toFixed(2);
        const fileInfo = language === 'ru'
          ? `\n<b>Прикреплён файл:</b> ${fileName} (${fileSize} MB)`
          : language === 'de'
          ? `\n<b>Angehängte Datei:</b> ${fileName} (${fileSize} MB)`
          : `\n<b>Attached file:</b> ${fileName} (${fileSize} MB)`;
        md += fileInfo;
      } else {
        const filesList = medicalDocumentFiles.map((file, index) => 
          `${index + 1}. ${escapeHtml(file.name)} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
        ).join('\n');
        const fileInfo = language === 'ru'
          ? `\n<b>Прикреплено файлов:</b> ${medicalDocumentFiles.length}\n${filesList}`
          : language === 'de'
          ? `\n<b>Angehängte Dateien:</b> ${medicalDocumentFiles.length}\n${filesList}`
          : `\n<b>Attached files:</b> ${medicalDocumentFiles.length}\n${filesList}`;
        md += fileInfo;
      }
    }
    
    return md;
  }, [type, sections, formData, additionalData, contactData, language, medicalDocumentFiles]);

  const scrollToTopMostError = useCallback((validationErrors: FormErrors) => {
    const firstErrorKey = Object.keys(validationErrors)[0];
    const candidates: HTMLElement[] = [];

    if (firstErrorKey === 'contact_method') {
      const contactSection = document.querySelector('[data-section="contact"]');
      if (contactSection) candidates.push(contactSection as HTMLElement);
    } else if (firstErrorKey === 'dsgvo') {
      const dsgvoSection = document.querySelector('[data-section="dsgvo"]');
      if (dsgvoSection) candidates.push(dsgvoSection as HTMLElement);
    } else {
      const questionElement = document.querySelector(`[data-question-id="${firstErrorKey}"]`);
      if (questionElement) candidates.push(questionElement as HTMLElement);
    }

    const allErrorElements = Array.from(document.querySelectorAll('[data-error="true"]')) as HTMLElement[];
    candidates.push(...allErrorElements);

    if (candidates.length === 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const topMost = candidates
      .filter((el) => el.offsetParent !== null)
      .sort((a, b) => {
        const topA = a.getBoundingClientRect().top + window.scrollY;
        const topB = b.getBoundingClientRect().top + window.scrollY;
        return topA - topB;
      })[0];

    topMost.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = topMost.querySelector('input, textarea, select, button') as HTMLElement | null;
    if (focusable) {
      setTimeout(() => focusable.focus(), 250);
    }
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(sections, formData, contactData, language, additionalData);
    if (!dsgvoAccepted) {
      validationErrors['dsgvo'] = language === 'ru'
        ? 'Подтвердите согласие на обработку персональных данных'
        : language === 'de'
          ? 'Bitte bestätigen Sie die Einwilligung zur Datenverarbeitung'
          : 'Please confirm consent to personal data processing';
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      toast.error(t('required'));
      setTimeout(() => scrollToTopMostError(validationErrors), 0);
      return;
    }

    setIsSubmitting(true);

    try {
      const honeypot =
        typeof document !== 'undefined'
          ? (document.getElementById('website-honeypot') as HTMLInputElement | null)?.value || ''
          : '';

      const metadata = {
        questionnaireType: type,
        language,
        consentAccepted: true,
        formData,
        additionalData,
        contactData,
        website: honeypot,
        turnstileToken: undefined as string | undefined,
      };

      const hasFiles =
        medicalDocumentFiles.length > 0 && formData['has_medical_documents'] === 'yes';

      let res: Response;
      if (hasFiles) {
        const fd = new FormData();
        fd.append('metadata', JSON.stringify(metadata));
        medicalDocumentFiles.forEach((file) => fd.append('files', file));
        res = await fetch('/api/submissions', { method: 'POST', body: fd });
      } else {
        res = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metadata),
        });
      }

      let payload: { error?: string; fields?: FormErrors; retryAfterSec?: number; warning?: string } =
        {};
      try {
        payload = await res.json();
      } catch {
        /* ignore */
      }

      if (res.status === 429) {
        toast.error(
          language === 'ru'
            ? 'Слишком много отправок. Попробуйте позже.'
            : language === 'de'
              ? 'Zu viele Übermittlungen. Bitte später erneut versuchen.'
              : 'Too many submissions. Please try again later.'
        );
        return;
      }

      if (!res.ok) {
        if (payload.fields && typeof payload.fields === 'object') {
          setErrors(payload.fields);
        }
        const msg =
          payload.error ||
          (language === 'ru'
            ? 'Не удалось отправить анкету'
            : language === 'de'
              ? 'Fragebogen konnte nicht gesendet werden'
              : 'Could not submit questionnaire');
        toast.error(msg, { duration: 6000 });
        return;
      }

      toast.success(
        language === 'ru'
          ? 'Анкета успешно отправлена! Мы свяжемся с вами в течение 48 часов.'
          : language === 'de'
            ? 'Fragebogen erfolgreich gesendet! Wir werden uns innerhalb von 48 Stunden bei Ihnen melden.'
            : 'Questionnaire successfully sent! We will contact you within 48 hours.'
      );
      if (typeof payload.warning === 'string' && payload.warning.trim()) {
        toast.warning(payload.warning, { duration: 9000 });
      }
      router.push(`/success?lang=${language}&type=${encodeURIComponent(type)}`);
    } catch (error: unknown) {
      console.error('Submit error:', error);
      const errorMsg =
        error instanceof Error ? error.message : t('submitError');
      toast.error(errorMsg, {
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-medical-50">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-medical-900 text-center mb-6">
          {isEditing 
            ? (language === 'ru' ? 'Редактирование анкеты' : language === 'de' ? 'Fragebogen bearbeiten' : 'Edit Questionnaire')
            : title}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6 relative">
          <div
            className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
            aria-hidden
          >
            <label htmlFor="website-honeypot">Website</label>
            <input id="website-honeypot" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          {/* Render all sections */}
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              formData={formData}
              additionalData={additionalData}
              errors={errors}
              onFieldChange={handleFieldChange}
              onAdditionalChange={handleAdditionalChange}
              language={language}
              onFileChange={section.questions.some(q => q.id === 'has_medical_documents') ? setMedicalDocumentFiles : undefined}
              files={medicalDocumentFiles}
            />
          ))}

          {/* Contact Section */}
          <ContactSection
            value={contactData}
            errors={{
              phone: errors['phone'],
              telegram: errors['telegram'],
              whatsapp: errors['whatsapp'],
              viber: errors['viber'],
              instagram: errors['instagram'],
              vk: errors['vk'],
              contact_method: errors['contact_method'],
            }}
            onChange={(patch) => {
              setContactData((prev) => ({ ...prev, ...patch }));
              setErrors((prev) => {
                const next = { ...prev };
                const keys = Object.keys(patch) as (keyof ContactData)[];
                for (const key of keys) {
                  if (key === 'phone' || key === 'phoneCountryCode' || key === 'customDialCode') {
                    delete next.phone;
                  }
                  if (key === 'telegram') delete next.telegram;
                  if (key === 'whatsapp') delete next.whatsapp;
                  if (key === 'viber') delete next.viber;
                  if (key === 'instagram') delete next.instagram;
                  if (key === 'vk') delete next.vk;
                  if (
                    key === 'telegram' ||
                    key === 'whatsapp' ||
                    key === 'viber' ||
                    key === 'instagram' ||
                    key === 'vk'
                  ) {
                    delete next.contact_method;
                  }
                }
                return next;
              });
            }}
          />

          {/* DSGVO Checkbox */}
          <DSGVOCheckbox
            checked={dsgvoAccepted}
            onChange={(checked) => {
              setDsgvoAccepted(checked);
              if (checked && errors['dsgvo']) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.dsgvo;
                  return next;
                });
              }
            }}
            error={errors['dsgvo']}
          />

          <p className="text-sm text-medical-700 bg-white border border-medical-200 rounded-lg p-4 leading-relaxed">
            {language === 'ru'
              ? 'Эта информация не является медицинской консультацией и не заменяет очную консультацию с врачом.'
              : language === 'de'
                ? 'Diese Informationen sind keine medizinische Beratung und ersetzen keine ärztliche Konsultation.'
                : 'This information is not medical advice and does not replace consultation with a doctor.'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="btn-secondary flex items-center justify-center gap-2 flex-1"
            >
              <Eye className="w-5 h-5" />
              {t('previewMarkdown')}
            </button>

            <button
              type="button"
              onClick={handleClearForm}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              {t('clearForm')}
            </button>
          </div>

          {/* Submit Button - Sticky on mobile */}
          <div className="sticky bottom-4 z-10 md:static md:z-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg shadow-lg md:shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('submitting')}
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {isEditing 
                  ? (language === 'ru' ? 'Сохранить изменения' : language === 'de' ? 'Änderungen speichern' : 'Save Changes')
                  : t('submit')}
              </>
            )}
            </button>
          </div>
        </form>

        {/* Markdown Preview Modal */}
        {showPreview && (
          <MarkdownPreview markdown={markdown} onClose={() => setShowPreview(false)} />
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Anketa;
