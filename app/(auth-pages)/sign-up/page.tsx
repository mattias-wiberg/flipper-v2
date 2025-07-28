import { SignupForm } from "@/components/signup-form";
import { Suspense } from "react";

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
