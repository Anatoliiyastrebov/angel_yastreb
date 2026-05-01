import React from 'react';
import { motion } from 'framer-motion';
import { Question } from '@/lib/questionnaire-data';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface CompactQuestionFieldProps {
  question: Question;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  error?: string;
  formData?: { [key: string]: string | string[] };
}

export const CompactQuestionField: React.FC<CompactQuestionFieldProps> = ({
  question,
  value,
  onChange,
  error,
  formData,
}) => {
  const { language } = useLanguage();

  const handleCheckboxChange = (optionValue: string, checked: boolean) => {
    const currentValues = Array.isArray(value) ? value : [];
    
    if (optionValue === 'no_issues') {
      if (checked) {
        onChange(['no_issues']);
      } else {
        onChange([]);
      }
    } else {
      if (checked) {
        const filteredValues = currentValues.filter((v) => v !== 'no_issues');
        onChange([...filteredValues, optionValue]);
      } else {
        onChange(currentValues.filter((v) => v !== optionValue));
      }
    }
  };

  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            className={cn(
              "w-full px-4 py-3 rounded-lg border border-medical-300 bg-white transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              error ? "border-destructive" : "hover:border-medical-400"
            )}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder?.[language] || ''}
          />
        );

      case 'number': {
        const isAgeMonths = question.id === 'age_months';
        const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const inputValue = e.target.value;
          if (isAgeMonths) {
            const intValue = inputValue.replace(/[^0-9]/g, '');
            onChange(intValue === '' || intValue === '0' ? '' : intValue);
          } else {
            onChange(inputValue);
          }
        };

        return (
          <input
            type="number"
            className={cn(
              "w-full px-4 py-3 rounded-lg border border-medical-300 bg-white transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              error ? "border-destructive" : "hover:border-medical-400"
            )}
            value={value as string}
            onChange={handleNumberChange}
            min={question.min !== undefined ? question.min : 0}
            max={question.max !== undefined ? question.max : undefined}
            step={isAgeMonths ? "1" : "0.1"}
            onKeyDown={isAgeMonths ? (e) => {
              if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                e.preventDefault();
              }
            } : undefined}
          />
        );
      }

      case 'textarea':
        return (
          <textarea
            className={cn(
              "w-full px-4 py-3 rounded-lg border border-medical-300 bg-white min-h-[120px] resize-y transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              error ? "border-destructive" : "hover:border-medical-400"
            )}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder?.[language] || ''}
          />
        );

      case 'radio':
        return (
          <div className="flex flex-wrap gap-2.5">
            {question.options?.map((option) => {
              const isSelected = value === option.value;
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value)}
                  className={cn(
                    "px-5 py-3 rounded-lg font-medium text-base min-h-[44px] transition-all duration-200",
                    "border border-medical-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                    isSelected
                      ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                      : "bg-white text-medical-700 hover:border-primary-500 hover:bg-medical-50"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {option.label[language]}
                </motion.button>
              );
            })}
          </div>
        );

      case 'checkbox': {
        const currentValues = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-2.5">
            {question.options?.map((option) => {
              const isSelected = currentValues.includes(option.value);
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  onClick={() => handleCheckboxChange(option.value, !isSelected)}
                  className={cn(
                    "px-5 py-3 rounded-lg font-medium text-base min-h-[44px] transition-all duration-200",
                    "border border-medical-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                    isSelected
                      ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                      : "bg-white text-medical-700 hover:border-primary-500 hover:bg-medical-50"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {option.label[language]}
                </motion.button>
              );
            })}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-medical-700">
          {question.label[language]}
        </span>
        {question.required && <span className="text-destructive">*</span>}
      </div>

      {renderInput()}

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-destructive flex items-center gap-1.5"
        >
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
          {error}
        </motion.p>
      )}
    </motion.div>
  );
};

