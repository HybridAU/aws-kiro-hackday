# Grants Management System Design Document

## Overview

The Grants Management System is a web-based application with two distinct interfaces: a Customer Portal for organizations to apply for grants and an Admin Portal for grant administrators to assess applications. The system emphasizes security, auditability, and user experience while maintaining clear separation between applicant and administrative functions.

## Architecture

The system follows a three-tier architecture:

- **Presentation Layer**: Separate web interfaces for customers and administrators
- **Business Logic Layer**: Core application services handling authentication, application processing, and workflow management
- **Data Layer**: Persistent storage with comprehensive audit logging

### Technology Stack Considerations

- **Backend**: Node.js with Express.js or similar framework for API services
- **Database**: PostgreSQL for relational data with audit trail capabilities
- **Authentication**: JWT-based authentication with secure session management
- **Frontend**: React or Vue.js for responsive web interfaces
- **Security**: HTTPS enforcement, password hashing (bcrypt), input validation
- **Email**: Integration with email service provider for notifications

## Components and Interfaces

### Authentication Service
- User registration and login for both portals
- Password hashing and session management
- Role-based access control (Organization vs Grant_Administrator)
- Email verification workflow

### Application Management Service
- Grant application CRUD operations
- Application status workflow management
- Document upload and storage
- Application validation and business rules

### Assessment Service
- Assessment creation and management
- Scoring and evaluation tools
- Decision workflow (approve/reject/request info)
- Assessment history tracking

### Communication Service
- Message exchange between administrators and organizations
- Email notification system
- Portal notification management
- Communication history tracking

### Audit Service
- Comprehensive activity logging
- Data change tracking with versioning
- Access attempt logging
- Tamper-evident log storage

### User Interface Components

#### Customer Portal
- Registration and login pages
- Application dashboard showing all applications and statuses
- Application creation and editing forms
- Document upload interface
- Communication/messaging interface
- Status tracking and history view

#### Admin Portal
- Administrator login page
- Application review dashboard with filtering and sorting
- Detailed application review interface
- Assessment creation and editing tools
- Communication interface for contacting applicants
- Reporting and analytics dashboard

## Data Models

### User
```
User {
  id: UUID (primary key)
  email: String (unique)
  password_hash: String
  role: Enum (organization, administrator)
  created_at: Timestamp
  updated_at: Timestamp
  email_verified: Boolean
  last_login: Timestamp
}
```

### Organization
```
Organization {
  id: UUID (primary key)
  user_id: UUID (foreign key to User)
  name: String
  contact_person: String
  phone: String
  address: Text
  registration_number: String
  created_at: Timestamp
  updated_at: Timestamp
}
```

### Grant_Application
```
Grant_Application {
  id: UUID (primary key)
  organization_id: UUID (foreign key to Organization)
  reference_number: String (unique)
  title: String
  description: Text
  requested_amount: Decimal
  project_start_date: Date
  project_end_date: Date
  status: Enum (draft, submitted, under_review, approved, rejected)
  submitted_at: Timestamp
  created_at: Timestamp
  updated_at: Timestamp
}
```

### Assessment
```
Assessment {
  id: UUID (primary key)
  application_id: UUID (foreign key to Grant_Application)
  administrator_id: UUID (foreign key to User)
  score: Integer
  comments: Text
  recommendation: Enum (approve, reject, request_info)
  created_at: Timestamp
  updated_at: Timestamp
}
```

### Communication
```
Communication {
  id: UUID (primary key)
  application_id: UUID (foreign key to Grant_Application)
  sender_id: UUID (foreign key to User)
  recipient_id: UUID (foreign key to User)
  message: Text
  sent_at: Timestamp
  read_at: Timestamp
}
```

### Audit_Log
```
Audit_Log {
  id: UUID (primary key)
  user_id: UUID (foreign key to User)
  action: String
  resource_type: String
  resource_id: UUID
  old_values: JSON
  new_values: JSON
  timestamp: Timestamp
  ip_address: String
}
```
## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing all testable properties from the prework analysis, several can be consolidated to eliminate redundancy:

