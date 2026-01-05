# Test Plan - B2Proof

## 1. Introduction and Testing Objectives

### 1.1 Purpose

This document defines the comprehensive test plan for B2Proof, a SaaS web application designed for freelancers and small businesses to streamline the process of creating, sharing, and accepting project briefs. The plan ensures the application meets all functional requirements, maintains security standards, and delivers a reliable user experience.

### 1.2 Testing Objectives

- **Functional Validation**: Verify all features work according to PRD specifications
- **Security Assurance**: Ensure proper authorization, authentication, and data protection (GDPR compliance)
- **Data Integrity**: Validate database operations, cascading deletes, and denormalized data consistency
- **User Experience**: Confirm responsive design, accessibility, and intuitive workflows
- **Performance Baseline**: Establish acceptable response times for critical operations
- **Regression Prevention**: Detect breaking changes introduced during development

### 1.3 Quality Goals

| Metric                     | Target                          |
| -------------------------- | ------------------------------- |
| Unit Test Coverage         | ≥80% for services and utilities |
| Integration Test Coverage  | 100% of API endpoints           |
| Critical Path E2E Coverage | 100% of user stories            |
| P0/P1 Bug Rate             | 0 at release                    |
| Accessibility Score        | WCAG 2.1 AA compliant           |

---

## 2. Scope of Testing

### 2.1 In Scope

#### Features Under Test

| Module               | Components                                              |
| -------------------- | ------------------------------------------------------- |
| **Authentication**   | Registration, Login, Logout, Session Management         |
| **User Management**  | Profile View, Password Change, Account Deletion         |
| **Brief Management** | Create, Edit, Delete, List with Pagination              |
| **Status Workflow**  | Draft → Sent → Accepted/Rejected/Needs Modification     |
| **Sharing System**   | Share by Email, Recipient Management, Access Revocation |
| **Comment System**   | Create, Delete, List with Pagination                    |
| **Authorization**    | Role-based Access (Creator/Client), RLS Policies        |
| **UI Components**    | Forms, Lists, Modals, Navigation, Responsive Layout     |

#### Technical Components

- Next.js 15 App Router (Server/Client Components)
- Supabase Authentication (JWT-based)
- PostgreSQL with Row Level Security
- Zod Schema Validation
- TipTap Rich Text Editor

### 2.2 Out of Scope

- Performance/Load testing (post-MVP)
- Browser compatibility testing beyond modern browsers
- Native mobile testing (web-only application)
- Third-party integration testing
- Penetration testing (separate security audit)

---

## 3. Types of Testing

### 3.1 Unit Testing

**Purpose**: Test individual functions, utilities, and isolated business logic.

**Target Areas**:

- Service layer functions (`src/lib/services/`)
- Utility functions (`src/lib/utils/`)
- Zod validation schemas (`src/lib/schemas/`)
- Data mappers and transformers
- Authorization utility functions

**Coverage Requirements**:

- All service methods with mocked dependencies
- All validation schemas with valid/invalid inputs
- All utility functions with edge cases
- Error handling paths

### 3.2 Integration Testing

**Purpose**: Test API endpoints with database interactions.

**Target Areas**:

- All 15 API Route Handlers (`src/app/api/`)
- Database operations with RLS policies
- Authentication middleware
- Service layer with real database

**Coverage Requirements**:

- All HTTP methods per endpoint
- All response status codes (200, 201, 400, 401, 403, 404, 500)
- Query parameter handling
- Request body validation
- Authorization enforcement

### 3.3 End-to-End Testing

**Purpose**: Test complete user workflows through the UI.

**Target Areas**:

- All 22 user stories from PRD
- Critical user journeys
- Cross-feature interactions
- Error states and recovery

**Coverage Requirements**:

- Happy path for all user stories
- Key error scenarios
- Role-specific workflows (Creator vs Client)

### 3.4 Component Testing

**Purpose**: Test React components in isolation.

**Target Areas**:

- Form components (validation, submission)
- List components (pagination, filtering)
- Modal dialogs (confirmation, sharing)
- TipTap editor integration

**Coverage Requirements**:

- Render states (loading, empty, error, success)
- User interactions (clicks, inputs)
- Accessibility attributes

