import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import type { User, Role } from "../app/generated/prisma/client";

export type CurrentUser = User & { isDemo: boolean };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const metadata = sessionClaims?.metadata as { role?: string; isDemo?: boolean } | undefined;
  const isDemo = metadata?.isDemo ?? false;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  return { ...user, isDemo };
}

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) throw new Error("Forbidden");
  return user;
}
