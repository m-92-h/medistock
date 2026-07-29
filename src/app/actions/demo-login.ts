"use server";
import { clerkClient } from "@clerk/nextjs/server";

export async function getDemoSessionToken(email: string) {
  const client = await clerkClient();

  // 1. البحث عن المستخدم في Clerk باستخدام البريد الإلكتروني
  const users = await client.users.getUserList({
    emailAddress: [email],
  });

  if (!users.data.length) {
    throw new Error("User not found");
  }

  const user = users.data[0];

  // 2. إنشاء "تذكرة دخول" (SignIn Token) مؤقتة صالحة لمدة 60 ثانية فقط
  const token = await client.signInTokens.createSignInToken({
    userId: user.id,
    expiresInSeconds: 60,
  });

  return token.token;
}
