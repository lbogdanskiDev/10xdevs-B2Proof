import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In - B2Proof",
  description: "Sign in to your B2Proof account",
};

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    redirectTo?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return <LoginForm error={params.error} redirectTo={params.redirectTo} />;
}
