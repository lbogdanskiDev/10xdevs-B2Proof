# Product Requirements Document (PRD) - B2Proof

## 1. Product Overview

B2Proof is a SaaS web application designed for freelancers and small businesses that streamlines the process of creating, sharing, and accepting project briefs. The system replaces time-consuming email communication with a centralized collaboration platform where creators can create briefs, share them with clients, and receive quick feedback through a status system and comments.

The application uses a freemium model with a limit of 20 active briefs per user, offering a simple brief template consisting of a header (200 characters), main content (10,000 characters), and footer (200 characters). The system supports two types of users: creators (freelancers/agencies) and clients (brief recipients), enabling asynchronous collaboration through a comment system and clearly defined status workflow.

## 2. User Problem

The current process of creating and managing project briefs generates the following problems:

- Time consumption: Preparing a brief in a text editor and sending it via email requires significant time investment, especially with multiple projects
- Lack of responsiveness: Clients often ignore or delay responses to emails, leading to project delays
- Misunderstandings: Lack of clear brief structure and scattered information in long email threads leads to misinterpretation of requirements
- Lack of transparency: Difficulty tracking brief status and change history with email communication
- Frustration on both sides: The need to repeatedly ask for information and repeat the same questions leads to tensions in the client-contractor relationship

Research indicates that on average 30% of a freelancer's work time is dedicated to administrative communication with the client, half of which is time wasted waiting for a response or clarifying misunderstandings.

## 3. Functional Requirements

### 3.1 User System and Authorization
- Registration of new users via form with email and password fields
- Validation of email address uniqueness in the system
- Password validation: minimum 8 characters, containing at least one digit
- User login using email and password
- Single active session per user with automatic logout after expiration
- Distinction between two roles: creator (can create briefs) and client (can only view and comment on shared briefs)
- Profile page allowing password change (requires current password) and account deletion

### 3.2 Brief Management
- Creating a new brief via form with fields: header (max 200 characters, required), content (max 10,000 characters, required), footer (max 200 characters, optional)
- Simple WYSIWYG text formatting
- Editing existing brief (resets status to "Draft")
- Deleting brief with confirmation modal (hard delete)
- Limit of 20 briefs per user (hard limit, no archiving option)
- Brief list with pagination (10 per page) displaying: creation/modification date, status, number of comments
- Chronological sorting of briefs by modification date
- Visual distinction between own and shared briefs via label

### 3.3 Status System
- Automatic status assignment: Draft, Sent, Accepted, Rejected, Needs Modification
- Status workflow: Draft → Sent → (Accepted | Rejected | Needs Modification)
- Possibility to reactivate rejected brief via editing
- Editing brief automatically resets status to "Draft"
- Three CTA buttons for recipients: Accept, Reject, Needs Modification (visible above brief)

### 3.4 Sharing System
- Sharing brief by entering recipient's email address
- Possibility to share one brief with maximum 10 users
- Only brief creator can manage access
- Revoking access changes brief status to "Draft" if not shared with other users
- Recipient must have an account in the system to view brief

### 3.5 Comment System
- Adding public comments visible to creator and everyone the brief is shared with
- Limit of 1000 characters per comment
- Chronological display of comments
- Ability to delete own comment
- No ability to edit comment after adding
- Labels distinguishing user roles in comments

### 3.6 User Interface
- Responsive web application (mobile-first)
- Brief list view, selected brief view with visual section separation, user profile
- Interface in English language
- No onboarding on first login

### 3.7. Legal Requirements and Restrictions:
   - User personal data and briefs stored in compliance with GDPR
   - Right to access and delete data (account along with briefs) upon user request

## 4. Product Boundaries

### 4.1 Features Outside MVP Scope
- Import of files in PDF, DOCX, and other formats
- Integrations with external platforms (Slack, Trello, etc.)
- Native mobile application
- Notification system (email, push, in-app)
- Analytics dashboard with metrics
- Brief archiving
- Change history and versioning
- Private notes/comments
- Export briefs to files
- Multi-language support
- Brief templates
- Real-time collaboration
- Organizations/teams (individual accounts only)
- Payment system and subscription management
- Automatic saving of draft versions
- Reminders and deadlines
- Brief attachments

