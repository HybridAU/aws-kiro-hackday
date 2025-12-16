// Application Status
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'categorized'
  | 'under_review'
  | 'approved'
  | 'rejected';

// File attachment (base64 encoded for hackathon simplicity)
export interface FileAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  data: string; // base64 encoded
  uploadedAt: Date;
}

// Application submitted by applicant
export interface Application {
  id: string;
  referenceNumber: string;
  applicantName: string;
  applicantEmail: string;
  projectTitle: string;
  projectDescription: string;
  requestedAmount: number;
  status: ApplicationStatus;
  submittedAt: Date;
  updatedAt: Date;
  categoryId: string | null;
  categorizationExplanation: string | null;
  categorizationConfidence: number | null;
  rankingScore: number | null;
  rankingBreakdown: CriterionScore[] | null;
  decision: 'approved' | 'rejected' | null;
  decisionReason: string | null;
  decidedAt: Date | null;
  attachments: FileAttachment[];
}

// Budget category
export interface Category {
  id: string;
  name: string;
  description: string;
  allocatedBudget: number;
  spentBudget: number;
  isActive: boolean;
}

// Ranking criterion
export interface RankingCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  categoryId: string | null;
}

// Score for a single criterion
export interface CriterionScore {
  criterionId: string;
  criterionName: string;
  score: number;
  weight: number;
  weightedScore: number;
  reasoning: string;
}

// Budget configuration
export interface BudgetConfig {
  fiscalYear: number;
  totalBudget: number;
  categories: Category[];
}

// AI response for conversation
export interface AIResponse {
  message: string;
  fieldUpdates: FieldUpdate[];
  isComplete: boolean;
  nextQuestion: string | null;
}

export interface FieldUpdate {
  field: string;
  value: string;
  confidence: number;
}

// Categorization result
export interface CategorizationResult {
  categoryId: string;
  categoryName: string;
  explanation: string;
  confidence: number;
}

// Ranked application
export interface RankedApplication {
  application: Application;
  totalScore: number;
  breakdown: CriterionScore[];
  rank: number;
}

// Chat message
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  fieldUpdates?: FieldUpdate[];
}

// Application form data (for creating/updating)
export interface ApplicationFormData {
  applicantName: string;
  applicantEmail: string;
  projectTitle: string;
  projectDescription: string;
  requestedAmount: number;
}

// Filter options
export interface ApplicationFilters {
  categoryId?: string;
  status?: ApplicationStatus;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

// Budget status response
export interface BudgetStatus {
  fiscalYear: number;
  totalBudget: number;
  totalAllocated: number;
  totalSpent: number;
  unallocated: number;
  categories: CategoryBudgetStatus[];
}

export interface CategoryBudgetStatus {
  category: Category;
  remaining: number;
  percentSpent: number;
  thresholdReached: boolean;
  pendingApplications: number;
}

// API Response types
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}
