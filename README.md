# B2Proof

## Project Description

B2Proof is a SaaS web application designed for freelancers and small businesses that streamlines the process of creating, sharing, and accepting project briefs. The platform replaces time-consuming email communication with a centralized collaboration system where creators can create briefs, share them with clients, and receive quick feedback through a status system and comments.

### Key Features

- **Brief Management**: Create, edit, and delete briefs with a simple template (header, content, footer)
- **Status Workflow**: Clear progression from Draft → Sent → Accepted/Rejected/Needs Modification
- **Sharing System**: Share briefs with up to 10 recipients via email
- **Comment System**: Asynchronous collaboration through public comments (max 1000 characters)
- **User Roles**: Creators (can create briefs) and Clients (view and comment only)
- **Limits**: 20 active briefs per user, 10,000 characters per brief content

### Problem Statement

Research indicates that on average 30% of a freelancer's work time is dedicated to administrative communication with clients, half of which is time wasted waiting for responses or clarifying misunderstandings. B2Proof addresses this by providing:

- Structured brief templates to reduce misunderstandings
- Clear status tracking for transparency
- Centralized communication to replace scattered email threads
- Quick feedback mechanisms to reduce project delays

## Tech Stack

### Frontend
- **Next.js 15** (v15.1.0) - React framework with App Router and Server Components
- **React 19** (v19.0.0) - UI library for building components
- **TypeScript 5** (v5.8.0) - Static typing with auto-generated types from Supabase
- **Tailwind CSS 4** (v4.0.0) - Utility-first CSS framework
- **Shadcn/ui** - Copy-paste UI components (New York style) with Radix UI accessibility
- **TipTap 3** - Headless WYSIWYG editor for brief content

### Backend
- **Supabase** - Comprehensive backend-as-a-service
  - **PostgreSQL** - Relational database with ACID compliance
  - **Authentication** - Built-in Email/Password + OAuth (Google/GitHub)
  - **Row Level Security** - Database-level authorization
  - **Auto-generated REST API** - Type-safe CRUD endpoints
  - **Storage API** - For images and attachments

### CI/CD & Hosting
- **GitHub Actions** - Automated pipeline (Lint → Type Check → Build → Deploy)
- **Vercel** - Global Edge Network CDN with instant deployments

## Getting Started Locally

### Prerequisites

- **Node.js**: **v22.14.0** (specified in `.nvmrc`)
- **npm**: Latest version
- **Supabase Account**: Free tier account at [supabase.com](https://supabase.com)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lbogdanskiDev/b2proof.git
   cd b2proof
   ```

2. **Install Node.js version**
   ```bash
   # Using nvm (recommended)
   nvm install
   nvm use
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

   Get these values from your Supabase project dashboard at Settings → API.

5. **Set up Supabase database**

   Run the database migrations (instructions to be added based on your migration setup):
   ```bash
   # Example using Supabase CLI
   npx supabase db push
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server on port 3000 |
| `npm run build` | Create production build with sitemap generation |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint to check code quality |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Run TypeScript type checking without emitting files |

### Code Quality Tools

The project uses:
- **ESLint** with TypeScript, React, and Next.js rules
- **Prettier** for consistent code formatting
- **Husky + lint-staged** for pre-commit checks
- **TypeScript** strict mode for type safety

Pre-commit hooks automatically run on staged files:
- `*.{ts,tsx,js,jsx}`: ESLint fix + Prettier
- `*.{json,css,md,mdx}`: Prettier

## Project Scope

### Included in MVP

#### User Management
- Registration with email/password (min 8 characters, 1 digit required)
- Login with session management
- User profile with password change and account deletion
- Two user roles: Creator and Client

#### Brief Management
- Create briefs with header (200 chars), content (10,000 chars), footer (200 chars)
- Simple WYSIWYG text formatting with TipTap
- Edit briefs (resets status to Draft)
- Delete briefs with confirmation (hard delete)
- List view with pagination (10 per page)
- Limit of 20 briefs per user

#### Status System
- Workflow: Draft → Sent → Accepted/Rejected/Needs Modification
- Three CTA buttons for recipients: Accept, Reject, Needs Modification
- Status visible to all users with access

#### Sharing & Collaboration
- Share briefs with up to 10 recipients via email
- Revoke access to specific recipients
- Public comment system (max 1000 characters per comment)
- Delete own comments
- Chronological comment display

#### User Interface
- Responsive web application (mobile-first)
- English language interface
- Brief list, detail view, and user profile pages

### Explicitly Out of Scope

The following features are NOT included in the MVP:
- File imports (PDF, DOCX)
- External integrations (Slack, Trello, etc.)
- Native mobile application
- Notification system (email, push, in-app)
- Analytics dashboard
- Brief archiving
- Version history and change tracking
- Private notes/comments
- Export to files
- Multi-language support
- Brief templates
- Real-time collaboration
- Organizations/teams
- Payment system and subscriptions
- Auto-save drafts
- Reminders and deadlines
- File attachments

## Project Status

**Current Stage**: MVP Development

### Success Metrics (Post-MVP)

- **Brief Acceptance Rate**: Target 80% of briefs reach "Accepted" status within 7 days
- **User Activity**: Target 70% of registered creators generate minimum 1 brief weekly
- **30-Day Retention**: Minimum 60%
- **Process Efficiency**:
  - 70% reduction in emails needed to accept a brief
  - 40% reduction in time from first contact to work start

## License

License not specified. Please contact the project maintainers for licensing information.

---

## Contributing

Contributions are welcome! Please ensure all code follows the project's ESLint and Prettier configurations. All commits must pass pre-commit hooks (linting and formatting).

## Support

For issues, questions, or feature requests, please open an issue on the GitHub repository.
