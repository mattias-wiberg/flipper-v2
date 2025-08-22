import { LoginForm } from "@/components/login-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
  description: "Access your Flipper account.",
  alternates: { canonical: "/log-in" },
};

export default function LoginPage() {
  return <LoginForm />;
}
