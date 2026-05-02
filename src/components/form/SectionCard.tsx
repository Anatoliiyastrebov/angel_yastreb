import React from 'react';
import { motion } from 'framer-motion';
import { QuestionnaireSection, Question } from '@/lib/questionnaire-data';
import { SectionIcon } from '@/components/icons/SectionIcons';
import { CompactQuestionField } from './CompactQuestionField';
import { FormData, FormAdditionalData } from '@/lib/form-utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SUBMISSION_MAX_FILE_BYTES, SUBMISSION_MAX_FILES } from '@/lib/submission-upload-limits';

const MAX_UPLOAD_MB = Math.round(SUBMISSION_MAX_FILE_BYTES / (1024 * 1024));

interface SectionCardProps {
  section: QuestionnaireSection;
  formData: FormData;
  additionalData: FormAdditionalData;
  errors: { [key: string]: string };
  onFieldChange: (questionId: string, value: string | string[]) => void;
  onAdditionalChange: (questionId: string, value: string) => void;
  language: 'ru' | 'en' | 'de';
  onFileChange?: (files: File[]) => void;
  files?: File[];
}

export const SectionCard: React.FC<SectionCardProps> = ({
  section,
  formData,
  additionalData,
  errors,
  onFieldChange,
  onAdditionalChange,
  language,
  onFileChange,
  files = [],
}) => {
  // Get all questions that have additional fields and are answered
  const questionsWithAdditional = section.questions.filter((question) => {
    if (!question.hasAdditional) return false;
    
    const value = formData[question.id];
    if (!value) return false;

    // Check specific conditions for each question type
    if (question.id === 'injuries') {
      const currentValues = Array.isArray(value) ? value : [];
      return currentValues.some((val: string) => val !== 'no_issues');
    }
    
    if (question.id === 'illness_antibiotics') {
      const currentValues = Array.isArray(value) ? value : [];
      return currentValues.includes('took_antibiotics') || 
             currentValues.includes('took_medications') || 
             currentValues.includes('both');
    }
    
    if (question.id === 'pregnancy_problems') {
      return value === 'yes';
    }
    
    if (question.id === 'allergies' || question.id === 'skin_condition') {
      const currentValues = Array.isArray(value) ? value : [];
      return currentValues.includes('other');
    }
    
    if (question.id === 'sleep' || question.id === 'operations') {
      const firstValue = Array.isArray(value) ? value[0] : value;
      return firstValue === 'other' || firstValue === 'yes';
    }
    
    if (question.id === 'weight_goal') {
      // Skip weight_goal from the end block - it's shown inline after the question
      return false;
    }
    
    if (question.id === 'covid_complications') {
      // Skip covid_complications from the end block - it's shown inline after the question
      return false;
    }
    
    if (question.id === 'hair_quality') {
      // Skip hair_quality from the end block - it's shown inline after the question
      return false;
    }
    
    if (question.id === 'teeth_problems') {
      // Skip teeth_problems from the end block - it's shown inline after the question
      return false;
    }
    
    if (question.id === 'stones_kidneys_gallbladder') {
      // Show stones_kidneys_gallbladder additional field only if stones_kidneys or stones_gallbladder is selected
      const stonesValue = formData['stones_kidneys_gallbladder'];
      const stonesArray = Array.isArray(stonesValue) ? stonesValue : (stonesValue ? [stonesValue] : []);
      return stonesArray.includes('stones_kidneys') || stonesArray.includes('stones_gallbladder');
    }
    
    if (question.id === 'regular_medications') {
      // Skip regular_medications from the end block - it's shown inline after the question
      return false;
    }
    
    if (question.id === 'operations_traumas') {
      // Skip operations_traumas from the end block - additional field for "organ_removed" is shown inline
      return false;
    }
    
    // Skip questions with "other" option from the end block - they're shown inline after the question
    const inlineOtherQuestions = [
      'digestion_detailed', 'headaches_detailed', 'varicose_hemorrhoids_pigment',
      'joints_detailed', 'cysts_polyps_tumors', 'herpes_warts_discharge',
      'menstruation_detailed', 'prostatitis', 'skin_problems_detailed',
      'lifestyle', 'allergies', 'allergies_detailed', 'skin_condition', 'chronic_diseases', 'sleep_problems',
      'energy_morning', 'memory_concentration', 'operations_traumas', 'pressure', 'colds_medication'
    ];
    if (inlineOtherQuestions.includes(question.id)) {
      return false;
    }
    
    return true;
  });

  const hasAnyAdditional = questionsWithAdditional.length > 0;
  
  // Check if the last question in the section is main_concern
  const lastQuestion = section.questions[section.questions.length - 1];
  const isLastQuestionMainConcern = lastQuestion?.id === 'main_concern';
  
  // Don't show additional fields block if the last question is main_concern
  const shouldShowAdditionalBlock = hasAnyAdditional && !isLastQuestionMainConcern;
  
  const additionalLabel = {
    ru: 'Дополнительно (необязательно)',
    en: 'Additional (optional)',
    de: 'Zusätzlich (optional)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg p-6 md:p-8 border border-medical-200 shadow-sm"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <SectionIcon name={section.icon} className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-semibold text-medical-800">
          {section.title[language]}
        </h2>
      </div>

      {/* Questions */}
      <div className={section.id === 'personal' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-6'}>
        {section.questions.map((question) => {
          // Hide what_else field if what_else_question is not 'yes'
          if (question.id === 'what_else' && formData['what_else_question'] !== 'yes') {
            return null;
          }

          // Hide weight_goal question if weight_satisfaction is 'satisfied'
          if (question.id === 'weight_goal') {
            const weightSatisfactionValue = formData['weight_satisfaction'];
            const weightSatisfaction = typeof weightSatisfactionValue === 'string' ? weightSatisfactionValue : (Array.isArray(weightSatisfactionValue) ? weightSatisfactionValue[0] : '');
            if (weightSatisfaction !== 'not_satisfied') {
              return null;
            }
          }

          // Hide covid_times question if had_covid is not 'yes'
          if (question.id === 'covid_times') {
            const hadCovidValue = formData['had_covid'];
            const hadCovid = typeof hadCovidValue === 'string' ? hadCovidValue : (Array.isArray(hadCovidValue) ? hadCovidValue[0] : '');
            if (hadCovid !== 'yes') {
              return null;
            }
          }

          // Hide vaccine_doses question if had_vaccine is not 'yes'
          if (question.id === 'vaccine_doses') {
            const hadVaccineValue = formData['had_vaccine'];
            const hadVaccine = typeof hadVaccineValue === 'string' ? hadVaccineValue : (Array.isArray(hadVaccineValue) ? hadVaccineValue[0] : '');
            if (hadVaccine !== 'yes') {
              return null;
            }
          }

          // Hide covid_complications question if had_covid is not 'yes'
          if (question.id === 'covid_complications') {
            const hadCovidValue = formData['had_covid'];
            const hadCovid = typeof hadCovidValue === 'string' ? hadCovidValue : (Array.isArray(hadCovidValue) ? hadCovidValue[0] : '');
            if (hadCovid !== 'yes') {
              return null;
            }
          }

          // Hide has_medical_documents file upload here - it will be shown in the question itself
          const showFileUpload = question.id === 'has_medical_documents' && formData['has_medical_documents'] === 'yes';
          
          // Show additional field for weight_goal immediately after the question
          const showWeightAdditional = question.id === 'weight_goal' && question.hasAdditional;
          const weightGoalValue = formData['weight_goal'];
          const weightGoalStringValue = typeof weightGoalValue === 'string' ? weightGoalValue : (Array.isArray(weightGoalValue) ? weightGoalValue[0] : '');
          const shouldShowWeightField = weightGoalStringValue === 'lose' || weightGoalStringValue === 'gain';
          const weightAdditionalKey = 'weight_goal_additional';
          const weightAdditionalValue = additionalData[weightAdditionalKey] || '';
          const weightAdditionalError = errors[weightAdditionalKey];

          // Show additional field for covid_complications immediately after the question
          const showCovidComplicationsAdditional = question.id === 'covid_complications';
          const covidComplicationsValue = formData['covid_complications'];
          const covidComplicationsArray = Array.isArray(covidComplicationsValue) ? covidComplicationsValue : (covidComplicationsValue ? [covidComplicationsValue] : []);
          const shouldShowCovidComplicationsField = covidComplicationsArray.includes('other');
          const covidComplicationsAdditionalKey = 'covid_complications_additional';
          const covidComplicationsAdditionalValue = additionalData[covidComplicationsAdditionalKey] || '';
          const covidComplicationsAdditionalError = errors[covidComplicationsAdditionalKey];

          // Show additional field for hair_quality immediately after the question
          const showHairQualityAdditional = question.id === 'hair_quality';
          const hairQualityValue = formData['hair_quality'];
          const hairQualityArray = Array.isArray(hairQualityValue) ? hairQualityValue : (hairQualityValue ? [hairQualityValue] : []);
          const shouldShowHairQualityField = hairQualityArray.includes('other');
          const hairQualityAdditionalKey = 'hair_quality_additional';
          const hairQualityAdditionalValue = additionalData[hairQualityAdditionalKey] || '';
          const hairQualityAdditionalError = errors[hairQualityAdditionalKey];

          // Show additional field for teeth_problems immediately after the question
          const showTeethProblemsAdditional = question.id === 'teeth_problems';
          const teethProblemsValue = formData['teeth_problems'];
          const teethProblemsArray = Array.isArray(teethProblemsValue) ? teethProblemsValue : (teethProblemsValue ? [teethProblemsValue] : []);
          const shouldShowTeethProblemsField = teethProblemsArray.includes('other');
          const teethProblemsAdditionalKey = 'teeth_problems_additional';
          const teethProblemsAdditionalValue = additionalData[teethProblemsAdditionalKey] || '';
          const teethProblemsAdditionalError = errors[teethProblemsAdditionalKey];

          // Show additional field for stones_kidneys_gallbladder immediately after the question
          const showStonesAdditional = question.id === 'stones_kidneys_gallbladder';
          const stonesValue = formData['stones_kidneys_gallbladder'];
          const stonesArray = Array.isArray(stonesValue) ? stonesValue : (stonesValue ? [stonesValue] : []);
          const shouldShowStonesField = stonesArray.includes('stones_kidneys') || stonesArray.includes('stones_gallbladder');
          const stonesAdditionalKey = 'stones_kidneys_gallbladder_additional';
          const stonesAdditionalValue = additionalData[stonesAdditionalKey] || '';
          const stonesAdditionalError = errors[stonesAdditionalKey];

          // Show additional field for regular_medications immediately after the question
          const showRegularMedicationsAdditional = question.id === 'regular_medications';
          const regularMedicationsValue = formData['regular_medications'];
          const regularMedicationsStringValue = typeof regularMedicationsValue === 'string' ? regularMedicationsValue : (Array.isArray(regularMedicationsValue) ? regularMedicationsValue[0] : '');
          const shouldShowRegularMedicationsField = regularMedicationsStringValue === 'yes';
          const regularMedicationsAdditionalKey = 'regular_medications_additional';
          const regularMedicationsAdditionalValue = additionalData[regularMedicationsAdditionalKey] || '';
          const regularMedicationsAdditionalError = errors[regularMedicationsAdditionalKey];

          // Show additional field for operations_traumas when "organ_removed" is selected
          const showOperationsTraumasAdditional = question.id === 'operations_traumas';
          const operationsTraumasValue = formData['operations_traumas'];
          const operationsTraumasArray = Array.isArray(operationsTraumasValue) ? operationsTraumasValue : (operationsTraumasValue ? [operationsTraumasValue] : []);
          const shouldShowOperationsTraumasField = operationsTraumasArray.includes('organ_removed');
          const operationsTraumasAdditionalKey = 'operations_traumas_organs_additional';
          const operationsTraumasAdditionalValue = additionalData[operationsTraumasAdditionalKey] || '';
          const operationsTraumasAdditionalError = errors[operationsTraumasAdditionalKey];

          // Show additional field for questions with "other" option immediately after the question
          const showOtherAdditional = question.hasAdditional && question.type === 'checkbox';
          const questionValue = formData[question.id];
          const questionArray = Array.isArray(questionValue) ? questionValue : (questionValue ? [questionValue] : []);
          const shouldShowOtherField = questionArray.includes('other');
          const otherAdditionalKey = `${question.id}_additional`;
          const otherAdditionalValue = additionalData[otherAdditionalKey] || '';
          const otherAdditionalError = errors[otherAdditionalKey];
          
          // List of questions that should show "other" field inline (not in the end block)
          const inlineOtherQuestions = [
            'digestion_detailed', 'headaches_detailed', 'varicose_hemorrhoids_pigment',
            'joints_detailed', 'cysts_polyps_tumors', 'herpes_warts_discharge',
            'menstruation_detailed', 'prostatitis', 'skin_problems_detailed',
            'lifestyle', 'allergies', 'allergies_detailed', 'skin_condition', 'chronic_diseases', 'sleep_problems',
            'energy_morning', 'memory_concentration', 'operations_traumas', 'pressure', 'colds_medication'
          ];
          const shouldShowInlineOther = inlineOtherQuestions.includes(question.id) && shouldShowOtherField;

          return (
            <div key={question.id} data-error={!!errors[question.id]} data-question-id={question.id}>
              <CompactQuestionField
                question={question}
                value={formData[question.id] || (question.type === 'checkbox' ? [] : '')}
                onChange={(value) => onFieldChange(question.id, value)}
                error={errors[question.id]}
                formData={formData}
              />

              {/* Additional field for weight_goal */}
              {showWeightAdditional && shouldShowWeightField && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="mt-4"
                >
                  <label className="text-sm font-medium text-medical-600 mb-2 block">
                    {language === 'ru' ? 'Сколько килограмм?' : language === 'de' ? 'Wie viele Kilogramm?' : 'How many kilograms?'}
                    <span className="text-destructive ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className={cn(
                      "w-full px-4 py-3 rounded-lg border border-medical-300 bg-white transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                      weightAdditionalError ? "border-destructive" : "hover:border-medical-400"
                    )}
                    value={weightAdditionalValue}
                    onChange={(e) => onAdditionalChange('weight_goal', e.target.value)}
                    placeholder={language === 'ru' ? 'Введите количество килограмм' : language === 'de' ? 'Geben Sie die Anzahl der Kilogramm ein' : 'Enter number of kilograms'}
                  />
                  {weightAdditionalError && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {weightAdditionalError}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Additional field for covid_complications */}
              {showCovidComplicationsAdditional && shouldShowCovidComplicationsField && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="mt-4"
                >
                  <label className="text-sm font-medium text-medical-600 mb-2 block">
                    {language === 'ru' ? 'Укажите какие еще осложнения' : language === 'de' ? 'Geben Sie an, welche weiteren Komplikationen' : 'Specify what other complications'}
                    <span className="text-destructive ml-1">*</span>
                  </label>
                  <textarea
                    className={cn(
                      "w-full px-4 py-3 rounded-lg border border-medical-300 bg-white min-h-[80px] resize-y transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                      covidComplicationsAdditionalError ? "border-destructive" : "hover:border-medical-400"
                    )}
                    value={covidComplicationsAdditionalValue}
                    onChange={(e) => onAdditionalChange('covid_complications', e.target.value)}
                    placeholder={language === 'ru' ? 'Опишите другие осложнения' : language === 'de' ? 'Beschreiben Sie andere Komplikationen' : 'Describe other complications'}
                  />
                  {covidComplicationsAdditionalError && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {covidComplicationsAdditionalError}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Additional field for hair_quality */}
              {showHairQualityAdditional && shouldShowHairQualityField && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="mt-4"
                >
                  <label className="text-sm font-medium text-medical-600 mb-2 block">
                    {language === 'ru' ? 'Укажите свой ответ' : language === 'de' ? 'Geben Sie Ihre Antwort an' : 'Specify your answer'}
                    <span className="text-destructive ml-1">*</span>
                  </label>
                  <textarea
                    className={cn(
                      "w-full px-4 py-3 rounded-lg border border-medical-300 bg-white min-h-[80px] resize-y transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                      hairQualityAdditionalError ? "border-destructive" : "hover:border-medical-400"
                    )}
                    value={hairQualityAdditionalValue}
                    onChange={(e) => onAdditionalChange('hair_quality', e.target.value)}
                    placeholder={language === 'ru' ? 'Опишите качество волос' : language === 'de' ? 'Beschreiben Sie die Haarqualität' : 'Describe hair quality'}
                  />
                  {hairQualityAdditionalError && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {hairQualityAdditionalError}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Additional field for teeth_problems */}
              {showTeethProblemsAdditional && shouldShowTeethProblemsField && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="mt-4"
                >
                  <label className="text-sm font-medium text-medical-600 mb-2 block">
                    {language === 'ru' ? 'Укажите свой ответ' : language === 'de' ? 'Geben Sie Ihre Antwort an' : 'Specify your answer'}
                    <span className="text-destructive ml-1">*</span>
                  </label>
                  <textarea
                    className={cn(
                      "w-full px-4 py-3 rounded-lg border border-medical-300 bg-white min-h-[80px] resize-y transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                      teethProblemsAdditionalError ? "border-destructive" : "hover:border-medical-400"
                    )}
                    value={teethProblemsAdditionalValue}
                    onChange={(e) => onAdditionalChange('teeth_problems', e.target.value)}
                    placeholder={language === 'ru' ? 'Опишите проблемы с зубами' : language === 'de' ? 'Beschreiben Sie Zahnprobleme' : 'Describe teeth problems'}
                  />
                  {teethProblemsAdditionalError && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {teethProblemsAdditionalError}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Additional field for stones_kidneys_gallbladder */}
              {showStonesAdditional && shouldShowStonesField && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="mt-4"
                >
                  <label className="text-sm font-medium text-medical-600 mb-2 block">
                    {language === 'ru' ? 'Укажите размер камней' : language === 'de' ? 'Geben Sie die Größe der Steine an' : 'Specify stone size'}
                    <span className="text-destructive ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    className={cn(
                      "w-full px-4 py-3 rounded-lg border border-medical-300 bg-white transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                      stonesAdditionalError ? "border-destructive" : "hover:border-medical-400"
                    )}
                    value={stonesAdditionalValue}
                    onChange={(e) => onAdditionalChange('stones_kidneys_gallbladder', e.target.value)}
                    placeholder={language === 'ru' ? 'Например: 5мм, 7-10мм, мелкие' : language === 'de' ? 'Z.B.: 5mm, 7-10mm, klein' : 'E.g.: 5mm, 7-10mm, small'}
                  />
                  {stonesAdditionalError && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {stonesAdditionalError}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Additional field for regular_medications */}
              {showRegularMedicationsAdditional && shouldShowRegularMedicationsField && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="mt-4"
                >
                  <label className="text-sm font-medium text-medical-600 mb-2 block">
                    {language === 'ru' ? 'Укажите названия лекарств' : language === 'de' ? 'Geben Sie die Namen der Medikamente an' : 'Specify medication names'}
                    <span className="text-destructive ml-1">*</span>
                  </label>
                  <textarea
                    className={cn(
                      "w-full px-4 py-3 rounded-lg border border-medical-300 bg-white min-h-[80px] resize-y transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                      regularMedicationsAdditionalError ? "border-destructive" : "hover:border-medical-400"
                    )}
                    value={regularMedicationsAdditionalValue}
                    onChange={(e) => onAdditionalChange('regular_medications', e.target.value)}
                    placeholder={language === 'ru' ? 'Перечислите названия лекарств, которые принимаете регулярно' : language === 'de' ? 'Listen Sie die Namen der Medikamente auf, die Sie regelmäßig einnehmen' : 'List the names of medications you take regularly'}
                  />
                  {regularMedicationsAdditionalError && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {regularMedicationsAdditionalError}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Additional field for operations_traumas when "organ_removed" is selected */}
              {showOperationsTraumasAdditional && shouldShowOperationsTraumasField && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="mt-4"
                >
                  <label className="text-sm font-medium text-medical-600 mb-2 block">
                    {language === 'ru' ? 'Какие органы удалены?' : language === 'de' ? 'Welche Organe wurden entfernt?' : 'Which organs were removed?'}
                    <span className="text-destructive ml-1">*</span>
                  </label>
                  <textarea
                    className={cn(
                      "w-full px-4 py-3 rounded-lg border border-medical-300 bg-white min-h-[80px] resize-y transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                      operationsTraumasAdditionalError ? "border-destructive" : "hover:border-medical-400"
                    )}
                    value={operationsTraumasAdditionalValue}
                    onChange={(e) => onAdditionalChange('operations_traumas_organs', e.target.value)}
                    placeholder={language === 'ru' ? 'Укажите какие органы были удалены' : language === 'de' ? 'Geben Sie an, welche Organe entfernt wurden' : 'Specify which organs were removed'}
                  />
                  {operationsTraumasAdditionalError && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {operationsTraumasAdditionalError}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Additional field for questions with "other" option */}
              {shouldShowInlineOther && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="mt-4"
                >
                  <label className="text-sm font-medium text-medical-600 mb-2 block">
                    {language === 'ru' ? 'Укажите свой ответ' : language === 'de' ? 'Geben Sie Ihre Antwort an' : 'Specify your answer'}
                    <span className="text-destructive ml-1">*</span>
                  </label>
                  <textarea
                    className={cn(
                      "w-full px-4 py-3 rounded-lg border border-medical-300 bg-white min-h-[80px] resize-y transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                      otherAdditionalError ? "border-destructive" : "hover:border-medical-400"
                    )}
                    value={otherAdditionalValue}
                    onChange={(e) => onAdditionalChange(question.id, e.target.value)}
                    placeholder={language === 'ru' ? 'Опишите подробнее' : language === 'de' ? 'Beschreiben Sie genauer' : 'Describe in more detail'}
                  />
                  {otherAdditionalError && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {otherAdditionalError}
                    </p>
                  )}
                </motion.div>
              )}

              {/* File upload for medical documents */}
              {showFileUpload && onFileChange && (
                <div className="mt-4">
                  <label className="text-sm text-medical-600 mb-2 block">
                    {language === 'ru'
                      ? `Загрузите файлы анализов / УЗИ (до ${files.length}/${SUBMISSION_MAX_FILES}, до ${MAX_UPLOAD_MB} МБ каждый)`
                      : language === 'de'
                        ? `Dateien (Labor/US etc.) hochladen (${files.length}/${SUBMISSION_MAX_FILES}, max. ${MAX_UPLOAD_MB} MB je Datei)`
                        : `Upload lab / ultrasound files (${files.length}/${SUBMISSION_MAX_FILES}, max ${MAX_UPLOAD_MB} MB each)`}
                  </label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="*/*"
                      multiple
                      onChange={(e) => {
                        const selectedFiles = Array.from(e.target.files || []);
                        const currentFiles = files || [];
                        
                        // Validate file sizes
                        const validFiles: File[] = [];
                        const invalidFiles: { name: string; size: number }[] = [];
                        
                        selectedFiles.forEach((file) => {
                          if (file.size > SUBMISSION_MAX_FILE_BYTES) {
                            invalidFiles.push({ name: file.name, size: file.size });
                          } else {
                            validFiles.push(file);
                          }
                        });
                        
                        // Show error message for files that are too large
                        if (invalidFiles.length > 0) {
                          const errorMsg =
                            language === 'ru'
                              ? `Файлы превышают максимальный размер (${MAX_UPLOAD_MB} МБ): ${invalidFiles.map((f) => f.name).join(', ')}`
                              : language === 'de'
                                ? `Dateien überschreiten ${MAX_UPLOAD_MB} MB: ${invalidFiles.map((f) => f.name).join(', ')}`
                                : `Files exceed maximum size (${MAX_UPLOAD_MB} MB): ${invalidFiles.map((f) => f.name).join(', ')}`;
                          toast.error(errorMsg, { duration: 5000 });
                        }
                        
                        // Add only valid files
                        const newFiles = [...currentFiles, ...validFiles].slice(0, SUBMISSION_MAX_FILES);
                        onFileChange(newFiles);
                        // Reset input to allow selecting the same file again
                        e.target.value = '';
                      }}
                      disabled={files.length >= SUBMISSION_MAX_FILES}
                      className="hidden"
                      id={`file-input-${question.id}`}
                    />
                    <label
                      htmlFor={`file-input-${question.id}`}
                      className={cn(
                        "px-4 py-2 rounded-lg border border-medical-300 bg-white hover:border-primary-500 cursor-pointer transition-all duration-200 flex items-center gap-2 text-sm font-medium min-h-[44px]",
                        files.length >= SUBMISSION_MAX_FILES && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      {language === 'ru'
                        ? files.length >= SUBMISSION_MAX_FILES
                          ? `Достигнут лимит (${SUBMISSION_MAX_FILES} файлов)`
                          : 'Выбрать файлы'
                        : language === 'de'
                          ? files.length >= SUBMISSION_MAX_FILES
                            ? `Limit (${SUBMISSION_MAX_FILES} Dateien)`
                            : 'Dateien auswählen'
                          : files.length >= SUBMISSION_MAX_FILES
                            ? `Limit reached (${SUBMISSION_MAX_FILES} files)`
                            : 'Choose files'}
                    </label>
                    {files.length > 0 && (
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div key={index} className="flex flex-wrap items-start gap-2 text-sm text-medical-700 bg-medical-50 p-2 rounded-lg min-w-0">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <span className="flex-1 min-w-0 break-words [overflow-wrap:anywhere]">{file.name}</span>
                            <span className={cn(
                              "text-medical-600",
                              file.size > 50 * 1024 * 1024 && "text-destructive font-semibold"
                            )}>
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              {file.size > 50 * 1024 * 1024 && (
                                <span className="ml-1" title={language === 'ru' ? 'Файл слишком большой' : language === 'de' ? 'Datei zu groß' : 'File too large'}>
                                  ⚠️
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newFiles = files.filter((_, i) => i !== index);
                                onFileChange(newFiles);
                              }}
                              className="ml-2 text-destructive hover:text-destructive/80 font-bold"
                              aria-label={language === 'ru' ? 'Удалить файл' : language === 'de' ? 'Datei löschen' : 'Remove file'}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional Fields for questions that need them */}
      {shouldShowAdditionalBlock && questionsWithAdditional.map((question) => {
        const additionalKey = `${question.id}_additional`;
        const additionalValue = additionalData[additionalKey] || '';
        const additionalError = errors[additionalKey];
        const isRequired = question.id === 'injuries' || question.id === 'pregnancy_problems' || 
                          question.id === 'what_else' || question.id === 'allergies' || 
                          question.id === 'skin_condition' || question.id === 'sleep' || 
                          question.id === 'operations' || question.id === 'weight_goal' ||
                          question.id === 'covid_complications' || question.id === 'hair_quality' ||
                          question.id === 'teeth_problems' || question.id === 'stones_kidneys_gallbladder';

        return (
          <motion.div
            key={additionalKey}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="mt-4"
          >
            <label className="text-sm font-medium text-medical-600 mb-2 block">
              {question.id === 'illness_antibiotics' 
                ? (language === 'ru' ? 'Укажите что именно (необязательно)' : language === 'de' ? 'Geben Sie an, was genau (optional)' : 'Specify what exactly (optional)')
                : question.id === 'pregnancy_problems'
                ? (language === 'ru' ? 'Опишите проблему' : language === 'de' ? 'Beschreiben Sie das Problem' : 'Describe the problem')
                : question.id === 'operations'
                ? (language === 'ru' ? 'Опишите какая операция была' : language === 'de' ? 'Beschreiben Sie, welche Operation durchgeführt wurde' : 'Describe what operation was performed')
                : question.id === 'weight_goal'
                ? (language === 'ru' ? 'Сколько килограмм?' : language === 'de' ? 'Wie viele Kilogramm?' : 'How many kilograms?')
                : question.id === 'covid_complications'
                ? (language === 'ru' ? 'Укажите какие еще осложнения' : language === 'de' ? 'Geben Sie an, welche weiteren Komplikationen' : 'Specify what other complications')
                : additionalLabel[language]}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </label>
            {question.id === 'weight_goal' ? (
              <input
                type="number"
                min="0"
                step="0.1"
                className={cn(
                  "w-full px-4 py-3 rounded-lg border border-medical-300 bg-white transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                  additionalError ? "border-destructive" : "hover:border-medical-400"
                )}
                value={additionalValue}
                onChange={(e) => onAdditionalChange(question.id, e.target.value)}
                placeholder={language === 'ru' ? 'Введите количество килограмм' : language === 'de' ? 'Geben Sie die Anzahl der Kilogramm ein' : 'Enter number of kilograms'}
              />
            ) : (
              <textarea
                className={cn(
                  "w-full px-4 py-3 rounded-lg border border-medical-300 bg-white min-h-[80px] resize-y transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                  additionalError ? "border-destructive" : "hover:border-medical-400"
                )}
                value={additionalValue}
                onChange={(e) => onAdditionalChange(question.id, e.target.value)}
                placeholder={
                  question.id === 'covid_complications'
                    ? (language === 'ru' ? 'Опишите другие осложнения' : language === 'de' ? 'Beschreiben Sie andere Komplikationen' : 'Describe other complications')
                    : additionalLabel[language]
                }
              />
            )}
            {additionalError && (
              <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {additionalError}
              </p>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
};

