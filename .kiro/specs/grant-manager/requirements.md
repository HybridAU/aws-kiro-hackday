# Requirements Document

## Introduction

Dove Grants is a streamlined grant attribution system with a revolutionary split-screen interface. For applicants: an AI conversational companion on one side guides them through the application via voice/text chat, while the application form auto-populates on the other side. For administrators: the AI companion assists with analysis while the management dashboard displays on the other side. The system manages a yearly budget divided into preset categories (medical, sport, etc.), automatically categorizes incoming applications using AI, and ranks competing applications within each category based on predefined criteria.

## Glossary

- **Dove Grants**: The grant management application
- **Grant Application**: A funding request submitted by an applicant
- **Category**: A predefined budget allocation area (e.g., Medical, Sport, Education, Arts)
- **Yearly Budget**: The total funding available for grant distribution in a fiscal year
- **Category Budget**: The portion of yearly budget allocated to a specific category
- **AI Categorization**: Automatic classification of applications into categories with explanations
- **Ranking Score**: A calculated score based on predefined criteria used to compare applications
- **Ranking Criteria**: Configurable factors used to evaluate and compare applications (e.g., impact, feasibility, budget efficiency)
- **AI Companion**: The conversational AI assistant that guides users through voice/text chat
- **Split-Screen Interface**: The dual-panel layout with AI chat on one side and forms/dashboard on the other
- **Live Form Sync**: Real-time population of form fields based on conversation with AI Companion

## Requirements

### Requirement 1

**User Story:** As an applicant, I want to submit a grant application with minimal effort, so that I can request funding quickly and easily.

#### Acceptance Criteria

1. WHEN an applicant starts a new application THEN Dove Grants SHALL present a split-screen interface with AI Companion chat on the left and application form on the right
2. WHEN an applicant provides information via the AI Companion THEN Dove Grants SHALL automatically populate the corresponding form fields in real-time
3. WHEN an applicant submits the application THEN Dove Grants SHALL validate required fields and confirm submission with a reference number
4. IF an applicant leaves required fields empty THEN Dove Grants SHALL highlight the missing fields and prompt the AI Companion to ask for the missing information
5. WHEN an applicant submits successfully THEN Dove Grants SHALL send a confirmation to the applicant email address

### Requirement 2

**User Story:** As an applicant, I want to interact with an AI companion via voice or text, so that I can complete my application conversationally without filling out forms manually.

#### Acceptance Criteria

1. WHEN an applicant activates voice mode THEN Dove Grants SHALL capture audio and enable real-time voice conversation with the AI Companion
2. WHEN the AI Companion asks questions THEN Dove Grants SHALL extract relevant information from responses and populate form fields automatically
3. WHEN an applicant prefers typing THEN Dove Grants SHALL allow text-based chat with the AI Companion as an alternative to voice
4. IF voice input is unavailable or fails THEN Dove Grants SHALL display a message and switch to text-based chat mode
5. WHEN the AI Companion populates a field THEN Dove Grants SHALL highlight the updated field briefly to show the applicant what changed

### Requirement 3

**User Story:** As an administrator, I want to configure yearly budget and category allocations, so that I can control funding distribution.

#### Acceptance Criteria

1. WHEN an administrator sets the yearly budget THEN Dove Grants SHALL store the total amount and make it available for allocation
2. WHEN an administrator creates a category THEN Dove Grants SHALL store the category name and allocated budget amount
3. WHEN an administrator views budget status THEN Dove Grants SHALL display total budget, allocated amounts per category, and remaining unallocated funds
4. IF category allocations exceed the yearly budget THEN Dove Grants SHALL display a warning and prevent saving

### Requirement 4

**User Story:** As an administrator, I want applications to be automatically categorized with AI explanations, so that I can process applications faster.

#### Acceptance Criteria

1. WHEN a new application is submitted THEN Dove Grants SHALL analyze the project description and assign a category automatically
2. WHEN AI assigns a category THEN Dove Grants SHALL provide a text explanation of why that category was selected
3. WHEN AI categorization completes THEN Dove Grants SHALL display a confidence score (0-100%) for the assignment
4. WHEN an administrator views an application THEN Dove Grants SHALL display the AI-assigned category, explanation, and confidence score
5. WHEN an administrator disagrees with AI categorization THEN Dove Grants SHALL allow manual category override

### Requirement 5

**User Story:** As an administrator, I want to define ranking criteria for evaluating applications, so that I can compare applications objectively.

#### Acceptance Criteria

1. WHEN an administrator creates a ranking criterion THEN Dove Grants SHALL store the criterion name, description, and weight (importance)
2. WHEN an administrator configures criteria THEN Dove Grants SHALL allow setting criteria per category or globally
3. WHEN criteria weights are set THEN Dove Grants SHALL normalize weights to sum to 100%
4. WHEN an administrator views criteria THEN Dove Grants SHALL display all active criteria with their weights

### Requirement 6

**User Story:** As an administrator, I want applications ranked automatically within their category, so that I can identify the best candidates quickly.

#### Acceptance Criteria

1. WHEN an administrator requests ranking for a category THEN Dove Grants SHALL calculate scores for all applications in that category based on defined criteria
2. WHEN ranking is calculated THEN Dove Grants SHALL display applications sorted by score from highest to lowest
3. WHEN displaying ranked applications THEN Dove Grants SHALL show the total score and breakdown by each criterion
4. WHEN an application is ranked THEN Dove Grants SHALL provide AI-generated reasoning for the score assigned to each criterion

### Requirement 7

**User Story:** As an administrator, I want to approve or reject applications and track budget impact, so that I can make informed funding decisions.

#### Acceptance Criteria

1. WHEN an administrator approves an application THEN Dove Grants SHALL deduct the requested amount from the category budget
2. WHEN an administrator rejects an application THEN Dove Grants SHALL record the rejection and optionally store a reason
3. WHEN viewing a category THEN Dove Grants SHALL display remaining budget and number of pending applications
4. IF approving an application would exceed the category budget THEN Dove Grants SHALL display a warning before confirmation

### Requirement 8

**User Story:** As an administrator, I want to view a dashboard of all applications and budget status, so that I can monitor the grant cycle at a glance.

#### Acceptance Criteria

1. WHEN an administrator opens the dashboard THEN Dove Grants SHALL display summary cards for each category showing budget used, remaining, and application counts
2. WHEN an administrator views the dashboard THEN Dove Grants SHALL show a list of recent applications with status and assigned category
3. WHEN an administrator filters by category or status THEN Dove Grants SHALL update the displayed applications accordingly
4. WHEN budget thresholds are reached (e.g., 80% spent) THEN Dove Grants SHALL highlight the category visually

### Requirement 9

**User Story:** As a developer, I want application and budget data persisted reliably, so that no data is lost.

#### Acceptance Criteria

1. WHEN data is saved THEN Dove Grants SHALL serialize to JSON format for storage
2. WHEN data is loaded THEN Dove Grants SHALL deserialize JSON and reconstruct all objects correctly
3. WHEN data is serialized then deserialized THEN Dove Grants SHALL produce data equivalent to the original (round-trip consistency)
4. IF data parsing fails THEN Dove Grants SHALL report clear error messages without corrupting existing data
