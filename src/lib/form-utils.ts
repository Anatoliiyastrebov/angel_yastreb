import { QuestionnaireSection, QuestionnaireType } from './questionnaire-data';
import { Language, translations } from './translations';
import { countryCodes } from './country-codes';
import { buildInternationalPhone, normalizeNationalSubscriberDigits } from './phone-format';

function readPublicEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] as string;
  }
  return undefined;
}

export interface FormData {
  [key: string]: string | string[];
}

export interface FormAdditionalData {
  [key: string]: string;
}

export interface ContactData {
  telegram?: string;
  phone?: string;
  phoneCountryCode?: string; // Country code (e.g., 'DE', 'RU') or 'CUSTOM'
  customDialCode?: string; // User-entered dial code when country not in list
  email?: string; // Kept for backward compatibility with saved data
  whatsapp?: string;
  viber?: string;
  instagram?: string;
  vk?: string;
}

export interface SubmittedQuestionnaire {
  id: string;
  type: QuestionnaireType;
  formData: FormData;
  additionalData: FormAdditionalData;
  contactData: ContactData;
  markdown: string;
  telegramMessageId?: number;
  submittedAt: number;
  language: Language;
}

export interface FormErrors {
  [key: string]: string;
}

// Storage keys
const getStorageKey = (type: QuestionnaireType, lang: Language) => 
  `health_questionnaire_${type}_${lang}`;

// Save form data to localStorage (optimized with error handling)
export const saveFormData = (
  type: QuestionnaireType,
  lang: Language,
  formData: FormData,
  additionalData: FormAdditionalData,
  contactData: ContactData
) => {
  try {
    const data = { formData, additionalData, contactData, timestamp: Date.now() };
    const key = getStorageKey(type, lang);
    const serialized = JSON.stringify(data);
    // Check localStorage quota before saving
    if (serialized.length > 5 * 1024 * 1024) { // 5MB limit
      console.warn('Form data too large to save');
      return;
    }
    localStorage.setItem(key, serialized);
  } catch (err) {
    // Handle quota exceeded or other errors silently
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded, clearing old data');
      try {
        // Clear old data and retry
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('anketa_') && key !== getStorageKey(type, lang)) {
            localStorage.removeItem(key);
          }
        });
        const data = { formData, additionalData, contactData, timestamp: Date.now() };
        localStorage.setItem(getStorageKey(type, lang), JSON.stringify(data));
      } catch (retryErr) {
        console.error('Error saving form data after cleanup:', retryErr);
      }
    } else {
      console.error('Error saving form data:', err);
    }
  }
};

// Load form data from localStorage
export const loadFormData = (type: QuestionnaireType, lang: Language) => {
  try {
    const stored = localStorage.getItem(getStorageKey(type, lang));
    if (stored) {
      const data = JSON.parse(stored);
      // Only return if data is less than 24 hours old
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        return {
          formData: data.formData as FormData,
          additionalData: data.additionalData as FormAdditionalData,
          contactData: data.contactData as ContactData,
        };
      }
    }
  } catch (err) {
    console.error('Error loading form data:', err);
  }
  return null;
};

// Clear form data from localStorage
export const clearFormData = (type: QuestionnaireType, lang: Language) => {
  try {
    localStorage.removeItem(getStorageKey(type, lang));
  } catch (err) {
    console.error('Error clearing form data:', err);
  }
};