### 3.5 Security Testing

**Purpose**: Verify authentication, authorization, and data protection.

**Target Areas**:

- Authentication flows
- RLS policy enforcement
- Role-based access control
- Input sanitization (XSS prevention)
- CSRF protection

---

## 4. Test Scenarios for Key Functionalities

### 4.1 Authentication Module

#### TC-AUTH-001: User Registration (US-001)

| ID    | Scenario                       | Input                                                   | Expected Result                                     |
| ----- | ------------------------------ | ------------------------------------------------------- | --------------------------------------------------- |
| 001.1 | Valid creator registration     | Valid email, password (8+ chars, 1 digit), role=creator | Account created, user logged in, redirect to briefs |
| 001.2 | Valid client registration      | Valid email, password, role=client                      | Account created, user logged in, redirect to briefs |
| 001.3 | Duplicate email                | Existing email                                          | Error: "Email already registered"                   |
| 001.4 | Invalid email format           | "invalid-email"                                         | Validation error on email field                     |
| 001.5 | Password too short             | "Pass1" (5 chars)                                       | Error: "Minimum 8 characters required"              |
| 001.6 | Password without digit         | "Password"                                              | Error: "Must contain at least one digit"            |
| 001.7 | Missing role selection         | No role selected                                        | Error: "Role is required"                           |
| 001.8 | Password confirmation mismatch | password ≠ confirmPassword                              | Client-side error (not sent to backend)             |

#### TC-AUTH-002: User Login (US-002)

| ID    | Scenario                | Input                         | Expected Result                   |
| ----- | ----------------------- | ----------------------------- | --------------------------------- |
| 002.1 | Valid credentials       | Correct email/password        | Login success, redirect to briefs |
| 002.2 | Invalid password        | Correct email, wrong password | Error: "Invalid credentials"      |
| 002.3 | Non-existent email      | Unregistered email            | Error: "Invalid credentials"      |
| 002.4 | Empty fields            | Empty email or password       | Validation errors                 |
| 002.5 | Previous session exists | Login with existing session   | Previous session terminated       |

#### TC-AUTH-003: Logout (US-019)

| ID    | Scenario                            | Expected Result                  |
| ----- | ----------------------------------- | -------------------------------- |
| 003.1 | Logout from navigation              | Session ended, redirect to login |
| 003.2 | Access protected route after logout | Redirect to login page           |

### 4.2 Brief Management Module

#### TC-BRIEF-001: Create Brief (US-003)

| ID    | Scenario                  | Input                                                       | Expected Result                      |
| ----- | ------------------------- | ----------------------------------------------------------- | ------------------------------------ |
| 001.1 | Valid brief creation      | Header (50 chars), Content (TipTap JSON), Footer (optional) | Brief created with "Draft" status    |
| 001.2 | Header at max length      | 200 characters                                              | Success                              |
| 001.3 | Header exceeds limit      | 201 characters                                              | Validation error                     |
| 001.4 | Content at max length     | 10,000 characters                                           | Success                              |
| 001.5 | Content exceeds limit     | 10,001 characters                                           | Validation error                     |
| 001.6 | Missing required header   | Empty header                                                | Validation error                     |
| 001.7 | Missing required content  | Empty content                                               | Validation error                     |
| 001.8 | Creator at 20 brief limit | Attempt to create 21st brief                                | Error: "Brief limit reached (20/20)" |
| 001.9 | Client attempts creation  | Client role user                                            | 403 Forbidden                        |

#### TC-BRIEF-002: Edit Brief (US-004)

| ID    | Scenario                       | Initial Status     | Expected Result                      |
| ----- | ------------------------------ | ------------------ | ------------------------------------ |
| 002.1 | Edit draft brief               | Draft              | Brief updated, status remains Draft  |
| 002.2 | Edit sent brief                | Sent               | Brief updated, status reset to Draft |
| 002.3 | Edit accepted brief            | Accepted           | Warning shown, status reset to Draft |
| 002.4 | Edit rejected brief            | Rejected           | Brief updated, status reset to Draft |
| 002.5 | Edit needs_modification brief  | Needs Modification | Brief updated, status reset to Draft |
| 002.6 | Non-owner attempts edit        | Any                | 403 Forbidden                        |
| 002.7 | Client attempts edit           | Any                | 403 Forbidden                        |
| 002.8 | Recipients retained after edit | Sent               | All recipients keep access           |

