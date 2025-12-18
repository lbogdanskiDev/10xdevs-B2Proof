/**
 * Home page - serves as entry point for the application.
 * Middleware handles redirects:
 * - Logged in users → /briefs
 * - Not logged in users → /login
 *
 * This component returns null as middleware handles redirects before page renders.
 */
export default function HomePage() {
  return null;
}