// Validate form
export const validateForm = (
  sections: QuestionnaireSection[],
  formData: FormData,
  contactData: ContactData,
  lang: Language,
  additionalData?: FormAdditionalData
): FormErrors => {
  const errors: FormErrors = {};
  const t = translations[lang];

  sections.forEach((section) => {
    section.questions.forEach((question) => {
      // Skip validation for conditional fields - they are validated separately
      if (question.id === 'covid_times' || question.id === 'vaccine_doses') {
        return;
      }
      
      // Skip validation for covid_complications if had_covid is not 'yes'
      if (question.id === 'covid_complications') {
        const hadCovidValue = formData['had_covid'];
        const hadCovid = typeof hadCovidValue === 'string' ? hadCovidValue : (Array.isArray(hadCovidValue) ? hadCovidValue[0] : '');
        if (hadCovid !== 'yes') {
          return;
        }
      }
      
      if (question.required) {
        const value = formData[question.id];
        
        if (question.type === 'checkbox') {
          if (!value || (Array.isArray(value) && value.length === 0)) {
            errors[question.id] = t.selectAtLeastOne;
          }
        } else if (question.type === 'number') {
          if (!value || value === '' || isNaN(Number(value))) {
            errors[question.id] = t.required;
          } else {
            const numValue = Number(value);
            // Special validation for age_months - must be integer
            if (question.id === 'age_months' && !Number.isInteger(numValue)) {
              const intErrorMsg = lang === 'ru'
                ? 'Возраст в месяцах должен быть целым числом'
                : lang === 'de'
                ? 'Das Alter in Monaten muss eine ganze Zahl sein'
                : 'Age in months must be an integer';
              errors[question.id] = intErrorMsg;
            }
            if (question.min !== undefined && numValue < question.min) {
              const minMsg = lang === 'ru' ? `Минимальное значение: ${question.min}` : lang === 'en' ? `Minimum value: ${question.min}` : `Mindestwert: ${question.min}`;
              errors[question.id] = minMsg;
            }
            if (question.max !== undefined && numValue > question.max) {
              const maxMsg = lang === 'ru' ? `Максимальное значение: ${question.max}` : lang === 'en' ? `Maximum value: ${question.max}` : `Maximalwert: ${question.max}`;
              errors[question.id] = maxMsg;
            }
          }
        } else {
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            errors[question.id] = t.required;
          }
        }
      }
    });
  });

  // Special validation: if operations is "yes", additional field is required
  if (formData['operations'] === 'yes' && additionalData) {
    const operationsAdditional = additionalData['operations_additional'];
    if (!operationsAdditional || operationsAdditional.trim() === '') {
      errors['operations_additional'] = t.required;
    }
  }

  // Special validation: if pregnancy_problems is "yes", additional field is required
  if (formData['pregnancy_problems'] === 'yes' && additionalData) {
    const pregnancyProblemsAdditional = additionalData['pregnancy_problems_additional'];
    if (!pregnancyProblemsAdditional || pregnancyProblemsAdditional.trim() === '') {
      errors['pregnancy_problems_additional'] = t.required;
    }
  }

  // Special validation: if injuries has any option selected except "no_issues", additional field is required
  if (formData['injuries'] && additionalData) {
    const injuriesValue = formData['injuries'];
    const injuriesArray = Array.isArray(injuriesValue) ? injuriesValue : [injuriesValue];
    // Check if any option other than "no_issues" is selected
    const hasOtherThanNoIssues = injuriesArray.some((val: string) => val !== 'no_issues');
    if (hasOtherThanNoIssues) {
      const injuriesAdditional = additionalData['injuries_additional'];
      if (!injuriesAdditional || injuriesAdditional.trim() === '') {
        errors['injuries_additional'] = t.required;
      }
    }
  }

  // Special validation: if allergies has "other" selected, additional field is required
  if (formData['allergies'] && additionalData) {
    const allergiesValue = formData['allergies'];
    const allergiesArray = Array.isArray(allergiesValue) ? allergiesValue : [allergiesValue];
    const hasOther = allergiesArray.includes('other');
    if (hasOther) {
      const allergiesAdditional = additionalData['allergies_additional'];
      if (!allergiesAdditional || allergiesAdditional.trim() === '') {
        errors['allergies_additional'] = t.required;
      }
    }
  }

  // Special validation: if covid_complications includes "other", additional field is required
  // Only validate if had_covid is 'yes'
  if (formData['covid_complications'] && additionalData) {
    const hadCovidValue = formData['had_covid'];
    const hadCovid = typeof hadCovidValue === 'string' ? hadCovidValue : (Array.isArray(hadCovidValue) ? hadCovidValue[0] : '');
    if (hadCovid === 'yes') {
      const covidComplicationsValue = formData['covid_complications'];
      const covidComplications = Array.isArray(covidComplicationsValue) ? covidComplicationsValue : [covidComplicationsValue];
      if (covidComplications.includes('other')) {
        const covidComplicationsAdditional = additionalData['covid_complications_additional'];
        if (!covidComplicationsAdditional || covidComplicationsAdditional.trim() === '') {
          errors['covid_complications_additional'] = t.required;
        }
      }
    }
  }

  // Special validation: if hair_quality includes "other", additional field is required
  if (formData['hair_quality'] && additionalData) {
    const hairQualityValue = formData['hair_quality'];
    const hairQualityArray = Array.isArray(hairQualityValue) ? hairQualityValue : [hairQualityValue];
    if (hairQualityArray.includes('other')) {
      const hairQualityAdditional = additionalData['hair_quality_additional'];
      if (!hairQualityAdditional || hairQualityAdditional.trim() === '') {
        errors['hair_quality_additional'] = t.required;
      }
    }
  }

  // Special validation: if teeth_problems includes "other", additional field is required
  if (formData['teeth_problems'] && additionalData) {
    const teethProblemsValue = formData['teeth_problems'];
    const teethProblemsArray = Array.isArray(teethProblemsValue) ? teethProblemsValue : [teethProblemsValue];
    if (teethProblemsArray.includes('other')) {
      const teethProblemsAdditional = additionalData['teeth_problems_additional'];
      if (!teethProblemsAdditional || teethProblemsAdditional.trim() === '') {
        errors['teeth_problems_additional'] = t.required;
      }
    }
  }

  // Special validation: if stones_kidneys_gallbladder includes "stones_kidneys" or "stones_gallbladder", additional field is required
  if (formData['stones_kidneys_gallbladder'] && additionalData) {
    const stonesValue = formData['stones_kidneys_gallbladder'];
    const stonesArray = Array.isArray(stonesValue) ? stonesValue : [stonesValue];
    if (stonesArray.includes('stones_kidneys') || stonesArray.includes('stones_gallbladder')) {
      const stonesAdditional = additionalData['stones_kidneys_gallbladder_additional'];
      if (!stonesAdditional || stonesAdditional.trim() === '') {
        errors['stones_kidneys_gallbladder_additional'] = t.required;
      }
    }
  }

  // Special validation: if questions with "other" option include "other", additional field is required
  const questionsWithOther = [
    'digestion_detailed', 'headaches_detailed', 'varicose_hemorrhoids_pigment',
    'joints_detailed', 'cysts_polyps_tumors', 'herpes_warts_discharge',
    'menstruation_detailed', 'prostatitis', 'skin_problems_detailed',
    'lifestyle', 'chronic_diseases', 'sleep_problems', 'energy_morning', 'memory_concentration', 'operations_traumas'
  ];
  
  questionsWithOther.forEach((questionId) => {
    if (formData[questionId] && additionalData) {
      const questionValue = formData[questionId];
      const questionArray = Array.isArray(questionValue) ? questionValue : [questionValue];
      if (questionArray.includes('other')) {
        const questionAdditional = additionalData[`${questionId}_additional`];
        if (!questionAdditional || questionAdditional.trim() === '') {
          errors[`${questionId}_additional`] = t.required;
        }
      }
    }
  });

  // Special validation: if weight_goal is "lose" or "gain", additional field is required
  if (formData['weight_goal'] && additionalData) {
    const weightGoalValue = formData['weight_goal'];
    const weightGoal = Array.isArray(weightGoalValue) ? weightGoalValue[0] : weightGoalValue;
    if (weightGoal === 'lose' || weightGoal === 'gain') {
      const weightGoalAdditional = additionalData['weight_goal_additional'];
      if (!weightGoalAdditional || weightGoalAdditional.trim() === '') {
        errors['weight_goal_additional'] = t.required;
      }
    }
  }
  
  // Special validation: if weight_satisfaction is "not_satisfied", weight_goal is required
  if (formData['weight_satisfaction']) {
    const weightSatisfactionValue = formData['weight_satisfaction'];
    const weightSatisfaction = Array.isArray(weightSatisfactionValue) ? weightSatisfactionValue[0] : weightSatisfactionValue;
    if (weightSatisfaction === 'not_satisfied') {
      if (!formData['weight_goal']) {
        errors['weight_goal'] = t.required;
      }
    }
  }

  // Special validation: if had_covid is "yes", covid_times is required
  if (formData['had_covid']) {
    const hadCovidValue = formData['had_covid'];
    const hadCovid = Array.isArray(hadCovidValue) ? hadCovidValue[0] : hadCovidValue;
    if (hadCovid === 'yes') {
      if (!formData['covid_times'] || formData['covid_times'] === '' || isNaN(Number(formData['covid_times']))) {
        errors['covid_times'] = t.required;
      }
    }
  }

  // Special validation: if had_vaccine is "yes", vaccine_doses is required
  if (formData['had_vaccine']) {
    const hadVaccineValue = formData['had_vaccine'];
    const hadVaccine = Array.isArray(hadVaccineValue) ? hadVaccineValue[0] : hadVaccineValue;
    if (hadVaccine === 'yes') {
      if (!formData['vaccine_doses'] || formData['vaccine_doses'] === '' || isNaN(Number(formData['vaccine_doses']))) {
        errors['vaccine_doses'] = t.required;
      }
    }
  }

  // Special validation: if skin_condition has "other" selected, additional field is required
  if (formData['skin_condition'] && additionalData) {
    const skinConditionValue = formData['skin_condition'];
    const skinConditionArray = Array.isArray(skinConditionValue) ? skinConditionValue : [skinConditionValue];
    const hasOther = skinConditionArray.includes('other');
    if (hasOther) {
      const skinConditionAdditional = additionalData['skin_condition_additional'];
      if (!skinConditionAdditional || skinConditionAdditional.trim() === '') {
        errors['skin_condition_additional'] = t.required;
      }
    }
  }

  // Special validation: if sleep has "other" selected, additional field is required
  if (formData['sleep'] && additionalData) {
    const sleepValue = Array.isArray(formData['sleep']) ? formData['sleep'][0] : formData['sleep'];
    const hasOther = sleepValue === 'other';
    if (hasOther) {
      const sleepAdditional = additionalData['sleep_additional'];
      if (!sleepAdditional || sleepAdditional.trim() === '') {
        errors['sleep_additional'] = t.required;
      }
    }
  }

  // Special validation: if sleep_problems has "other" selected, additional field is required
  if (formData['sleep_problems'] && additionalData) {
    const sleepProblemsValue = formData['sleep_problems'];
    const sleepProblemsArray = Array.isArray(sleepProblemsValue) ? sleepProblemsValue : [sleepProblemsValue];
    if (sleepProblemsArray.includes('other')) {
      const sleepProblemsAdditional = additionalData['sleep_problems_additional'];
      if (!sleepProblemsAdditional || sleepProblemsAdditional.trim() === '') {
        errors['sleep_problems_additional'] = t.required;
      }
    }
  }

  // Special validation: if operations has "yes" selected, additional field is required
  if (formData['operations'] && additionalData) {
    const operationsValue = Array.isArray(formData['operations']) ? formData['operations'][0] : formData['operations'];
    const hasYes = operationsValue === 'yes';
    if (hasYes) {
      const operationsAdditional = additionalData['operations_additional'];
      if (!operationsAdditional || operationsAdditional.trim() === '') {
        errors['operations_additional'] = t.required;
      }
    }
  }

  // Special validation: if regular_medications has "yes" selected, additional field is required
  if (formData['regular_medications'] && additionalData) {
    const regularMedicationsValue = typeof formData['regular_medications'] === 'string' ? formData['regular_medications'] : (Array.isArray(formData['regular_medications']) ? formData['regular_medications'][0] : '');
    const hasYes = regularMedicationsValue === 'yes';
    if (hasYes) {
      const regularMedicationsAdditional = additionalData['regular_medications_additional'];
      if (!regularMedicationsAdditional || regularMedicationsAdditional.trim() === '') {
        errors['regular_medications_additional'] = t.required;
      }
    }
  }

  // Special validation: if operations_traumas includes "organ_removed", additional field is required
  if (formData['operations_traumas'] && additionalData) {
    const operationsTraumasValue = formData['operations_traumas'];
    const operationsTraumasArray = Array.isArray(operationsTraumasValue) ? operationsTraumasValue : [operationsTraumasValue];
    if (operationsTraumasArray.includes('organ_removed')) {
      const operationsTraumasAdditional = additionalData['operations_traumas_organs_additional'];
      if (!operationsTraumasAdditional || operationsTraumasAdditional.trim() === '') {
        errors['operations_traumas_organs_additional'] = t.required;
      }
    }
  }


  // Validate Telegram username if provided
  if (contactData.telegram && contactData.telegram.trim() !== '') {
    const telegramValue = contactData.telegram.trim();
    const cleanTelegram = telegramValue.replace(/^@/, '');
    
    // Telegram username validation: 5-32 characters, alphanumeric and underscores only, cannot start with a number
    const telegramRegex = /^[a-zA-Z_][a-zA-Z0-9_]{4,31}$/;
    if (!telegramRegex.test(cleanTelegram)) {
      const telegramErrorMsg = lang === 'ru'
        ? 'Некорректный Telegram username. Должен содержать 5-32 символа (буквы, цифры, подчеркивания), не может начинаться с цифры'
        : lang === 'de'
        ? 'Ungültiger Telegram-Benutzername. Muss 5-32 Zeichen enthalten (Buchstaben, Zahlen, Unterstriche), darf nicht mit einer Zahl beginnen'
        : 'Invalid Telegram username. Must contain 5-32 characters (letters, numbers, underscores), cannot start with a number';
      errors['telegram'] = telegramErrorMsg;
    }
  }

  // Phone is required (primary contact)
  if (!contactData.phone || contactData.phone.trim() === '') {
    errors['phone'] =
      lang === 'ru'
        ? 'Укажите номер телефона'
        : lang === 'de'
          ? 'Bitte geben Sie Ihre Telefonnummer an'
          : 'Please enter your phone number';
  } else {
    const phoneValue = contactData.phone.trim();
    const countryCode = contactData.phoneCountryCode || 'DE';
    let dialCode: string;
    if (countryCode === 'CUSTOM' && contactData.customDialCode) {
      dialCode = contactData.customDialCode.startsWith('+')
        ? contactData.customDialCode
        : `+${contactData.customDialCode}`;
    } else {
      const country = countryCodes.find((c) => c.code === countryCode);
      dialCode = country?.dialCode || '+49';
    }
    const nationalDigits = normalizeNationalSubscriberDigits(dialCode, phoneValue);
    const phoneRegex = /^\d{6,14}$/;
    if (!phoneRegex.test(nationalDigits)) {
      const phoneErrorMsg =
        lang === 'ru'
          ? 'Некорректный номер телефона. Должен содержать 6-14 цифр'
          : lang === 'de'
            ? 'Ungültige Telefonnummer. Muss 6-14 Ziffern enthalten'
            : 'Invalid phone number. Must contain 6-14 digits';
      errors['phone'] = phoneErrorMsg;
    }
  }

  const trimOptional = (v?: string) => (v && v.trim() !== '' ? v.trim() : '');
  const optionalMax = 120;
  const optionalTooLong = (field: string, labelRu: string, labelDe: string, labelEn: string) => {
    const val = trimOptional((contactData as Record<string, string | undefined>)[field]);
    if (val.length > optionalMax) {
      errors[field] =
        lang === 'ru'
          ? `${labelRu}: не более ${optionalMax} символов`
          : lang === 'de'
            ? `${labelDe}: maximal ${optionalMax} Zeichen`
            : `${labelEn}: at most ${optionalMax} characters`;
    }
  };
  optionalTooLong('whatsapp', 'WhatsApp', 'WhatsApp', 'WhatsApp');
  optionalTooLong('viber', 'Viber', 'Viber', 'Viber');
  optionalTooLong('instagram', 'Instagram', 'Instagram', 'Instagram');
  optionalTooLong('vk', 'VK', 'VK', 'VK');

  if (contactData.instagram && contactData.instagram.trim() !== '') {
    const raw = contactData.instagram.trim().replace(/^@/, '');
    const igRegex = /^[a-zA-Z0-9._]{1,30}$/;
    if (!igRegex.test(raw) || raw.startsWith('.') || raw.endsWith('.')) {
      errors['instagram'] =
        lang === 'ru'
          ? 'Некорректный Instagram: @username или username, до 30 символов (буквы, цифры, . и _)'
          : lang === 'de'
            ? 'Ungültiges Instagram: @username oder username, bis zu 30 Zeichen'
            : 'Invalid Instagram: @username or username, up to 30 characters (letters, digits, . and _)';
    }
  }

  const hasMessenger = ['telegram', 'whatsapp', 'viber', 'instagram', 'vk'].some((key) => {
    const v = (contactData as Record<string, string | undefined>)[key];
    return v && v.trim() !== '';
  });
  if (!hasMessenger) {
    errors['contact_method'] =
      lang === 'ru'
        ? 'Укажите хотя бы один мессенджер: Telegram, WhatsApp, Viber, Instagram или ВКонтакте.'
        : lang === 'de'
          ? 'Bitte geben Sie mindestens einen Messenger an: Telegram, WhatsApp, Viber, Instagram oder VKontakte.'
          : 'Please add at least one messenger: Telegram, WhatsApp, Viber, Instagram, or VK.';
  }

  // Special validation: if what_else_question is "yes", what_else field is required
  if (formData['what_else_question'] === 'yes') {
    if (!formData['what_else'] || (typeof formData['what_else'] === 'string' && formData['what_else'].trim() === '')) {
      const whatElseMsg = lang === 'ru' 
        ? 'Пожалуйста, опишите подробнее' 
        : lang === 'de' 
        ? 'Bitte beschreiben Sie ausführlicher'
        : 'Please describe in detail';
      errors['what_else'] = whatElseMsg;
    }
  }

  return errors;
};

