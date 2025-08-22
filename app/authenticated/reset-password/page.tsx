import { ResetPasswordForm } from "@/components/reset-password-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset password",
  alternates: { canonical: "/authenticated/reset-password" },
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