- Authentication properties (1.3, 1.4, 4.2, 4.3) can be combined into comprehensive authentication testing
- Status update properties (3.3, 5.4, 6.5) can be consolidated into a single status change property
- Access control properties (7.3, 7.4) can be combined into comprehensive access control testing
- Audit logging properties (8.1, 8.2, 8.4) can be consolidated into comprehensive audit logging

### Core Properties

**Property 1: Registration creates valid accounts**
*For any* valid organization registration data, submitting the registration should create a new account with correct information and trigger email verification
**Validates: Requirements 1.2**

**Property 2: Authentication grants appropriate access**
*For any* valid user credentials, authentication should succeed and grant access to the appropriate portal (Customer or Admin) based on user role
**Validates: Requirements 1.3, 4.2**

**Property 3: Invalid authentication is rejected**
*For any* invalid credentials (wrong password, non-existent user, malformed input), authentication attempts should be rejected with appropriate error messages
**Validates: Requirements 1.4, 4.3**

**Property 4: Application data persistence**
*For any* application data, saving as draft should store the data with "draft" status, and submitting complete applications should change status to "submitted" with unique reference number
**Validates: Requirements 2.2, 2.3, 2.5**

**Property 5: Incomplete application rejection**
*For any* application missing required fields, submission attempts should be rejected and missing fields should be identified
**Validates: Requirements 2.4**

**Property 6: Data access isolation**
*For any* organization user, they should only be able to access their own applications and not see data from other organizations
**Validates: Requirements 7.3**

**Property 7: Status change notifications**
*For any* application status update, the system should notify the organization via email and record the change with timestamp and administrator identity
**Validates: Requirements 3.3, 5.4**

**Property 8: Communication delivery and storage**
*For any* message sent between administrators and organizations, the message should be delivered via email and portal notification, and stored in the application's communication history
**Validates: Requirements 6.2, 6.4**

**Property 9: Comprehensive audit logging**
*For any* user action in the system, the action should be logged with user identity, timestamp, affected resources, and maintain tamper-evident storage
**Validates: Requirements 8.1, 8.4**

**Property 10: Session management security**
*For any* user session, expired sessions should redirect to login, logout should terminate sessions, and all authentication should use secure password hashing
**Validates: Requirements 4.4, 4.5, 7.2**

## Error Handling

### Input Validation
- All user inputs must be validated and sanitized before processing
- Invalid data should result in clear, actionable error messages
- SQL injection and XSS prevention through parameterized queries and output encoding

### Authentication Errors
- Failed login attempts should be logged and rate-limited
- Account lockout after multiple failed attempts
- Clear distinction between "user not found" and "invalid password" should be avoided for security

### Application Processing Errors
- Database connection failures should be handled gracefully
- File upload errors should provide clear feedback
- Email delivery failures should be logged and retried

### System Errors
- Unhandled exceptions should be logged with full stack traces
- Users should see generic error messages while detailed errors are logged
- System should fail securely, denying access rather than granting it

## Testing Strategy

### Dual Testing Approach

The system will employ both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests** verify specific examples, edge cases, and integration points
- **Property tests** verify universal properties across all valid inputs
- Together they provide complete coverage: unit tests catch concrete bugs, property tests verify general correctness

### Property-Based Testing

- **Framework**: fast-check for JavaScript/TypeScript will be used for property-based testing
- **Configuration**: Each property-based test will run a minimum of 100 iterations
- **Tagging**: Each property-based test will include a comment with the format: **Feature: grants-management-system, Property {number}: {property_text}**
- **Implementation**: Each correctness property will be implemented by a single property-based test

### Unit Testing

Unit tests will focus on:
- Specific examples demonstrating correct behavior
- Edge cases like empty inputs, boundary values, and error conditions
- Integration between components
- Authentication flows and security measures

### Test Coverage Areas

- **Authentication and Authorization**: Login flows, role-based access, session management
- **Application Lifecycle**: Creation, submission, status changes, assessments
- **Data Validation**: Input sanitization, required field validation, business rules
- **Communication**: Message delivery, notification systems, email integration
- **Security**: HTTPS enforcement, data encryption, access controls
- **Audit**: Logging completeness, data integrity, tamper evidence

### Testing Environment

- Separate test database with realistic but anonymized data
- Mock email services for testing notifications
- Automated test execution in CI/CD pipeline
- Performance testing for concurrent user scenarios