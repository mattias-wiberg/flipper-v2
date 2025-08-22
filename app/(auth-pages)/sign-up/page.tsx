import { SignupForm } from "@/components/signup-form";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a free Flipper account.",
  alternates: { canonical: "/sign-up" },
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