#### TC-BRIEF-003: Delete Brief (US-005)

| ID    | Scenario                     | Expected Result                          |
| ----- | ---------------------------- | ---------------------------------------- |
| 003.1 | Owner deletes brief          | Brief and all comments deleted           |
| 003.2 | Non-owner attempts delete    | 403 Forbidden                            |
| 003.3 | Delete confirmation required | Modal shown before deletion              |
| 003.4 | Deleted brief unavailable    | 404 Not Found on subsequent access       |
| 003.5 | Brief count decremented      | User can create new brief after deletion |

#### TC-BRIEF-004: List Briefs (US-006)

| ID    | Scenario            | Expected Result                           |
| ----- | ------------------- | ----------------------------------------- |
| 004.1 | List own briefs     | Returns briefs where user is owner        |
| 004.2 | List shared briefs  | Returns briefs shared with user           |
| 004.3 | Pagination (page 1) | Returns first 10 briefs                   |
| 004.4 | Pagination (page 2) | Returns briefs 11-20                      |
| 004.5 | Filter by status    | Returns only briefs with specified status |
| 004.6 | Sort by updated_at  | Newest first                              |
| 004.7 | Empty list          | Empty array with pagination metadata      |
| 004.8 | Visual distinction  | Own vs shared briefs labeled correctly    |

### 4.3 Status Workflow Module

#### TC-STATUS-001: Status Transitions (US-009, US-010, US-011)

| ID    | Scenario                           | Current Status | Action                          | Expected Result                        |
| ----- | ---------------------------------- | -------------- | ------------------------------- | -------------------------------------- |
| 001.1 | Share first recipient              | Draft          | Share                           | Status changes to Sent                 |
| 001.2 | Client accepts                     | Sent           | Accept                          | Status changes to Accepted             |
| 001.3 | Client rejects                     | Sent           | Reject                          | Status changes to Rejected             |
| 001.4 | Client requests modification       | Sent           | Needs Modification              | Requires comment, status changes       |
| 001.5 | Client changes from accepted       | Accepted       | Any action                      | 403 Forbidden (final state for client) |
| 001.6 | Owner edits accepted               | Accepted       | Edit brief                      | Status resets to Draft                 |
| 001.7 | Needs modification without comment | Sent           | Needs Modification (no comment) | Validation error                       |

#### TC-STATUS-002: Authorization

| ID    | Scenario                     | User Role           | Expected Result |
| ----- | ---------------------------- | ------------------- | --------------- |
| 002.1 | Owner changes status         | Creator (owner)     | 403 Forbidden   |
| 002.2 | Client changes status        | Client (recipient)  | Success         |
| 002.3 | Non-recipient changes status | Client (not shared) | 403 Forbidden   |

### 4.4 Sharing System Module

#### TC-SHARE-001: Share Brief (US-007)

| ID    | Scenario                      | Expected Result                         |
| ----- | ----------------------------- | --------------------------------------- |
| 001.1 | Share with registered user    | Recipient added, status → Sent          |
| 001.2 | Share with unregistered email | Pending invitation created              |
| 001.3 | Share with 10th recipient     | Success (at limit)                      |
| 001.4 | Share with 11th recipient     | Error: "Maximum 10 recipients"          |
| 001.5 | Duplicate email share         | Error: "Already shared with this email" |
| 001.6 | Invalid email format          | Validation error                        |
| 001.7 | Non-owner attempts share      | 403 Forbidden                           |
| 001.8 | Client attempts share         | 403 Forbidden                           |

#### TC-SHARE-002: Revoke Access (US-008)

| ID    | Scenario                          | Expected Result                     |
| ----- | --------------------------------- | ----------------------------------- |
| 002.1 | Revoke one of multiple recipients | Recipient removed, status unchanged |
| 002.2 | Revoke last recipient             | Recipient removed, status → Draft   |
| 002.3 | Non-owner attempts revoke         | 403 Forbidden                       |
| 002.4 | Revoked user access attempt       | 403 Forbidden                       |

