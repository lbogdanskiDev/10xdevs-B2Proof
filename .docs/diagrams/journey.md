# User Journey Diagram - B2Proof

This diagram visualizes the user journey for the login, registration, and core application modules.

```mermaid
stateDiagram-v2
    [*] --> Landing

    Landing: Landing Page

    %% Authentication Flow
    Landing --> Login: Sign In
    Landing --> Register: Create Account

    Login: Login Form
    Register: Registration Form

    Login --> ValidateLogin: Submit
    state if_login <<choice>>
    ValidateLogin --> if_login
    if_login --> Dashboard: Valid credentials
    if_login --> Login: Invalid credentials

    Register --> SelectRole: Fill form
    SelectRole: Role Selection
    SelectRole --> ValidateReg: Submit
    state if_reg <<choice>>
    ValidateReg --> if_reg
    if_reg --> Dashboard: Success
    if_reg --> Register: Error

    %% Password Recovery
    Login --> ResetRequest: Forgot password
    ResetRequest: Request Reset
    ResetRequest --> ResetEmail: Submit email
    ResetEmail: Email Sent
    ResetEmail --> NewPassword: Click link
    NewPassword: Set New Password
    NewPassword --> Login: Complete

    %% Main Dashboard
    Dashboard: Brief List
    Dashboard --> Landing: Logout

    %% Creator: Create Brief
    Dashboard --> NewBrief: Create Brief
    NewBrief: New Brief
    state if_limit <<choice>>
    NewBrief --> if_limit
    if_limit --> Editor: Under 20 briefs
    if_limit --> LimitError: Limit reached
    LimitError: Limit Reached
    LimitError --> Dashboard: Delete old briefs

    Editor: Brief Editor
    Editor --> Dashboard: Save Draft

    %% Creator: View and Manage Brief
    Dashboard --> ViewBrief: Open own brief
    ViewBrief: Brief Details

    ViewBrief --> Editor: Edit
    ViewBrief --> ConfirmDel: Delete
    state if_del <<choice>>
    ConfirmDel --> if_del
    if_del --> Dashboard: Confirmed
    if_del --> ViewBrief: Cancelled

    ViewBrief --> ShareModal: Share
    ShareModal: Add Recipients
    ShareModal --> ViewBrief: Recipients added

    %% Client: View Shared Brief
    Dashboard --> SharedBrief: Open shared brief
    SharedBrief: Shared Brief View

    state if_action <<choice>>
    SharedBrief --> if_action: Client action

    if_action --> BriefAccepted: Accept
    if_action --> BriefRejected: Reject
    if_action --> BriefNeedsMod: Request changes

    BriefAccepted: Accepted
    BriefRejected: Rejected
    BriefNeedsMod: Needs Modification

    BriefAccepted --> Dashboard: Status updated
    BriefRejected --> Dashboard: Status updated
    BriefNeedsMod --> AddComment: Required comment
    AddComment: Add Comment
    AddComment --> Dashboard: Status updated

    %% Comments
    ViewBrief --> Comments: View comments
    SharedBrief --> Comments: View comments
    Comments: Comment Section
    Comments --> ViewBrief: Back
    Comments --> SharedBrief: Back

    %% Profile Management
    Dashboard --> Profile: Profile menu
    Profile: Profile Page

    Profile --> ChgPwd: Change password
    ChgPwd: Password Form
    state if_pwd <<choice>>
    ChgPwd --> if_pwd
    if_pwd --> Profile: Success
    if_pwd --> ChgPwd: Error

    Profile --> DelAcct: Delete account
    DelAcct: Confirm Deletion
    state if_del_acct <<choice>>
    DelAcct --> if_del_acct
    if_del_acct --> Landing: Deleted
    if_del_acct --> Profile: Cancelled

    Profile --> Dashboard: Back
```

## Journey Overview

### Unauthenticated Users
1. **Landing Page**: Entry point where users can choose to sign in or create an account
2. **Login**: Authenticate with email and password to access the dashboard
3. **Registration**: Create new account with role selection (Creator or Client)

### Authenticated Creators
1. **Brief List**: Central dashboard showing all briefs with status and metadata
2. **Create Brief**: Form to create new brief (limited to 20 active briefs)
3. **Edit Brief**: Modify existing brief content (resets status to Draft)
4. **Share Brief**: Add recipients by email (up to 10 per brief)
5. **Delete Brief**: Permanently remove brief with confirmation

### Authenticated Clients
1. **View Shared Brief**: Read-only access to briefs shared with them
2. **Status Actions**: Accept, Reject, or Request Modification
3. **Comments**: Add feedback visible to all stakeholders

### Profile Management
1. **Change Password**: Update password with current password verification
2. **Delete Account**: Permanently delete account and all associated data

## Status Workflow

```
Draft --> Sent --> Accepted
                   Rejected
                   Needs Modification --> (Creator edits) --> Draft
```

- **Draft**: Initial state, brief not yet shared
- **Sent**: Brief shared with at least one recipient
- **Accepted**: Client approved the brief
- **Rejected**: Client declined the brief
- **Needs Modification**: Client requested changes (requires comment)
