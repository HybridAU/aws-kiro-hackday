# Implementation Plan

- [x] 1. Extend backend data models and API for multi-year budget support
  - Create multi-year budget data structure and migration utilities
  - Add new API endpoints for year-specific budget operations
  - Implement server-side validation for multi-year budget data
  - _Requirements: 5.1, 5.4, 6.1_

- [x] 1.1 Create multi-year budget data types and utilities
  - Extend BudgetConfig interface with timestamp fields
  - Create MultiBudgetConfig interface for year-based storage
  - Implement data migration utilities for existing budget.json
  - _Requirements: 5.1, 5.4_

- [ ]* 1.2 Write property test for multi-year data structure
  - **Property 10: Year-specific data loading**
  - **Validates: Requirements 5.1**

- [x] 1.3 Implement multi-year budget file operations
  - Create functions to read/write year-specific budget files
  - Implement backward compatibility with existing budget.json
  - Add error handling for file system operations
  - _Requirements: 5.1, 5.4, 6.1_

- [ ]* 1.4 Write property test for year-data association
  - **Property 11: Year-data association**
  - **Validates: Requirements 5.4**

- [x] 1.5 Add new budget API endpoints
  - GET /api/budget/years - List available fiscal years
  - GET /api/budget/config/:year - Get budget config for specific year
  - PUT /api/budget/config/:year - Update budget config for year
  - POST /api/budget/config/:year - Create new budget config for year
  - _Requirements: 5.1, 5.4, 6.1_

- [ ]* 1.6 Write property test for save operation completeness
  - **Property 13: Save operation completeness**
  - **Validates: Requirements 6.1**

- [ ] 2. Create budget validation and calculation utilities
  - Implement comprehensive budget validation functions
  - Create real-time calculation utilities for UI updates
  - Add validation for edge cases and error conditions
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 4.1_

- [ ] 2.1 Implement budget input validation
  - Create validation functions for total budget (positive numbers only)
  - Create validation functions for category allocations (non-negative numbers)
  - Add validation result types with detailed error messages
  - _Requirements: 2.1, 3.1_

- [ ]* 2.2 Write property test for total budget validation
  - **Property 1: Total budget validation**
  - **Validates: Requirements 2.1**

- [ ]* 2.3 Write property test for category allocation validation
  - **Property 4: Category allocation validation**
  - **Validates: Requirements 3.1**

- [ ] 2.4 Implement budget calculation utilities
  - Create function for unallocated budget calculation
  - Create function for total allocation calculation
  - Add real-time calculation helpers for UI updates
  - _Requirements: 2.2, 3.2, 4.1_

- [ ]* 2.5 Write property test for unallocated budget calculation
  - **Property 2: Unallocated budget calculation**
  - **Validates: Requirements 2.2**

- [ ]* 2.6 Write property test for total allocation calculation
  - **Property 5: Total allocation calculation**
  - **Validates: Requirements 3.2**

- [ ] 3. Create BudgetEditor React component
  - Build main budget editing interface component
  - Implement state management for budget data and validation
  - Add navigation integration with admin dashboard
  - _Requirements: 1.1, 1.2, 1.4, 4.3, 4.4_

- [ ] 3.1 Create BudgetEditor component structure
  - Build component with proper TypeScript interfaces
  - Implement state management for budget data, validation, and UI state
  - Add loading and saving states
  - _Requirements: 1.1, 1.2_

- [ ] 3.2 Implement budget form fields and validation
  - Create input fields for total budget and category allocations
  - Add real-time validation with error display
  - Implement save/cancel button state management
  - _Requirements: 4.3, 4.4_

- [ ]* 3.3 Write property test for save button state consistency
  - **Property 8: Save button state consistency**
  - **Validates: Requirements 4.3**

- [ ]* 3.4 Write property test for save button disabled state
  - **Property 9: Save button disabled for invalid state**
  - **Validates: Requirements 4.4**

- [x] 3.5 Add navigation and integration with AdminDashboard
  - Create budget edit button in AdminDashboard
  - Implement navigation between dashboard and budget editor
  - Add unsaved changes confirmation dialogs
  - _Requirements: 1.1, 1.4_

- [ ] 4. Create YearSelector component
  - Build year selection dropdown component
  - Implement year switching with unsaved changes handling
  - Add year-specific data loading and display
  - _Requirements: 1.2, 5.1, 5.3, 5.5_

- [ ] 4.1 Build YearSelector component
  - Create dropdown component for fiscal year selection
  - Implement year change handling with confirmation dialogs
  - Add loading states for year switching
  - _Requirements: 1.2, 5.3_

- [ ]* 4.2 Write property test for current year display consistency
  - **Property 12: Current year display consistency**
  - **Validates: Requirements 5.5**

- [ ] 4.3 Implement year-specific data loading
  - Connect year selector to budget data loading
  - Handle missing data for new years with default initialization
  - Add error handling for year switching failures
  - _Requirements: 5.1_

- [ ] 5. Implement real-time UI updates and persistence
  - Add real-time calculation updates for budget modifications
  - Implement save and cancel operations with proper feedback
  - Add persistence round-trip validation
  - _Requirements: 4.1, 6.2, 6.3_

- [ ] 5.1 Implement real-time UI updates
  - Add immediate calculation updates for any budget field changes
  - Update totals, remaining amounts, and validation states in real-time
  - Ensure UI responsiveness during calculations
  - _Requirements: 4.1_

- [ ]* 5.2 Write property test for real-time UI updates
  - **Property 7: Real-time UI updates**
  - **Validates: Requirements 4.1**

- [ ] 5.3 Implement save and cancel operations
  - Create save operation with success feedback and UI updates
  - Create cancel operation that reverts to original values
  - Add confirmation dialogs for destructive actions
  - _Requirements: 6.2, 6.3_

- [ ]* 5.4 Write property test for save confirmation feedback
  - **Property 14: Save confirmation feedback**
  - **Validates: Requirements 6.2**

- [ ]* 5.5 Write property test for cancel operation reversion
  - **Property 15: Cancel operation reversion**
  - **Validates: Requirements 6.3**

- [ ] 5.6 Add persistence validation
  - Implement round-trip testing for budget data persistence
  - Add validation that saved data matches input data
  - Handle persistence errors with user feedback
  - _Requirements: 2.4, 3.4_

- [ ]* 5.7 Write property test for budget persistence round-trip
  - **Property 3: Budget persistence round-trip**
  - **Validates: Requirements 2.4**

- [ ]* 5.8 Write property test for category allocation persistence round-trip
  - **Property 6: Category allocation persistence round-trip**
  - **Validates: Requirements 3.4**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Integration and final testing
  - Integrate all components into the admin dashboard
  - Test complete user workflows and edge cases
  - Validate multi-year budget management functionality
  - _Requirements: All_

- [ ] 7.1 Complete integration with AdminDashboard
  - Add budget editor access from main dashboard
  - Ensure seamless navigation and state management
  - Test integration with existing budget display functionality
  - _Requirements: 1.1, 1.4_

- [ ]* 7.2 Write unit tests for component integration
  - Test AdminDashboard to BudgetEditor navigation
  - Test year switching with unsaved changes scenarios
  - Test error handling and user feedback flows
  - _Requirements: 1.1, 1.4, 5.3_

- [ ] 7.3 Validate complete user workflows
  - Test end-to-end budget editing workflows
  - Validate multi-year budget creation and management
  - Test edge cases like allocation exceeding budget
  - _Requirements: All_

- [ ] 8. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.