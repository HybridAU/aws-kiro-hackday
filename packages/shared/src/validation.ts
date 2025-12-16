import type { ApplicationFormData, ValidationResult, ValidationError } from './types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateApplicationForm(data: Partial<ApplicationFormData>): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate applicantName
  if (!data.applicantName || data.applicantName.trim() === '') {
    errors.push({ field: 'applicantName', message: 'Name is required' });
  }

  // Validate applicantEmail
  if (!data.applicantEmail || data.applicantEmail.trim() === '') {
    errors.push({ field: 'applicantEmail', message: 'Email is required' });
  } else if (!EMAIL_REGEX.test(data.applicantEmail)) {
    errors.push({ field: 'applicantEmail', message: 'Invalid email format' });
  }

  // Validate projectTitle
  if (!data.projectTitle || data.projectTitle.trim() === '') {
    errors.push({ field: 'projectTitle', message: 'Project title is required' });
  }

  // Validate projectDescription
  if (!data.projectDescription || data.projectDescription.trim() === '') {
    errors.push({ field: 'projectDescription', message: 'Project description is required' });
  }

  // Validate requestedAmount
  if (data.requestedAmount === undefined || data.requestedAmount === null) {
    errors.push({ field: 'requestedAmount', message: 'Requested amount is required' });
  } else if (typeof data.requestedAmount !== 'number' || isNaN(data.requestedAmount)) {
    errors.push({ field: 'requestedAmount', message: 'Requested amount must be a number' });
  } else if (data.requestedAmount <= 0) {
    errors.push({ field: 'requestedAmount', message: 'Requested amount must be greater than zero' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getRequiredFields(): (keyof ApplicationFormData)[] {
  return ['applicantName', 'applicantEmail', 'projectTitle', 'projectDescription', 'requestedAmount'];
}

export function getMissingFields(data: Partial<ApplicationFormData>): (keyof ApplicationFormData)[] {
  const result = validateApplicationForm(data);
  return result.errors.map((e) => e.field as keyof ApplicationFormData);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
