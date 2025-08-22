"use server";

import { createClient } from "@/utils/supabase/server";
import { encodedRedirect } from "@/utils/utils";
import {
  SignInWithPasswordCredentials,
  SignUpWithPasswordCredentials,
} from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signUpAction = async (
  credentials: SignUpWithPasswordCredentials & { nickname?: string }
) => {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { error, data } = await supabase.auth.signUp({
    ...credentials,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        nickname: credentials.nickname,
      },
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link."
    );
  }
};

export const signInAction = async (
  credentials: SignInWithPasswordCredentials
) => {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    return encodedRedirect("error", "/log-in", error.message);
  }

  return redirect("/authenticated/deals");
};

export const forgotPasswordAction = async (data: { email: string }) => {
  const email = data.email;
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/authenticated/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password"
    );
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password."
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return encodedRedirect(
      "error",
      "/authenticated/reset-password",
      "Password and confirm password are required"
    );
  }

  if (password !== confirmPassword) {
    return encodedRedirect(
      "error",
      "/authenticated/reset-password",
      "Passwords do not match"
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return encodedRedirect(
      "error",
      "/authenticated/reset-password",
      "Password update failed"
    );
  }

  return encodedRedirect(
    "success",
    "/authenticated/reset-password",
    "Password updated"
  );
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/log-in");
};

export const deleteItemOrdersAction = async () => {
  const supabase = await createClient();
  const query = supabase
    .from("orders")
    .delete()
    .not("item_type_id", "ilike", "%RUNE%")
    .not("item_type_id", "ilike", "%SOUL%")
    .not("item_type_id", "ilike", "%RELIC%");

  const { error } = await query;
  if (error) {
    console.error(error.message);
  } else {
    revalidatePath("/authenticated/deals");
  }

  return !!error;
};

export const deleteCraftingMaterialOrdersAction = async () => {
  const supabase = await createClient();
  const query = supabase
    .from("orders")
    .delete()
    .ilikeAnyOf("item_type_id", ["%RUNE%", "%SOUL%", "%RELIC%"]);

  const { error } = await query;
  if (error) {
    console.error(error.message);
  } else {
    revalidatePath("/authenticated/deals");
  }

  return !!error;
};

export const deleteSpecificOrderAction = async (orderId: number) => {
  const supabase = await createClient();
  const query = supabase.from("orders").delete().eq("id", orderId);

  const { error } = await query;
  if (error) {
    console.error(error.message);
  } else {
    revalidatePath("/authenticated/deals");
  }

  return !!error;
};
