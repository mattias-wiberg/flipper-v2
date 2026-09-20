"use server";

import { createClient } from "@/utils/supabase/server";
import {
  AUTHENTICATED_REDIRECT,
  PASSWORD_RESET_REDIRECT,
  forgotPasswordSchema,
  getRequestOrigin,
  getValidationMessage,
  passwordUpdateSchema,
  signInSchema,
  signUpSchema,
} from "@/utils/auth";
import { encodedRedirect } from "@/utils/utils";
import {
  SignInWithPasswordCredentials,
} from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type SignUpActionInput = {
  nickname?: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export const signUpAction = async (credentials: SignUpActionInput) => {
  const parsedCredentials = signUpSchema.safeParse(credentials);
  if (!parsedCredentials.success) {
    return encodedRedirect(
      "error",
      "/sign-up",
      getValidationMessage(parsedCredentials.error)
    );
  }

  const supabase = await createClient();
  const origin = getRequestOrigin(await headers());
  const { email, password, nickname } = parsedCredentials.data;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: new URL("/auth/callback", origin).toString(),
      data: {
        nickname,
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
  const parsedCredentials = signInSchema.safeParse(credentials);
  if (!parsedCredentials.success) {
    return encodedRedirect(
      "error",
      "/log-in",
      getValidationMessage(parsedCredentials.error)
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword(parsedCredentials.data);

  if (error) {
    return encodedRedirect("error", "/log-in", error.message);
  }

  return redirect(AUTHENTICATED_REDIRECT);
};

export const forgotPasswordAction = async (data: { email: string }) => {
  if (!data.email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const parsedData = forgotPasswordSchema.safeParse(data);
  if (!parsedData.success) {
    return encodedRedirect(
      "error",
      "/forgot-password",
      getValidationMessage(parsedData.error)
    );
  }

  const supabase = await createClient();
  const origin = getRequestOrigin(await headers());
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("redirect_to", PASSWORD_RESET_REDIRECT);

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsedData.data.email,
    {
      redirectTo: callbackUrl.toString(),
    }
  );

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
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (
    typeof password !== "string" ||
    typeof confirmPassword !== "string" ||
    !password ||
    !confirmPassword
  ) {
    return encodedRedirect(
      "error",
      PASSWORD_RESET_REDIRECT,
      "Password and confirm password are required"
    );
  }

  const parsedPassword = passwordUpdateSchema.safeParse({
    password,
    confirmPassword,
  });
  if (!parsedPassword.success) {
    return encodedRedirect(
      "error",
      PASSWORD_RESET_REDIRECT,
      getValidationMessage(parsedPassword.error)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsedPassword.data.password,
  });

  if (error) {
    return encodedRedirect(
      "error",
      PASSWORD_RESET_REDIRECT,
      "Password update failed"
    );
  }

  return encodedRedirect(
    "success",
    PASSWORD_RESET_REDIRECT,
    "Password updated"
  );
};

export const signOutAction = async () => {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return encodedRedirect("error", "/log-in", error.message);
  }

  return redirect("/log-in");
};

const getAuthorizedSupabase = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error(error.message);
    return null;
  }

  return data.user ? supabase : null;
};

export const deleteItemOrdersAction = async () => {
  const supabase = await getAuthorizedSupabase();
  if (!supabase) {
    return true;
  }

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
  const supabase = await getAuthorizedSupabase();
  if (!supabase) {
    return true;
  }

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

export const deleteSpecificOrderAction = async (orderId: number | number[]) => {
  const supabase = await getAuthorizedSupabase();
  if (!supabase) {
    return true;
  }

  const query = Array.isArray(orderId)
    ? supabase.from("orders").delete().in("id", orderId)
    : supabase.from("orders").delete().eq("id", orderId);

  const { error } = await query;
  if (error) {
    console.error(error.message);
  } else {
    revalidatePath("/authenticated/deals");
  }

  return !!error;
};