#### TC-SHARE-003: Pending Invitations

| ID    | Scenario                   | Expected Result                      |
| ----- | -------------------------- | ------------------------------------ |
| 003.1 | Pending user registers     | recipient_id updated, access granted |
| 003.2 | Pending invitation in list | Shown with email, no user ID         |

### 4.5 Comment System Module

#### TC-COMMENT-001: Create Comment (US-012)

| ID    | Scenario                  | Expected Result                  |
| ----- | ------------------------- | -------------------------------- |
| 001.1 | Owner creates comment     | Comment added, count incremented |
| 001.2 | Recipient creates comment | Comment added, count incremented |
| 001.3 | Comment at max length     | 1000 characters, success         |
| 001.4 | Comment exceeds limit     | Error: "Maximum 1000 characters" |
| 001.5 | Non-participant comments  | 403 Forbidden                    |
| 001.6 | Comment shows author role | Creator/Client label displayed   |

#### TC-COMMENT-002: Delete Comment (US-013)

| ID    | Scenario                      | Expected Result                    |
| ----- | ----------------------------- | ---------------------------------- |
| 002.1 | Author deletes own comment    | Comment removed, count decremented |
| 002.2 | Non-author attempts delete    | 403 Forbidden                      |
| 002.3 | Owner deletes other's comment | 403 Forbidden                      |

#### TC-COMMENT-003: List Comments (US-014)

| ID    | Scenario              | Expected Result              |
| ----- | --------------------- | ---------------------------- |
| 003.1 | List with pagination  | Returns 10 comments per page |
| 003.2 | Chronological order   | Newest first                 |
| 003.3 | Empty comments        | Empty array                  |
| 003.4 | Non-participant views | 403 Forbidden                |

### 4.6 User Management Module

#### TC-USER-001: Password Change (US-015)

| ID    | Scenario                   | Expected Result                        |
| ----- | -------------------------- | -------------------------------------- |
| 001.1 | Valid password change      | Password updated, user stays logged in |
| 001.2 | Wrong current password     | Error: "Current password incorrect"    |
| 001.3 | New password too short     | Validation error                       |
| 001.4 | New password without digit | Validation error                       |

#### TC-USER-002: Account Deletion (US-016)

| ID    | Scenario                       | Expected Result                            |
| ----- | ------------------------------ | ------------------------------------------ |
| 002.1 | Delete account with briefs     | Account, briefs, comments deleted          |
| 002.2 | Delete account as recipient    | Account deleted, recipient records removed |
| 002.3 | Email available after deletion | Can register with same email               |
| 002.4 | Confirmation required          | Modal shown before deletion                |

### 4.7 Authorization & Security Module

#### TC-SECURITY-001: RLS Policy Enforcement

| ID    | Scenario                          | Expected Result |
| ----- | --------------------------------- | --------------- |
| 001.1 | User queries other user's profile | Empty result    |
| 001.2 | User queries unshared brief       | Empty result    |
| 001.3 | User queries shared brief         | Brief returned  |
| 001.4 | Anonymous queries any data        | Empty result    |

#### TC-SECURITY-002: Role-Based Access

| ID    | Scenario                     | Expected Result        |
| ----- | ---------------------------- | ---------------------- |
| 002.1 | Creator creates brief        | Success                |
| 002.2 | Client creates brief         | 403 Forbidden          |
| 002.3 | Creator changes brief status | 403 Forbidden          |
| 002.4 | Client changes brief status  | Success (if recipient) |

#### TC-SECURITY-003: Input Validation & XSS Prevention

| ID    | Scenario                  | Expected Result    |
| ----- | ------------------------- | ------------------ |
| 003.1 | Script tag in comment     | Sanitized/rejected |
| 003.2 | TipTap with invalid nodes | Validation error   |
| 003.3 | SQL injection in email    | Validation error   |

---

## 5. Testing Environment

### 5.1 Development Environment

| Component    | Configuration           |
| ------------ | ----------------------- |
| **OS**       | Windows/macOS/Linux     |
| **Node.js**  | v22.14.0 (per .nvmrc)   |
| **Database** | Supabase Local (Docker) |
| **Browser**  | Chrome (latest)         |

### 5.2 CI/CD Environment

