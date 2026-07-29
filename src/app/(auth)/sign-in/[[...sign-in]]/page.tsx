import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { DemoButtons } from "@/components/auth/DemoButtons";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function SignInPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      
      <div className="pointer-events-none absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />

      {/* Center content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          {/* Brand mark */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <Heart className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">MediStock</h1>
              <p className="mt-1 text-sm text-muted-foreground">Medical Inventory Management</p>
            </div>
          </div>

          {/* Clerk sign-in */}
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: ["w-full shadow-sm border border-border bg-card rounded-xl", "!shadow-sm"].join(" "),
                headerTitle: "text-foreground font-semibold text-base",
                headerSubtitle: "text-muted-foreground text-sm",
                formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors",
                footerActionLink: "text-primary hover:text-primary/80 font-medium",
                formFieldInput: "border-input bg-background text-foreground rounded-lg text-sm focus:ring-ring",
                formFieldLabel: "text-foreground text-sm font-medium",
                identityPreviewText: "text-foreground text-sm",
                dividerLine: "bg-border",
                dividerText: "text-muted-foreground text-xs",
                socialButtonsBlockButton: "border border-border bg-background hover:bg-muted text-foreground text-sm font-medium rounded-lg transition-colors",
              },
              variables: {
                borderRadius: "0.5rem",
              },
            }}
          />

          {/* Demo login section */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">or try a demo account</span>
              <Separator className="flex-1" />
            </div>
            <DemoButtons />
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground/70 leading-relaxed">
            Access is restricted to invited staff only.
            <br />
            Contact your warehouse manager for an invitation.
          </p>
        </div>
      </div>
    </main>
  );
}
