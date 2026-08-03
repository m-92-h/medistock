import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Route
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/api/webhooks(.*)"]);
const isAdminOnlyRoute = createRouteMatcher(["/categories(.*)", "/suppliers(.*)", "/reports(.*)", "/users(.*)", "/invite(.*)", "/api/categories(.*)", "/api/users(.*)", "/api/reports(.*)"]);
const isAdminEmployeeRoute = createRouteMatcher(["/products(.*)", "/stock(.*)", "/alerts(.*)", "/api/products(.*)", "/api/stock(.*)"]);

// Middleware
export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const metadata = sessionClaims?.metadata as { role?: string; isDemo?: boolean } | undefined;
  const role = metadata?.role;
  const { pathname } = req.nextUrl;
  const method = req.method;

  // أضف هذا السطر مؤقتاً
  if (pathname === "/orders/new") {
    console.log("DEBUG /orders/new →", { userId, role, metadata, sessionClaims });
  }
  
  // Redirect root
  if (pathname === "/") {
    return NextResponse.redirect(new URL(userId ? "/dashboard" : "/sign-in", req.url));
  }

  // Redirect logged-in users away from sign-in
  if (userId && pathname.startsWith("/sign-in")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Block unauthenticated users from protected routes
  if (!userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Demo accounts: block all non-GET API calls
  if (userId && metadata?.isDemo && method !== "GET" && pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "This demo account is read-only. You cannot modify any data." },
      { status: 403 }
    );
  }

  // Admin-only routes
  if (userId && isAdminOnlyRoute(req) && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Admin + Employee routes (suppliers blocked)
  if (userId && isAdminEmployeeRoute(req) && role !== "admin" && role !== "employee") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Supplier: block /orders/new page and POST /api/orders
  if (userId && role === "supplier") {
    if (pathname === "/orders/new") {
      return NextResponse.redirect(new URL("/orders", req.url));
    }
    if (pathname === "/api/orders" && method === "POST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
