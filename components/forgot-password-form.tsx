"use client";

import { forgotPasswordAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "./ui/form";

const formSchema = z.object({
    email: z.string().email(),
});

export function ForgotPasswordForm({
    className,
    ...props
}: React.ComponentPropsWithoutRef<"div">) {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const success = searchParams.get("success");

    // Define your form
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
        },
    });

    // Define a submit handler
    function onSubmit(values: z.infer<typeof formSchema>) {
        // Reset form dirty status
        form.reset(values);

        // Call the server action directly with values
        forgotPasswordAction(values);
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Reset Password</CardTitle>
                    <CardDescription>
                        Enter your email to receive a password reset link
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <div className="grid gap-6">
                                <div className="grid gap-6">
                                    {error && !form.formState.isDirty && (
                                        <div className="p-3 bg-destructive/15 border border-destructive text-destructive font-medium text-sm rounded-md">
                                            {error}
                                        </div>
                                    )}
                                    {success && !form.formState.isDirty && (
                                        <div className="p-3 bg-green-600/15 border border-green-600 text-green-600 font-medium text-sm rounded-md">
                                            {success}
                                        </div>
                                    )}
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="m@example.com"
                                                        type="email"
                                                        required
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Enter the email associated with your account.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full">
                                        Send Reset Link
                                    </Button>
                                </div>
                                <div className="text-center text-sm">
                                    Remember your password?{" "}
                                    <Link href="/log-in" className="underline underline-offset-4">
                                        Log in
                                    </Link>
                                </div>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary  ">
                By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
                and <a href="#">Privacy Policy</a>.
            </div>
        </div>
    );
}