// Generate Markdown
export const generateMarkdown = (
  type: QuestionnaireType,
  sections: QuestionnaireSection[],
  formData: FormData,
  additionalData: FormAdditionalData,
  contactData: ContactData,
  lang: Language
): string => {
  const t = translations[lang];
  const headers = {
    infant: t.mdInfant,
    child: t.mdChild,
    woman: t.mdWoman,
    man: t.mdMan,
  };

  // Helper: form values may be strings or numbers from JSON; server-side markdown must not call .trim() on numbers.
  const escapeHtml = (text: unknown): string => {
    const s = text == null ? '' : String(text);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  const hasFilledValue = (value: unknown): boolean => {
    if (value == null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'number') return !Number.isNaN(value);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.trim() !== '';
    return false;
  };

  let md = `<b>${escapeHtml(headers[type])}</b>\n`;

  let questionNumber = 1;
  let healthSectionPassed = false;
  let isFirstSection = true;

  sections.forEach((section) => {
    // Skip empty sections
    const hasAnswers = section.questions.some((question) => {
      const value = formData[question.id];
      return hasFilledValue(value);
    });

    if (!hasAnswers) return;

    // Section header (compact)
    if (!isFirstSection) {
      md += `\n`;
    }
    md += `<b>${escapeHtml(section.title[lang])}</b>\n`;
    isFirstSection = false;
    
    // Mark when we reach the health section
    if (section.id === 'health') {
      healthSectionPassed = true;
    }

    // Create option maps for faster lookup (optimization)
    const optionMaps = new Map<string, Map<string, string>>();
    
    section.questions.forEach((question) => {
      const value = formData[question.id];
      const additional = additionalData[`${question.id}_additional`];

      // Skip what_else field - it will be added to what_else_question answer
      if (question.id === 'what_else') {
        return;
      }
      
      // Skip weight_goal field - it will be added to weight_satisfaction answer
      if (question.id === 'weight_goal') {
        return;
      }
      
      // Skip covid_times and vaccine_doses - they will be added to had_covid and had_vaccine answers
      if (question.id === 'covid_times' || question.id === 'vaccine_doses') {
        return;
      }

      if (!hasFilledValue(value)) return;

      const label = question.label[lang];
      
      // Question number and label - start numbering from first question in "health" section and continue for all subsequent sections
      let questionPrefix = '';
      if (section.id === 'health' || (section.id !== 'personal' && healthSectionPassed)) {
        questionPrefix = `${questionNumber}. `;
        questionNumber++;
      }
      
      // Format answer (optimized with option map caching)
      let answerText = '';
      if (Array.isArray(value)) {
        if (!optionMaps.has(question.id)) {
          const optionMap = new Map<string, string>();
          question.options?.forEach((opt) => {
            optionMap.set(opt.value, opt.label[lang]);
          });
          optionMaps.set(question.id, optionMap);
        }
        const optionMap = optionMaps.get(question.id)!;
        const optionLabels = value.map((v) => optionMap.get(String(v)) ?? String(v));
        answerText = optionLabels.join(', ');
      } else if (question.options) {
        if (!optionMaps.has(question.id)) {
          const optionMap = new Map<string, string>();
          question.options.forEach((opt) => {
            optionMap.set(opt.value, opt.label[lang]);
          });
          optionMaps.set(question.id, optionMap);
        }
        const optionMap = optionMaps.get(question.id)!;
        const key = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
        answerText = optionMap.get(key) || String(value);
      } else {
        answerText = String(value);
      }

        // Add units for weight and age (optimized)
        if (question.id === 'weight' && answerText) {
          const weightNum = Number(answerText);
          if (!isNaN(weightNum)) {
            answerText = `${answerText} кг`;
          }
        } else if (question.id === 'age_months' && answerText) {
          const monthsNum = Number(answerText);
          if (!isNaN(monthsNum)) {
            if (lang === 'ru') {
              // Russian pluralization for months: месяц/месяца/месяцев
              const lastDigit = monthsNum % 10;
              const lastTwoDigits = monthsNum % 100;
              if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
                answerText = `${answerText} месяцев`;
              } else if (lastDigit === 1) {
                answerText = `${answerText} месяц`;
              } else if (lastDigit >= 2 && lastDigit <= 4) {
                answerText = `${answerText} месяца`;
              } else {
                answerText = `${answerText} месяцев`;
              }
            } else if (lang === 'en') {
              answerText = `${answerText} ${monthsNum === 1 ? 'month' : 'months'}`;
            } else if (lang === 'de') {
              answerText = `${answerText} ${monthsNum === 1 ? 'Monat' : 'Monate'}`;
            }
          }
        } else if (question.id === 'age' && answerText) {
          const ageNum = Number(answerText);
          if (!isNaN(ageNum)) {
            if (lang === 'ru') {
              // Russian pluralization: год/года/лет (optimized)
              const lastDigit = ageNum % 10;
              const lastTwoDigits = ageNum % 100;
              if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
                answerText = `${answerText} лет`;
              } else if (lastDigit === 1) {
                answerText = `${answerText} год`;
              } else if (lastDigit >= 2 && lastDigit <= 4) {
                answerText = `${answerText} года`;
              } else {
                answerText = `${answerText} лет`;
              }
            } else if (lang === 'en') {
              answerText = `${answerText} ${ageNum === 1 ? 'year' : 'years'}`;
            } else if (lang === 'de') {
              answerText = `${answerText} ${ageNum === 1 ? 'Jahr' : 'Jahre'}`;
            }
          }
        }

        // Special handling for weight_goal: add kilograms if specified
        if (question.id === 'weight_goal' && additional) {
          const weightKg = additional.trim();
          if (weightKg && !isNaN(Number(weightKg))) {
            if (lang === 'ru') {
              answerText = `${answerText} (${weightKg} кг)`;
            } else if (lang === 'en') {
              answerText = `${answerText} (${weightKg} kg)`;
            } else if (lang === 'de') {
              answerText = `${answerText} (${weightKg} kg)`;
            }
          }
        }
        
        // Special handling: combine weight_satisfaction and weight_goal into one answer
        if (question.id === 'weight_satisfaction') {
          const weightSatisfactionValue = formData['weight_satisfaction'];
          const weightSatisfaction = Array.isArray(weightSatisfactionValue) ? weightSatisfactionValue[0] : weightSatisfactionValue;
          if (weightSatisfaction === 'not_satisfied' && formData['weight_goal']) {
            const weightGoalValue = formData['weight_goal'];
            const weightGoal = Array.isArray(weightGoalValue) ? weightGoalValue[0] : weightGoalValue;
            const weightGoalAdditional = additionalData['weight_goal_additional'];
            
            let goalText = '';
            if (weightGoal === 'lose') {
              goalText = lang === 'ru' ? 'Сбросить' : lang === 'de' ? 'Abnehmen' : 'Lose';
            } else if (weightGoal === 'gain') {
              goalText = lang === 'ru' ? 'Набрать' : lang === 'de' ? 'Zunehmen' : 'Gain';
            }
            
            if (weightGoalAdditional && weightGoalAdditional.trim() && !isNaN(Number(weightGoalAdditional.trim()))) {
              const weightKg = weightGoalAdditional.trim();
              if (lang === 'ru') {
                answerText = `${answerText}: ${goalText} ${weightKg} кг`;
              } else if (lang === 'en') {
                answerText = `${answerText}: ${goalText} ${weightKg} kg`;
              } else if (lang === 'de') {
                answerText = `${answerText}: ${goalText} ${weightKg} kg`;
              }
            } else if (goalText) {
              answerText = `${answerText}: ${goalText}`;
            }
          }
        }

        // Special handling: combine had_covid with covid_times
        if (question.id === 'had_covid' && answerText && formData['covid_times']) {
          const covidTimes = formData['covid_times'];
          if (covidTimes && !isNaN(Number(covidTimes))) {
            const times = Number(covidTimes);
            if (lang === 'ru') {
              // Russian pluralization: раз/раза/раз
              const lastDigit = times % 10;
              const lastTwoDigits = times % 100;
              if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
                answerText = `${answerText} (${times} раз)`;
              } else if (lastDigit === 1) {
                answerText = `${answerText} (${times} раз)`;
              } else if (lastDigit >= 2 && lastDigit <= 4) {
                answerText = `${answerText} (${times} раза)`;
              } else {
                answerText = `${answerText} (${times} раз)`;
              }
            } else if (lang === 'en') {
              answerText = `${answerText} (${times} ${times === 1 ? 'time' : 'times'})`;
            } else if (lang === 'de') {
              answerText = `${answerText} (${times} ${times === 1 ? 'Mal' : 'Mal'})`;
            }
          }
        }

        // Special handling: combine had_vaccine with vaccine_doses
        if (question.id === 'had_vaccine' && answerText && formData['vaccine_doses']) {
          const vaccineDoses = formData['vaccine_doses'];
          if (vaccineDoses && !isNaN(Number(vaccineDoses))) {
            const doses = Number(vaccineDoses);
            if (lang === 'ru') {
              // Russian pluralization: доза/дозы/доз
              const lastDigit = doses % 10;
              const lastTwoDigits = doses % 100;
              if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
                answerText = `${answerText} (${doses} доз)`;
              } else if (lastDigit === 1) {
                answerText = `${answerText} (${doses} доза)`;
              } else if (lastDigit >= 2 && lastDigit <= 4) {
                answerText = `${answerText} (${doses} дозы)`;
              } else {
                answerText = `${answerText} (${doses} доз)`;
              }
            } else if (lang === 'en') {
              answerText = `${answerText} (${doses} ${doses === 1 ? 'dose' : 'doses'})`;
            } else if (lang === 'de') {
              answerText = `${answerText} (${doses} ${doses === 1 ? 'Dosis' : 'Dosen'})`;
            }
          }
        }

        // Special handling for what_else_question: if "yes" is selected, show only the what_else text instead of "Да"
        if (question.id === 'what_else_question' && value === 'yes' && formData['what_else']) {
          const whatElseText = formData['what_else'] as string;
          if (whatElseText && whatElseText.trim() !== '') {
            // Replace answerText with what_else content
            answerText = whatElseText.trim();
          }
        }

        // For personal section, show only answers without questions (with italic font style)
        if (section.id === 'personal') {
          md += `<i>${escapeHtml(answerText)}</i>\n`;
        } else {
          // Format: Question on one line, Answer on next line (with italic font for answers)
          md += `${questionPrefix}${escapeHtml(label)}:\n<i>${escapeHtml(answerText)}</i>`;
          
          // Add additional info, but skip for weight_satisfaction and weight_goal as they're already included in answerText
          if (additional && additional.trim() !== '' && question.id !== 'weight_satisfaction' && question.id !== 'weight_goal') {
            md += `\n<i>(${escapeHtml(additional)})</i>`;
          }
          
          // Add operations_traumas_organs_additional if organ_removed is selected
          if (question.id === 'operations_traumas' && additionalData) {
            const operationsTraumasValue = formData['operations_traumas'];
            const operationsTraumasArray = Array.isArray(operationsTraumasValue) ? operationsTraumasValue : [operationsTraumasValue];
            if (operationsTraumasArray.includes('organ_removed')) {
              const organsAdditional = additionalData['operations_traumas_organs_additional'];
              if (organsAdditional && organsAdditional.trim() !== '') {
                const organsLabel = lang === 'ru' ? 'Удалены органы' : lang === 'de' ? 'Organe entfernt' : 'Organs removed';
                md += `\n<i>(${escapeHtml(organsLabel)}: ${escapeHtml(organsAdditional)})</i>`;
              }
            }
          }
          
          md += `\n`;
        }
    });
  });

  // Contact section (compact)
  md += `\n<b>${escapeHtml(t.mdContacts)}</b>\n`;
  
  const contacts: string[] = [];
  if (contactData.phone && contactData.phone.trim() !== '') {
    const countryCode = contactData.phoneCountryCode || 'DE';
    let dialCode: string;
    if (countryCode === 'CUSTOM' && contactData.customDialCode) {
      dialCode = contactData.customDialCode.startsWith('+') ? contactData.customDialCode : `+${contactData.customDialCode}`;
    } else {
      const country = countryCodes.find(c => c.code === countryCode);
      dialCode = country?.dialCode || '+49';
    }
    const fullPhoneNumber = buildInternationalPhone(dialCode, contactData.phone.trim());
    contacts.push(`Phone: <b>${escapeHtml(fullPhoneNumber)}</b>`);
  }
  if (contactData.telegram && contactData.telegram.trim() !== '') {
    const cleanTelegram = contactData.telegram.replace(/^@/, '').trim();
    contacts.push(`Telegram: <b>@${escapeHtml(cleanTelegram)}</b>`);
  }
  if (contactData.whatsapp && contactData.whatsapp.trim() !== '') {
    contacts.push(`WhatsApp: <b>${escapeHtml(contactData.whatsapp.trim())}</b>`);
  }
  if (contactData.viber && contactData.viber.trim() !== '') {
    contacts.push(`Viber: <b>${escapeHtml(contactData.viber.trim())}</b>`);
  }
  if (contactData.instagram && contactData.instagram.trim() !== '') {
    const ig = contactData.instagram.trim().replace(/^@/, '');
    contacts.push(`Instagram: <b>@${escapeHtml(ig)}</b>`);
  }
  if (contactData.vk && contactData.vk.trim() !== '') {
    contacts.push(`VK: <b>${escapeHtml(contactData.vk.trim())}</b>`);
  }
  if (contactData.email && contactData.email.trim() !== '') {
    contacts.push(`Email: <b>${escapeHtml(contactData.email.trim())}</b>`);
  }
  
  if (contacts.length > 0) {
    md += contacts.join('\n') + '\n';
  }

  return md;
};

