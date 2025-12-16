# Budget Editor Design Document

## Overview

The Budget Editor is a comprehensive administrative interface that extends the existing admin dashboard to provide full budget management capabilities. It allows administrators to modify total budget amounts, adjust category allocations, and manage budgets across multiple fiscal years. The system builds upon the existing budget infrastructure while adding new UI components, API endpoints, and data management features for multi-year budget support.

## Architecture

The Budget Editor follows the existing three-tier architecture:

### Frontend Layer
- **BudgetEditor Component**: New React component providing the main editing interface
- **YearSelector Component**: Dropdown/selector for choosing fiscal years
- **BudgetForm Component**: Form handling budget input validation and submission
- **Navigation Integration**: Seamless integration with existing AdminDashboard

### Backend Layer
- **Enhanced Budget API**: Extended endpoints for multi-year budget operations
- **Budget Validation Service**: Server-side validation for budget constraints
- **Data Persistence Layer**: File-based storage with multi-year support

### Shared Layer
- **Enhanced Types**: Extended interfaces for multi-year budget data
- **Validation Functions**: Client and server-side validation utilities
- **Budget Calculation Utilities**: Enhanced functions for multi-year calculations

## Components and Interfaces

### Frontend Components

#### BudgetEditor
```typescript
interface BudgetEditorProps {
  onClose: () => void;
}

interface BudgetEditorState {
  selectedYear: number;
  budgetData: BudgetConfig | null;
  originalData: BudgetConfig | null;
  hasUnsavedChanges: boolean;
  validationErrors: ValidationError[];
  isLoading: boolean;
  isSaving: boolean;
}
```

#### YearSelector
```typescript
interface YearSelectorProps {
  selectedYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  hasUnsavedChanges: boolean;
}
```

#### BudgetForm
```typescript
interface BudgetFormProps {
  budgetData: BudgetConfig;
  onChange: (data: BudgetConfig) => void;
  validationErrors: ValidationError[];
  readOnly?: boolean;
}
```

### Backend API Extensions

#### Multi-Year Budget Endpoints
```typescript
// GET /api/budget/years - Get available fiscal years
// GET /api/budget/config/:year - Get budget config for specific year
// PUT /api/budget/config/:year - Update entire budget config for year
// POST /api/budget/config/:year - Create new budget config for year
// DELETE /api/budget/config/:year - Delete budget config for year
```

### Data Models

#### Enhanced BudgetConfig
```typescript
interface MultiBudgetConfig {
  [fiscalYear: number]: BudgetConfig;
}

interface BudgetConfig {
  fiscalYear: number;
  totalBudget: number;
  categories: Category[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Validation Models
```typescript
interface BudgetValidationResult {
  valid: boolean;
  errors: BudgetValidationError[];
  warnings: BudgetValidationWarning[];
}

interface BudgetValidationError {
  field: string;
  message: string;
  type: 'required' | 'invalid_format' | 'budget_exceeded' | 'negative_value';
}

interface BudgetValidationWarning {
  field: string;
  message: string;
  type: 'allocation_below_spent' | 'large_change';
}
```

## Data Models

### File Storage Structure
```
packages/backend/data/
├── budget.json (current year - backward compatibility)
├── budgets/
│   ├── 2024.json
│   ├── 2025.json
│   └── 2026.json
```

### Budget Data Migration
The system will maintain backward compatibility by:
1. Reading existing `budget.json` as the current fiscal year
2. Migrating to year-specific files when first edited
3. Maintaining the existing API structure for current year operations

## Error Handling

### Client-Side Error Handling
- **Validation Errors**: Real-time field validation with inline error messages
- **Network Errors**: Retry mechanisms with user feedback
- **Unsaved Changes**: Browser navigation warnings and confirmation dialogs
- **Year Switch Conflicts**: Confirmation dialogs when switching years with unsaved changes

### Server-Side Error Handling
- **Budget Validation**: Comprehensive validation with detailed error messages
- **File System Errors**: Graceful handling of file read/write failures
- **Concurrent Modifications**: Basic conflict detection and user notification
- **Data Integrity**: Rollback mechanisms for failed save operations

## Testing Strategy

The Budget Editor will employ a dual testing approach combining unit tests and property-based tests to ensure comprehensive coverage and correctness.

### Unit Testing
Unit tests will verify specific examples, edge cases, and integration points:
- Component rendering and user interactions
- API endpoint responses and error handling
- Form validation with specific invalid inputs
- Navigation and state management scenarios
- File system operations and data persistence

### Property-Based Testing
Property-based tests will verify universal properties using **fast-check** library with minimum 100 iterations per test. Each property-based test will include a comment explicitly referencing the correctness property using the format: **Feature: budget-editor, Property {number}: {property_text}**

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Total budget validation
*For any* numeric input to the total budget field, the system should accept positive numbers and reject non-positive numbers
**Validates: Requirements 2.1**

Property 2: Unallocated budget calculation
*For any* total budget modification, the unallocated budget amount should equal the total budget minus the sum of all category allocations
**Validates: Requirements 2.2**

Property 3: Budget persistence round-trip
*For any* valid total budget update, saving and then reloading the budget should return the same value
**Validates: Requirements 2.4**

Property 4: Category allocation validation
*For any* numeric input to category allocation fields, the system should accept non-negative numbers and reject negative numbers
**Validates: Requirements 3.1**

Property 5: Total allocation calculation
*For any* category allocation modification, the total allocated amount should equal the sum of all individual category allocations
**Validates: Requirements 3.2**

Property 6: Category allocation persistence round-trip
*For any* valid category allocation update, saving and then reloading the allocations should return the same values
**Validates: Requirements 3.4**

Property 7: Real-time UI updates
*For any* budget value modification, the displayed totals and remaining amounts should immediately reflect the new calculations
**Validates: Requirements 4.1**

Property 8: Save button state consistency
*For any* valid budget configuration, the save functionality should be enabled
**Validates: Requirements 4.3**

Property 9: Save button disabled for invalid state
*For any* invalid budget configuration (allocations exceeding total), the save functionality should be disabled
**Validates: Requirements 4.4**

Property 10: Year-specific data loading
*For any* fiscal year selection, the loaded budget data should correspond exactly to that year's stored configuration
**Validates: Requirements 5.1**

Property 11: Year-data association
*For any* save operation, the budget data should be stored and retrievable under the currently selected fiscal year
**Validates: Requirements 5.4**

Property 12: Current year display consistency
*For any* year selection, the interface should clearly display which fiscal year is currently being edited
**Validates: Requirements 5.5**

Property 13: Save operation completeness
*For any* valid budget data and selected year, the save operation should persist all changes to the correct year's data store
**Validates: Requirements 6.1**

Property 14: Save confirmation feedback
*For any* successful save operation, the interface should display confirmation and update to reflect the saved state
**Validates: Requirements 6.2**

Property 15: Cancel operation reversion
*For any* modified budget state, the cancel operation should restore all fields to their original values for the current fiscal year
**Validates: Requirements 6.3**

The testing strategy ensures both concrete bug detection through unit tests and general correctness verification through property-based testing, providing comprehensive validation of the budget editing functionality.