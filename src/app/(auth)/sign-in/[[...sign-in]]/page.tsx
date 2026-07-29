import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { DemoButtons } from "@/components/auth/DemoButtons";
import { Separator } from "@/components/ui/separator";
import logo from "../../../../../public/images/logo.svg";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function SignInPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -left-32 -top-32 h-125 w-125 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-100 w-100 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Image src={logo} className="flex size-12 sm:size-18 items-center justify-center rounded-2xl" alt="logo" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">MediStock</h1>
              <p className="mt-1 text-sm text-muted-foreground">Medical Inventory Management</p>
            </div>
          </div>

          <SignIn
            appearance={{
              elements: {
                footer: {
                  display: "none",
                },
              },
            }}
          />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">or try a demo account</span>
              <Separator className="flex-1" />
            </div>
            <DemoButtons />
          </div>

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