### 4.2 Technical Limitations
- Application accessible only through web browser
- No support for browsers older than 2 years
- Maximum brief size: 10,000 characters
- Limit of 20 active briefs per user
- Limit of 10 recipients per brief

## 5. User Stories

### US-001
Title: New User Registration as Creator
Description: As a new user I want to be able to register in the system using my email address and password to gain access to brief creation features
Acceptance Criteria:
- Registration form contains fields: email, password, password confirmation, role selection (creator/client)
- System validates email address uniqueness
- System requires password of minimum 8 characters containing at least one digit
- After successful registration user is automatically logged in
- System displays error messages for invalid data

### US-002
Title: Existing User Login
Description: As a registered user I want to be able to log into the system using my email and password to access my briefs
Acceptance Criteria:
- Login form contains fields: email and password
- System verifies login data correctness
- After successful login user is redirected to brief list
- System displays error message for invalid data
- System ends previous session if it exists

### US-003
Title: Creating New Brief
Description: As a creator I want to be able to create a new brief by filling out a simple form to communicate project requirements to the client
Acceptance Criteria:
- Form contains fields: header (max 200 characters), content (max 10,000 characters), footer
- Header and content fields are required
- System does not allow saving incomplete brief
- After saving brief receives "Draft" status
- System displays limit exceeded message at 10 active briefs
- Content field shows character counter

### US-004
Title: Editing Existing Brief
Description: As a creator I want to be able to edit my brief to make corrections before or after sending
Acceptance Criteria:
- Ability to edit all brief fields in "Draft" status
- Editing brief in any status resets it to "Draft"
- System displays warning about status reset before saving changes
- Preservation of all form data during editing

### US-005
Title: Deleting Brief
Description: As a creator I want to be able to delete a brief to free up space for new briefs within the limit
Acceptance Criteria:
- Delete button available on brief list and in detail view
- System displays confirmation modal before deletion
- Brief is permanently deleted from system (hard delete)
- Brief deletion also deletes all related comments
- After deletion user returns to brief list

### US-006
Title: Viewing Brief List
Description: As a user I want to see a list of all my briefs and those shared with me to have an overview of active projects
Acceptance Criteria:
- List displays: title, modification date, status, number of comments
- Pagination of 10 briefs per page
- Briefs sorted chronologically by modification date (newest first)
- Visual distinction between own and shared briefs (label)
- Ability to navigate to brief details by clicking

### US-007
Title: Sharing Brief with Recipient
Description: As a creator I want to share a brief with a client by entering their email so they can review and accept it
Acceptance Criteria:
- Field for entering recipient's email address
- Ability to add up to 10 recipients per brief
- System verifies if user with given email exists
- After sharing status changes to "Sent"
- List of current recipients with ability to remove access

### US-008
Title: Revoking Brief Access
Description: As a creator I want to be able to revoke access to a brief from a specific recipient to control who has access
Acceptance Criteria:
- List of recipients with delete button next to each
- Revoking all access changes status to "Draft"
- System does not require confirmation when revoking access
- Recipient loses immediate access to brief

### US-009
Title: Client Brief Acceptance
Description: As a client I want to be able to accept a brief to confirm that I agree with the requirements
Acceptance Criteria:
- "Accept" button visible above brief content
- Clicking changes status to "Accepted"
- Status is visible to everyone with access
- No ability to change status after client acceptance

### US-010
Title: Client Brief Rejection
Description: As a client I want to be able to reject a brief to signal that I disagree with the proposal
Acceptance Criteria:
- "Reject" button visible above brief content
- Clicking changes status to "Rejected"
- Ability to reactivate brief by creator through editing
- Status visible to everyone with access

### US-011
Title: Request Brief Modification
Description: As a client I want to be able to request brief modifications to indicate that changes are needed
Acceptance Criteria:
- "Needs Modification" button visible above brief content
- Clicking changes status to "Needs Modification"
- Changing status to "Needs Modification" requires a comment
- Creator can edit brief which resets status to "Draft"
- Status visible to everyone with access

### US-012
Title: Adding Comment to Brief
Description: As a user with access I want to be able to add a comment to a brief to conduct discussion and clarify doubts
Acceptance Criteria:
- Text field for entering comment (max 1000 characters)
- Character counter visible while typing
- Comment appears immediately after adding
- Display of author, date, and comment content
- Label indicating author's role (creator/client)