// Helper function to get current language from URL
const getCurrentLanguage = (): Language => {
  const urlParams = new URLSearchParams(window.location.search);
  const lang = urlParams.get('lang');
  if (lang && ['ru', 'en', 'de'].includes(lang)) {
    return lang as Language;
  }
  return 'ru'; // default
};

// Send to Telegram
// SECURITY NOTE: In production, use environment variables or a server-side proxy
// Do not expose BOT_TOKEN in client-side code in production!
// For development: Set VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID in .env file
export const sendToTelegram = async (markdown: string, files?: File[] | File | null, lang: Language = 'ru'): Promise<{ success: boolean; error?: string; messageId?: number; fileErrors?: string[] }> => {
  const BOT_TOKEN =
    readPublicEnv('NEXT_PUBLIC_TELEGRAM_BOT_TOKEN') || readPublicEnv('VITE_TELEGRAM_BOT_TOKEN');
  const CHAT_ID =
    readPublicEnv('NEXT_PUBLIC_TELEGRAM_CHAT_ID') || readPublicEnv('VITE_TELEGRAM_CHAT_ID');

  if (!BOT_TOKEN || !CHAT_ID || BOT_TOKEN.trim() === '' || CHAT_ID.trim() === '') {
    return {
      success: false,
      error:
        'Telegram Bot Token or Chat ID not configured. Set TELEGRAM_* server-side for submissions; legacy client vars use VITE_TELEGRAM_BOT_TOKEN / VITE_TELEGRAM_CHAT_ID.',
    };
  }

  // Create AbortController for timeout
  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: markdown,
          parse_mode: 'HTML',
        }),
        signal: controller.signal,
      }
    );

    if (timeoutId) clearTimeout(timeoutId);

    const responseData = await response.json();

    // Helper function to extract migrate_to_chat_id from response
    const extractNewChatId = (data: unknown): number | null => {
      const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
      const params =
        d.parameters && typeof d.parameters === 'object'
          ? (d.parameters as Record<string, unknown>)
          : {};
      const fromParams = params.migrate_to_chat_id;
      if (typeof fromParams === 'number') return fromParams;
      const top = d.migrate_to_chat_id;
      if (typeof top === 'number') return top;
      return null;
    };

    // Helper function to create error message for supergroup migration
    const createSupergroupErrorMessage = (newChatId: number | null, lang: Language): string => {
      if (newChatId) {
        return lang === 'ru' 
          ? `Чат был преобразован в супергруппу. Необходимо обновить Chat ID на новый: ${newChatId}. Обновите переменную окружения VITE_TELEGRAM_CHAT_ID и пересоберите проект.`
          : lang === 'de'
          ? `Der Chat wurde in eine Supergruppe konvertiert. Sie müssen die Chat-ID auf die neue aktualisieren: ${newChatId}. Aktualisieren Sie die Umgebungsvariable VITE_TELEGRAM_CHAT_ID und stellen Sie das Projekt neu bereit.`
          : `Chat was upgraded to a supergroup. You need to update Chat ID to the new one: ${newChatId}. Update VITE_TELEGRAM_CHAT_ID environment variable and rebuild the project.`;
      } else {
        return lang === 'ru'
          ? `Чат был преобразован в супергруппу. Необходимо получить новый Chat ID. Добавьте бота в супергруппу и получите новый Chat ID через @userinfobot или @RawDataBot.`
          : lang === 'de'
          ? `Der Chat wurde in eine Supergruppe konvertiert. Sie müssen eine neue Chat-ID erhalten. Fügen Sie den Bot zur Supergruppe hinzu und erhalten Sie die neue Chat-ID über @userinfobot oder @RawDataBot.`
          : `Chat was upgraded to a supergroup. You need to get a new Chat ID. Add the bot to the supergroup and get the new Chat ID via @userinfobot or @RawDataBot.`;
      }
    };

    // Check for supergroup migration error in response description
    const isSupergroupError = responseData.description && 
      responseData.description.toLowerCase().includes('group chat was upgraded to a supergroup chat');

    if (isSupergroupError) {
      const lang = getCurrentLanguage();
      const newChatId = extractNewChatId(responseData);
      
      console.error('Chat migrated to supergroup - Full response:', {
        oldChatId: CHAT_ID,
        newChatId: newChatId || 'NOT PROVIDED IN RESPONSE',
        fullResponse: JSON.stringify(responseData, null, 2),
        instructions: 'Update VITE_TELEGRAM_CHAT_ID environment variable'
      });
      
      return {
        success: false,
        error: createSupergroupErrorMessage(newChatId, lang)
      };
    }

    if (!response.ok) {
      const errorMsg = responseData.description || `HTTP ${response.status}`;
      console.error('Telegram API error:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData,
        fullResponse: JSON.stringify(responseData, null, 2)
      });
      
      return { 
        success: false, 
        error: `Telegram API error: ${errorMsg}` 
      };
    }

    if (!responseData.ok) {
      const errorMsg = responseData.description || 'Unknown Telegram API error';
      console.error('Telegram API returned error:', {
        error: responseData,
        fullResponse: JSON.stringify(responseData, null, 2)
      });
      
      return { 
        success: false, 
        error: `Telegram API error: ${errorMsg}` 
      };
    }

    console.log('Successfully sent to Telegram');
    const messageId = responseData.result?.message_id;
    
    // If files are provided, send them as documents
    const filesArray = files ? (Array.isArray(files) ? files : [files]) : [];
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB - Telegram Bot API limit
    
    if (filesArray.length > 0) {
      const caption = lang === 'ru' 
        ? 'Медицинские документы (анализы крови, УЗИ)' 
        : lang === 'de'
        ? 'Medizinische Dokumente (Blutuntersuchungen, Ultraschall)'
        : 'Medical documents (blood tests, ultrasound)';
      
      // Send each file separately
      const fileErrors: string[] = [];
      for (const file of filesArray) {
        try {
          // Check file size before sending
          if (file.size > MAX_FILE_SIZE) {
            const errorMsg = lang === 'ru'
              ? `Файл "${file.name}" слишком большой (${(file.size / 1024 / 1024).toFixed(2)}MB). Максимальный размер: 50MB`
              : lang === 'de'
              ? `Datei "${file.name}" ist zu groß (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximale Größe: 50MB`
              : `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size: 50MB`;
            fileErrors.push(errorMsg);
            console.warn(errorMsg);
            continue;
          }
          
          // Create a sanitized filename to avoid issues with special characters and spaces
          // Replace spaces and special characters that might cause issues
          const sanitizeFilename = (filename: string): string => {
            // Get file extension (everything after the last dot)
            const lastDot = filename.lastIndexOf('.');
            const extension = lastDot > 0 ? filename.substring(lastDot) : '';
            const nameWithoutExt = lastDot > 0 ? filename.substring(0, lastDot) : filename;
            
            // Replace spaces with underscores and remove/replace problematic characters
            // Keep dots in the name but replace other problematic characters
            let sanitized = nameWithoutExt
              .replace(/\s+/g, '_')  // Replace spaces with underscores
              .replace(/:/g, '-')  // Replace colons with dashes (common in timestamps like "11:39:34")
              .replace(/[<>"/\\|?*]/g, '_')  // Replace problematic characters (but keep dots and dashes)
              .replace(/_+/g, '_')  // Replace multiple underscores with single
              .replace(/^_+|_+$/g, '');  // Remove leading/trailing underscores
            
            // Ensure filename is not empty
            if (!sanitized || sanitized.length === 0) {
              sanitized = 'file';
            }
            
            // Limit filename length (keep it reasonable, leave room for extension)
            const maxNameLength = 200 - extension.length;
            if (sanitized.length > maxNameLength) {
              sanitized = sanitized.substring(0, maxNameLength);
            }
            
            return sanitized + extension;
          };
          
          const sanitizedFilename = sanitizeFilename(file.name);

          let fileToSend: File = file;
          if (file.name !== sanitizedFilename) {
            fileToSend = new File([file], sanitizedFilename, {
              type: file.type || 'application/octet-stream',
              lastModified: file.lastModified || Date.now(),
            });
          }
          
          const formData = new FormData();
          formData.append('chat_id', CHAT_ID);
          formData.append('document', fileToSend, sanitizedFilename);
          formData.append('caption', caption);
          
          const fileResponse = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`,
            {
              method: 'POST',
              body: formData,
              signal: controller.signal,
            }
          );
          
          const fileResponseData = await fileResponse.json();
          
          if (!fileResponseData.ok) {
            const errorDescription = fileResponseData.description || 'Unknown error';
            let errorMsg = '';
            
            // Check for file size error
            if (errorDescription.includes('file is too big') || errorDescription.includes('file too large')) {
              errorMsg = lang === 'ru'
                ? `Файл "${file.name}" слишком большой. Максимальный размер: 50MB`
                : lang === 'de'
                ? `Datei "${file.name}" ist zu groß. Maximale Größe: 50MB`
                : `File "${file.name}" is too large. Maximum size: 50MB`;
            } else {
              errorMsg = lang === 'ru'
                ? `Ошибка отправки файла "${file.name}": ${errorDescription}`
                : lang === 'de'
                ? `Fehler beim Senden der Datei "${file.name}": ${errorDescription}`
                : `Error sending file "${file.name}": ${errorDescription}`;
            }
            
            fileErrors.push(errorMsg);
            console.warn('Failed to send file to Telegram:', fileResponseData);
          } else {
            console.log('Successfully sent file to Telegram:', file.name);
          }
        } catch (fileError: unknown) {
          const msg = fileError instanceof Error ? fileError.message : 'Network error';
          const errorMsg = lang === 'ru'
            ? `Ошибка при отправке файла "${file.name}": ${msg}`
            : lang === 'de'
            ? `Fehler beim Senden der Datei "${file.name}": ${msg}`
            : `Error sending file "${file.name}": ${msg}`;
          fileErrors.push(errorMsg);
          console.warn('Error sending file to Telegram:', fileError);
        }
      }
      
      // If there were file errors, add them to the return value
      if (fileErrors.length > 0) {
        // Store errors but don't fail the whole request
        console.warn('Some files failed to send:', fileErrors);
        // Return success but with file errors info
        return { 
          success: true, 
          messageId,
          fileErrors: fileErrors.length > 0 ? fileErrors : undefined
        };
      }
    }
    
    return { success: true, messageId };
  } catch (error: unknown) {
    if (timeoutId) clearTimeout(timeoutId);

    let errorMessage = 'Unknown error occurred';

    if (error instanceof Error && error.name === 'AbortError') {
      errorMessage = 'Request timeout. Please check your internet connection and try again.';
    } else if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = 'Network error. Please check your internet connection and try again.';
    } else if (error instanceof Error && error.message) {
      errorMessage = error.message;
    }

    console.error('Error sending to Telegram:', {
      error,
      message: errorMessage,
      name: error instanceof Error ? error.name : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
};

// Generate unique ID
export const generateQuestionnaireId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper functions to normalize contact data for comparison
const normalizeTelegram = (telegram: string): string => {
  return telegram.trim().replace(/^@/, '').toLowerCase();
};

const normalizePhone = (phone: string): string => {
  return phone.trim().replace(/[\s\-()+]/g, '');
};

// Save submitted questionnaire
export const saveSubmittedQuestionnaire = (questionnaire: SubmittedQuestionnaire): void => {
  try {
    const key = `submitted_questionnaire_${questionnaire.id}`;
    localStorage.setItem(key, JSON.stringify(questionnaire));
    
    // Index by contact method (telegram or phone) for easy lookup
    // Index by Telegram if available
    if (questionnaire.contactData.telegram && questionnaire.contactData.telegram.trim() !== '') {
      const normalizedTelegram = normalizeTelegram(questionnaire.contactData.telegram);
      const telegramKey = `questionnaires_by_contact_${normalizedTelegram}`;
      const existingTelegram = localStorage.getItem(telegramKey);
      const telegramIds = existingTelegram ? JSON.parse(existingTelegram) : [];
      if (!telegramIds.includes(questionnaire.id)) {
        telegramIds.push(questionnaire.id);
        localStorage.setItem(telegramKey, JSON.stringify(telegramIds));
      }
    }
    
    // Index by Phone if available
    if (questionnaire.contactData.phone && questionnaire.contactData.phone.trim() !== '') {
      const normalizedPhone = normalizePhone(questionnaire.contactData.phone);
      const phoneKey = `questionnaires_by_contact_${normalizedPhone}`;
      const existingPhone = localStorage.getItem(phoneKey);
      const phoneIds = existingPhone ? JSON.parse(existingPhone) : [];
      if (!phoneIds.includes(questionnaire.id)) {
        phoneIds.push(questionnaire.id);
        localStorage.setItem(phoneKey, JSON.stringify(phoneIds));
      }
    }
  } catch (err) {
    console.error('Error saving submitted questionnaire:', err);
  }
};

// Get submitted questionnaire by ID
export const getSubmittedQuestionnaireById = (id: string): SubmittedQuestionnaire | null => {
  try {
    const key = `submitted_questionnaire_${id}`;
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading submitted questionnaire:', err);
  }
  return null;
};

// Update submitted questionnaire
export const updateSubmittedQuestionnaire = (questionnaire: SubmittedQuestionnaire): void => {
  try {
    const key = `submitted_questionnaire_${questionnaire.id}`;
    localStorage.setItem(key, JSON.stringify(questionnaire));
    
    // Update contact index (same as in saveSubmittedQuestionnaire)
    // Index by Telegram if available
    if (questionnaire.contactData.telegram && questionnaire.contactData.telegram.trim() !== '') {
      const normalizedTelegram = normalizeTelegram(questionnaire.contactData.telegram);
      const telegramKey = `questionnaires_by_contact_${normalizedTelegram}`;
      const existingTelegram = localStorage.getItem(telegramKey);
      const telegramIds = existingTelegram ? JSON.parse(existingTelegram) : [];
      if (!telegramIds.includes(questionnaire.id)) {
        telegramIds.push(questionnaire.id);
        localStorage.setItem(telegramKey, JSON.stringify(telegramIds));
      }
    }
    
    // Index by Phone if available
    if (questionnaire.contactData.phone && questionnaire.contactData.phone.trim() !== '') {
      const normalizedPhone = normalizePhone(questionnaire.contactData.phone);
      const phoneKey = `questionnaires_by_contact_${normalizedPhone}`;
      const existingPhone = localStorage.getItem(phoneKey);
      const phoneIds = existingPhone ? JSON.parse(existingPhone) : [];
      if (!phoneIds.includes(questionnaire.id)) {
        phoneIds.push(questionnaire.id);
        localStorage.setItem(phoneKey, JSON.stringify(phoneIds));
      }
    }
  } catch (err) {
    console.error('Error updating submitted questionnaire:', err);
  }
};

// Get all submitted questionnaires
export const getAllSubmittedQuestionnaires = (): SubmittedQuestionnaire[] => {
  try {
    const questionnaires: SubmittedQuestionnaire[] = [];
    
    // Iterate through all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('submitted_questionnaire_')) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            // Validate that parsed data has required fields
            if (parsed && parsed.id && parsed.type && parsed.submittedAt) {
              questionnaires.push(parsed);
            } else {
              console.warn('Invalid questionnaire data found:', key, parsed);
            }
          }
        } catch (err) {
          console.error('Error parsing questionnaire:', key, err);
        }
      }
    }
    
    console.log(`Found ${questionnaires.length} submitted questionnaires`);
    return questionnaires.sort((a, b) => b.submittedAt - a.submittedAt);
  } catch (err) {
    console.error('Error loading all submitted questionnaires:', err);
    return [];
  }
};

// Get submitted questionnaires by contact (Telegram or Phone)
export const getSubmittedQuestionnairesByContact = (telegram?: string, phone?: string): SubmittedQuestionnaire[] => {
  try {
    const foundQuestionnaires: SubmittedQuestionnaire[] = [];
    const foundIds = new Set<string>();
    
    // Normalize search inputs
    const normalizedTelegram = telegram ? normalizeTelegram(telegram) : null;
    const normalizedPhone = phone ? normalizePhone(phone) : null;
    
    // Search through all questionnaires and match by contact data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('submitted_questionnaire_')) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const questionnaire: SubmittedQuestionnaire = JSON.parse(data);
            let matches = false;
            
            // Check Telegram match
            if (normalizedTelegram && questionnaire.contactData.telegram) {
              const qTelegram = normalizeTelegram(questionnaire.contactData.telegram);
              if (qTelegram === normalizedTelegram) {
                matches = true;
              }
            }
            
            // Check Phone match (compare without country code)
            if (normalizedPhone && questionnaire.contactData.phone) {
              const qPhone = normalizePhone(questionnaire.contactData.phone);
              // Remove country code from stored phone if it exists
              const qPhoneWithoutCode = qPhone.replace(/^\d{1,4}/, ''); // Remove up to 4 digits (country code)
              const searchPhoneWithoutCode = normalizedPhone.replace(/^\d{1,4}/, '');
              
              // Try exact match first
              if (qPhone === normalizedPhone || qPhoneWithoutCode === searchPhoneWithoutCode) {
                matches = true;
              }
            }
            
            if (matches && questionnaire.id && questionnaire.type && questionnaire.submittedAt) {
              foundIds.add(questionnaire.id);
            }
          }
        } catch (err) {
          console.error('Error parsing questionnaire:', err);
        }
      }
    }
    
    // Also check indexed contacts
    if (normalizedTelegram) {
      const contactKey = `questionnaires_by_contact_${normalizedTelegram}`;
      const idsJson = localStorage.getItem(contactKey);
      if (idsJson) {
        try {
          const ids: string[] = JSON.parse(idsJson);
          ids.forEach(id => foundIds.add(id));
        } catch (err) {
          console.error('Error parsing contact IDs:', err);
        }
      }
    }
    
    if (normalizedPhone) {
      const contactKey = `questionnaires_by_contact_${normalizedPhone}`;
      const idsJson = localStorage.getItem(contactKey);
      if (idsJson) {
        try {
          const ids: string[] = JSON.parse(idsJson);
          ids.forEach(id => foundIds.add(id));
        } catch (err) {
          console.error('Error parsing contact IDs:', err);
        }
      }
    }
    
    // Load questionnaires by IDs
    foundIds.forEach(id => {
      const key = `submitted_questionnaire_${id}`;
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const questionnaire: SubmittedQuestionnaire = JSON.parse(data);
          if (questionnaire && questionnaire.id && questionnaire.type && questionnaire.submittedAt) {
            // Avoid duplicates
            if (!foundQuestionnaires.find(q => q.id === questionnaire.id)) {
              foundQuestionnaires.push(questionnaire);
            }
          }
        } catch (err) {
          console.error('Error parsing questionnaire:', err);
        }
      }
    });
    
    return foundQuestionnaires.sort((a, b) => b.submittedAt - a.submittedAt);
  } catch (err) {
    console.error('Error loading submitted questionnaires by contact:', err);
    return [];
  }
};

// Get submitted questionnaires by email (kept for backward compatibility)
export const getSubmittedQuestionnairesByEmail = (email: string): SubmittedQuestionnaire[] => {
  try {
    const emailKey = `questionnaires_by_email_${email}`;
    const idsJson = localStorage.getItem(emailKey);
    if (!idsJson) return [];
    
    const ids: string[] = JSON.parse(idsJson);
    const questionnaires: SubmittedQuestionnaire[] = [];
    
    ids.forEach(id => {
      const key = `submitted_questionnaire_${id}`;
      const data = localStorage.getItem(key);
      if (data) {
        questionnaires.push(JSON.parse(data));
      }
    });
    
    return questionnaires.sort((a, b) => b.submittedAt - a.submittedAt);
  } catch (err) {
    console.error('Error loading submitted questionnaires:', err);
    return [];
  }
};

// Delete submitted questionnaire
export const deleteSubmittedQuestionnaire = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const key = `submitted_questionnaire_${id}`;
    const data = localStorage.getItem(key);
    
    if (!data) {
      return { success: false, error: 'Questionnaire not found' };
    }
    
    const questionnaire: SubmittedQuestionnaire = JSON.parse(data);
    
    // Delete from Telegram if message_id exists
    if (questionnaire.telegramMessageId) {
      const BOT_TOKEN =
        readPublicEnv('NEXT_PUBLIC_TELEGRAM_BOT_TOKEN') || readPublicEnv('VITE_TELEGRAM_BOT_TOKEN');
      const CHAT_ID =
        readPublicEnv('NEXT_PUBLIC_TELEGRAM_CHAT_ID') || readPublicEnv('VITE_TELEGRAM_CHAT_ID');
      
      if (BOT_TOKEN && CHAT_ID) {
        try {
          await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chat_id: CHAT_ID,
                message_id: questionnaire.telegramMessageId,
              }),
            }
          );
        } catch (err) {
          console.error('Error deleting message from Telegram:', err);
          // Continue with local deletion even if Telegram deletion fails
        }
      }
    }
    
    // Delete from localStorage
    localStorage.removeItem(key);
    
    // Remove from contact index
    const contactIdentifier = questionnaire.contactData.telegram || questionnaire.contactData.phone || 'unknown';
    const contactKey = `questionnaires_by_contact_${contactIdentifier}`;
    const idsJson = localStorage.getItem(contactKey);
    if (idsJson) {
      const ids: string[] = JSON.parse(idsJson);
      const filteredIds = ids.filter(i => i !== id);
      if (filteredIds.length > 0) {
        localStorage.setItem(contactKey, JSON.stringify(filteredIds));
      } else {
        localStorage.removeItem(contactKey);
      }
    }
    
    return { success: true };
  } catch (err) {
    console.error('Error deleting submitted questionnaire:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};
