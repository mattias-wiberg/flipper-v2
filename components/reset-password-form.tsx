"use client";

import { resetPasswordAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { passwordUpdateSchema } from "@/utils/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");

  const form = useForm<z.infer<typeof passwordUpdateSchema>>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof passwordUpdateSchema>) {
    form.reset(values);

    const formData = new FormData();
    formData.append("password", values.password);
    formData.append("confirmPassword", values.confirmPassword);

    await resetPasswordAction(formData);
  }

  return (
    <Card className={className} {...props}>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Reset Password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8"
            aria-busy={form.formState.isSubmitting}
          >
            <div className="grid gap-6">
              <div className="grid gap-6">
                {error && !form.formState.isDirty && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="rounded-md border border-destructive bg-destructive/15 p-3 text-sm font-medium text-destructive"
                  >
                    {error}
                  </div>
                )}
                {success && !form.formState.isDirty && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-md border border-primary bg-primary/15 p-3 text-sm font-medium text-primary"
                  >
                    {success}
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          autoFocus
                          type="password"
                          autoComplete="new-password"
                          placeholder="New password"
                          required
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="Confirm password"
                          required
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  Reset Password
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