| Component       | Configuration        |
| --------------- | -------------------- |
| **Platform**    | GitHub Actions       |
| **Node.js**     | v22.x                |
| **Database**    | Supabase CLI (local) |
| **Test Runner** | Vitest / Jest        |
| **E2E Runner**  | Playwright           |

### 5.3 Staging Environment

| Component          | Configuration              |
| ------------------ | -------------------------- |
| **Hosting**        | Vercel Preview             |
| **Database**       | Supabase (staging project) |
| **Authentication** | Supabase Auth              |

### 5.4 Test Data Management

- Use database seeds for consistent test data
- Isolate test data per test suite
- Clean up test data after each test run
- Use factories for generating test entities

---

## 6. Testing Tools

### 6.1 Unit & Integration Testing

| Tool                       | Purpose                                    |
| -------------------------- | ------------------------------------------ |
| **Vitest**                 | Test runner with native TypeScript support |
| **@testing-library/react** | Component testing utilities                |
| **msw**                    | API mocking for integration tests          |
| **@supabase/supabase-js**  | Database testing with real Supabase        |
| **zod**                    | Schema validation testing                  |

### 6.2 End-to-End Testing

| Tool                 | Purpose                     |
| -------------------- | --------------------------- |
| **Playwright**       | Cross-browser E2E testing   |
| **@playwright/test** | Test runner with assertions |

### 6.3 Code Quality

| Tool           | Purpose              |
| -------------- | -------------------- |
| **ESLint**     | Static code analysis |
| **TypeScript** | Type checking        |
| **Prettier**   | Code formatting      |

### 6.4 Accessibility Testing

| Tool                          | Purpose                         |
| ----------------------------- | ------------------------------- |
| **axe-core**                  | Automated accessibility testing |
| **@testing-library/jest-dom** | DOM assertions                  |

### 6.5 Coverage Reporting

| Tool              | Purpose                  |
| ----------------- | ------------------------ |
| **c8 / istanbul** | Code coverage metrics    |
| **Codecov**       | Coverage reporting in CI |

---

## 7. Test Schedule

### 7.1 Continuous Testing (Every PR)

1. **Lint & Type Check** - Automated (GitHub Actions)
2. **Unit Tests** - Automated (GitHub Actions)
3. **Integration Tests** - Automated (GitHub Actions)
4. **Build Verification** - Automated (GitHub Actions)

### 7.2 Pre-Release Testing

1. **E2E Test Suite** - Full execution
2. **Manual Exploratory Testing** - Critical paths
3. **Accessibility Audit** - Key pages
4. **Cross-Browser Verification** - Chrome, Firefox, Safari

### 7.3 Post-Release Testing

1. **Smoke Tests** - Production verification
2. **Monitoring** - Error tracking review

---

## 8. Test Acceptance Criteria

### 8.1 Unit Tests

- All tests pass
- Coverage ≥80% for services
- No skipped tests without documented reason

### 8.2 Integration Tests

- All API endpoints tested
- All status codes verified
- Authorization properly enforced

### 8.3 E2E Tests

- All critical user journeys pass
- No visual regressions
- Performance within acceptable limits

### 8.4 Release Criteria

| Criteria                   | Requirement               |
| -------------------------- | ------------------------- |
| Unit Test Pass Rate        | 100%                      |
| Integration Test Pass Rate | 100%                      |
| E2E Test Pass Rate         | 100%                      |
| Code Coverage              | ≥80%                      |
| P0 Bugs                    | 0                         |
| P1 Bugs                    | 0                         |
| P2 Bugs                    | ≤5 (with mitigation plan) |

---

## 9. Roles and Responsibilities

### 9.1 Development Team

| Role          | Responsibilities                                                         |
| ------------- | ------------------------------------------------------------------------ |
| **Developer** | Write unit tests for new code, fix failing tests, maintain test coverage |
| **Tech Lead** | Review test coverage, approve test strategies, prioritize test fixes     |

### 9.2 QA Team

| Role            | Responsibilities                                                 |
| --------------- | ---------------------------------------------------------------- |
| **QA Engineer** | Write integration/E2E tests, execute manual testing, report bugs |
| **QA Lead**     | Maintain test plan, review test quality, approve releases        |

