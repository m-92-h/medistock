"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, UserRound, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDemoSessionToken } from "@/app/actions/demo-login";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  {
    label: "Admin",
    description: "Full access — manage everything",
    email: "demo.admin@medistock.com",
    Icon: ShieldCheck,
    className: "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/40",
  },
  {
    label: "Employee",
    description: "Inventory & stock operations",
    email: "demo.employee@medistock.com",
    Icon: UserRound,
    className: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40",
  },
  {
    label: "Supplier",
    description: "View and track your orders",
    email: "demo.supplier@medistock.com",
    Icon: Building2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40",
  },
] as const;

export function DemoButtons() {
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function handleDemoLogin(email: string, index: number) {
    setLoadingIndex(index);
    setError("");
    try {
      const token = await getDemoSessionToken(email);
      window.location.href = `/sign-in?__clerk_ticket=${token}`;
    } catch {
      setError("Could not sign in. Please try again.");
    } finally {
      setLoadingIndex(null);
    }
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-3 gap-2">
        {DEMO_ACCOUNTS.map((account, index) => {
          const { Icon } = account;
          const isLoading = loadingIndex === index;
          const isDisabled = loadingIndex !== null;

          return (
            <Tooltip key={index}>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDisabled}
                    onClick={() => handleDemoLogin(account.email, index)}
                    className={cn("flex h-auto flex-col gap-1.5 py-3 border font-medium transition-all", account.className, isDisabled && !isLoading && "opacity-50")}
                  />
                }
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" strokeWidth={1.75} />}
                <span className="text-xs leading-none">{account.label}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {account.description}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {error && <p className="text-center text-xs text-destructive mt-2">{error}</p>}
    </TooltipProvider>
  );
}
