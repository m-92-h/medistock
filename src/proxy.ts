import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Route
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/api/webhooks(.*)"]);
const isAdminOnlyRoute = createRouteMatcher(["/categories(.*)", "/suppliers(.*)", "/reports(.*)", "/users(.*)", "/api/categories(.*)", "/api/users(.*)"]);
const isAdminEmployeeRoute = createRouteMatcher(["/products(.*)", "/stock(.*)", "/alerts(.*)", "/orders/new(.*)", "/api/products(.*)", "/api/stock(.*)"]);

// Middleware
export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const metadata = sessionClaims?.metadata as { role?: string; isDemo?: boolean } | undefined;
  const role = metadata?.role;
  const isDemo = metadata?.isDemo ?? false;
  const { pathname } = req.nextUrl;
  const method = req.method;

  if (userId && isDemo && method !== "GET") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "This demo account is read-only. You cannot modify any data."}, { status: 403 });
    }
  }

  if (pathname === "/" || (userId && pathname.startsWith("/sign-in"))) {
    return NextResponse.redirect(new URL(userId ? "/dashboard" : "/sign-in", req.url));
  }

  if (!userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // 4. Admin-only routes — block non-admins
  if (userId && isAdminOnlyRoute(req) && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 5. Admin + Employee routes — block suppliers and unauthenticated
  if (userId && isAdminEmployeeRoute(req) && role !== "admin" && role !== "employee") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