### US-013
Title: Deleting Own Comment
Description: As a comment author I want to be able to delete it if I made a mistake
Acceptance Criteria:
- Delete button visible only on own comments
- Deletion happens immediately without confirmation
- Comment disappears from list for all users
- No ability to restore deleted comment

### US-014
Title: Viewing Comments
Description: As a user with access I want to see all comments on a brief to track the discussion
Acceptance Criteria:
- Comments displayed chronologically (newest first)
- Visible: author, date, content, author's role
- Comments visible to everyone with access to brief
- Number of comments visible on brief list

### US-015
Title: User Password Change
Description: As a user I want to be able to change my password to maintain account security
Acceptance Criteria:
- Password change form on profile page
- Required fields: current password, new password, new password confirmation
- New password validation (min 8 characters, one digit, new password and confirmation must be identical)
- Successful password change message
- User remains logged in after change

### US-016
Title: User Account Deletion
Description: As a user I want to be able to delete my account when I no longer need to use the system
Acceptance Criteria:
- Account deletion button on profile page
- Confirmation modal with irreversibility warning
- Account deletion deletes all user briefs and comments
- User is logged out after account deletion
- Email becomes available for re-registration

### US-017
Title: Displaying Brief Details
Description: As a user with access I want to see full brief details to familiarize myself with requirements
Acceptance Criteria:
- View shows: header, content, footer, status, creation/modification date
- Action buttons visible depending on user role
- Comment section below brief
- Information about brief author
- List of recipients (visible only to creator)

### US-018
Title: Application Navigation
Description: As a user I want to be able to easily navigate the application to efficiently use the system
Acceptance Criteria:
- Navigation menu with options: Brief List, New Brief (for creators), Profile, Logout
- Logo/application name leads to brief list
- Breadcrumbs showing current location
- Responsive menu for mobile devices

### US-019
Title: System Logout
Description: As a user I want to be able to log out to secure my account
Acceptance Criteria:
- Logout button available in navigation menu
- Logout ends user session
- Redirect to login page
- Attempt to access protected resources redirects to login

### US-020
Title: Error and Validation Handling
Description: As a user I want to receive clear error messages to know how to fix them
Acceptance Criteria:
- Form validation shows errors at appropriate fields
- Error messages are specific and helpful
- Server errors displayed in readable way
- Preservation of data in forms during validation errors

### US-021
Title: Resource Access Authorization
Description: As a system I want to control access to resources to ensure data security
Acceptance Criteria:
- User can edit/delete only own briefs
- Access to brief only for creator and shared recipients
- Clients cannot create new briefs
- Redirect to error page when lacking permissions

### US-022
Title: System Limits Handling
Description: As a creator I want to be informed about system limits to be able to manage them
Acceptance Criteria:
- Display of current number of briefs (e.g., "7/10 briefs")
- Limit reached message when attempting to create 11th brief
- Suggestion to delete old briefs when reaching limit
- Character counter in fields with restrictions

## 6. Success Metrics

### 6.1 Main KPIs
- Brief acceptance rate: 80% of briefs reach "Accepted" status within 7 days of creation
- User activity: 70% of registered creators generate minimum 1 brief weekly

### 6.2 Usage Metrics
- Number of registered users by role (creator/client)
- Average number of briefs per creator monthly
- Brief limit utilization coefficient (% of users with >8 briefs)
- Average number of recipients per brief
- Average number of comments per brief

### 6.3 Retention Metrics
- 30-day user retention: minimum 60%
- Weekly active users (WAU): minimum 40% of registered
- Returning client coefficient: minimum 50% of clients view more than 1 brief

### 6.4 Process Efficiency Metrics
- Reduction in number of emails needed to accept brief by 70%
- Reduction in time from first contact to work start by 40%

### 6.5 Measurement Method (post-MVP)
- Implementation of analytics system to track events in application
- Weekly reports of key metrics
- Monthly user satisfaction surveys
- A/B tests for conversion rate optimization
- Conversion funnel analysis: registration → brief creation → sharing → acceptance