### 9.3 Product Team

| Role              | Responsibilities                                                     |
| ----------------- | -------------------------------------------------------------------- |
| **Product Owner** | Define acceptance criteria, prioritize bug fixes, approve test scope |

---

## 10. Bug Reporting Procedures

### 10.1 Bug Report Template

```markdown
## Bug Title

[Brief description]

## Priority

- [ ] P0 - Critical (system down, data loss)
- [ ] P1 - High (major feature broken)
- [ ] P2 - Medium (feature partially broken)
- [ ] P3 - Low (minor issue, workaround exists)

## Environment

- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- User Role: [Creator/Client]

## Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Result

[What should happen]

## Actual Result

[What actually happens]

## Screenshots/Logs

[Attach if applicable]

## Related Test Case

[TC-XXX-XXX if applicable]
```

### 10.2 Bug Priority Definitions

| Priority | Description                           | Response Time | Resolution Time |
| -------- | ------------------------------------- | ------------- | --------------- |
| **P0**   | System unusable, data loss/corruption | Immediate     | 4 hours         |
| **P1**   | Major feature broken, no workaround   | 2 hours       | 24 hours        |
| **P2**   | Feature issue with workaround         | 8 hours       | 3 days          |
| **P3**   | Minor issue, cosmetic                 | Next sprint   | As scheduled    |

### 10.3 Bug Lifecycle

1. **New** - Bug reported
2. **Triaged** - Priority assigned, developer assigned
3. **In Progress** - Fix in development
4. **In Review** - Fix in code review
5. **Ready for Test** - Fix deployed to staging
6. **Verified** - QA confirmed fix
7. **Closed** - Released to production

---

## 11. Risk Assessment

### 11.1 High-Risk Areas

| Area                | Risk                                | Mitigation                              |
| ------------------- | ----------------------------------- | --------------------------------------- |
| **Authentication**  | Session hijacking, credential leaks | Security testing, JWT validation        |
| **RLS Policies**    | Data leakage between users          | Policy testing with multiple users      |
| **Status Workflow** | Invalid state transitions           | State machine testing                   |
| **Brief Limits**    | Race conditions on limit check      | Database constraint + application check |
| **Data Cascade**    | Incomplete deletion on user delete  | Transaction testing, audit verification |

### 11.2 Medium-Risk Areas

| Area                    | Risk                          | Mitigation                               |
| ----------------------- | ----------------------------- | ---------------------------------------- |
| **TipTap Content**      | XSS through rich text         | Content validation, sanitization testing |
| **Comment Count**       | Denormalization inconsistency | Count verification tests                 |
| **Pagination**          | Off-by-one errors             | Boundary testing                         |
| **Pending Invitations** | Orphaned records              | Cleanup verification                     |

---

## 12. Appendix

### 12.1 Test File Structure

```
tests/
├── unit/
│   ├── services/
│   │   ├── brief.service.test.ts
│   │   ├── comments.service.test.ts
│   │   └── user.service.test.ts
│   ├── schemas/
│   │   ├── brief.schema.test.ts
│   │   ├── auth.schema.test.ts
│   │   └── comment.schema.test.ts
│   └── utils/
│       ├── authorization.utils.test.ts
│       ├── mappers.test.ts
│       └── query.utils.test.ts
├── integration/
│   ├── api/
│   │   ├── briefs.test.ts
│   │   ├── comments.test.ts
│   │   ├── recipients.test.ts
│   │   └── users.test.ts
│   └── rls/
│       └── policies.test.ts
├── e2e/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   └── register.spec.ts
│   ├── briefs/
│   │   ├── create.spec.ts
│   │   ├── edit.spec.ts
│   │   ├── share.spec.ts
│   │   └── status.spec.ts
│   └── comments/
│       └── comments.spec.ts
└── fixtures/
    ├── users.ts
    ├── briefs.ts
    └── comments.ts
```

### 12.2 Key Test Commands

```bash
# Run all tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- tests/unit/services/brief.service.test.ts
```

### 12.3 References

- [PRD Document](.docs/prd.md)
- [API Plan](.docs/api-plan.md)
- [Tech Stack](.docs/tech-stack.md)
- [Database Migrations](supabase/migrations/)
