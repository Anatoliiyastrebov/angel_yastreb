// API client for secure questionnaire storage

import type { FormData as QuestionnaireFormValues, FormAdditionalData, ContactData } from '@/lib/form-utils';

const API_BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || '/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type QuestionnaireListItem = {
  id: string;
  formData: QuestionnaireFormValues;
  additionalData: FormAdditionalData;
  contactData: ContactData;
};

type JsonObject = Record<string, unknown>;

function jsonErrorMessage(data: JsonObject): string | undefined {
  const e = data.error;
  return typeof e === 'string' ? e : undefined;
}

// Session management
let sessionToken: string | null = localStorage.getItem('sessionToken') || null;
let sessionExpiresAt: number | null = null;

export function setSessionToken(token: string, expiresAt: number) {
  sessionToken = token;
  sessionExpiresAt = expiresAt;
  localStorage.setItem('sessionToken', token);
  localStorage.setItem('sessionExpiresAt', expiresAt.toString());
}

export function getSessionToken(): string | null {
  if (!sessionToken) {
    sessionToken = localStorage.getItem('sessionToken');
    const expiresAtStr = localStorage.getItem('sessionExpiresAt');
    if (expiresAtStr) {
      sessionExpiresAt = parseInt(expiresAtStr, 10);
    }
  }
  
  // Check if session is expired
  if (sessionExpiresAt && Date.now() > sessionExpiresAt) {
    clearSession();
    return null;
  }
  
  return sessionToken;
}

export function clearSession() {
  sessionToken = null;
  sessionExpiresAt = null;
  localStorage.removeItem('sessionToken');
  localStorage.removeItem('sessionExpiresAt');
}

// Helper function to safely parse JSON response
async function parseJsonResponse(response: Response): Promise<JsonObject> {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
  }
  const raw: unknown = await response.json();
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as JsonObject;
  }
  return {};
}

// Send OTP
export async function sendOTP(telegram?: string, phone?: string): Promise<ApiResponse<{ message: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ telegram, phone }),
    });

    const data = await parseJsonResponse(response);
    
    if (!response.ok) {
      return { success: false, error: jsonErrorMessage(data) || 'Failed to send OTP' };
    }

    return { success: true, data: data as { message: string } };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

// Verify OTP and get session token
export async function verifyOTP(
  telegram: string | undefined,
  phone: string | undefined,
  otp: string
): Promise<ApiResponse<{ sessionToken: string; expiresAt: number }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ telegram, phone, otp }),
    });

    const data = await parseJsonResponse(response);
    
    if (!response.ok) {
      return { success: false, error: jsonErrorMessage(data) || 'Failed to verify OTP' };
    }

    const ok = data.success === true;
    const token = typeof data.sessionToken === 'string' ? data.sessionToken : undefined;
    const expiresAt = typeof data.expiresAt === 'number' ? data.expiresAt : undefined;
    if (ok && token !== undefined && expiresAt !== undefined) {
      setSessionToken(token, expiresAt);
    }

    return {
      success: true,
      data: {
        sessionToken: token ?? '',
        expiresAt: expiresAt ?? 0,
      },
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

// Save questionnaire
// sessionToken is optional - if not provided, contact_identifier will be extracted from questionnaire.contactData
export async function saveQuestionnaire(questionnaire: unknown): Promise<ApiResponse<{ id: string }>> {
  const token = getSessionToken();

  try {
    const response = await fetch(`${API_BASE_URL}/questionnaires/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        ...(token ? { sessionToken: token } : {}), // Only include sessionToken if available
        questionnaire 
      }),
    });

    // Handle non-JSON responses (like 500 errors with HTML)
    if (!response.ok && response.status >= 500) {
      const text = await response.text();
      console.error('Server error (500):', text.substring(0, 200));
      return { 
        success: false, 
        error: 'Server error. Please try again later.' 
      };
    }

    const data = await parseJsonResponse(response);
    
    if (!response.ok) {
      if (response.status === 401 && token) {
        clearSession();
      }
      return { success: false, error: jsonErrorMessage(data) || 'Failed to save questionnaire' };
    }

    return { success: true, data: data as { id: string } };
  } catch (error) {
    // Better error handling for network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error saving questionnaire:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.' 
      };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// Get all questionnaires
export async function getQuestionnaires(): Promise<
  ApiResponse<{ questionnaires: QuestionnaireListItem[] }>
> {
  const token = getSessionToken();
  if (!token) {
    return { success: false, error: 'Session expired. Please authenticate again.' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/questionnaires/get?sessionToken=${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await parseJsonResponse(response);
    
    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
      }
      return { success: false, error: jsonErrorMessage(data) || 'Failed to get questionnaires' };
    }

    return {
      success: true,
      data: data as { questionnaires: QuestionnaireListItem[] },
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

// Delete questionnaire
export async function deleteQuestionnaire(questionnaireId: string): Promise<ApiResponse<void>> {
  const token = getSessionToken();
  if (!token) {
    return { success: false, error: 'Session expired. Please authenticate again.' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/questionnaires/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionToken: token, questionnaireId }),
    });

    const data = await parseJsonResponse(response);
    
    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
      }
      return { success: false, error: jsonErrorMessage(data) || 'Failed to delete questionnaire' };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}
