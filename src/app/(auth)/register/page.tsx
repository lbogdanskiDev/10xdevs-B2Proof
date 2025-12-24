import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account - B2Proof",
  description: "Create your B2Proof account to get started",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
