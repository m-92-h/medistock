import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DemoBanner() {
  return (
    <Alert
      variant="destructive"
      className="rounded-none border-x-0 border-t-0 border-b bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200 py-2"
    >
      <AlertTriangle className="h-3.5 w-3.5 text-amber-600! dark:text-amber-400!" />
      <AlertDescription className="text-xs font-medium">
        Demo account — read-only access. Changes will not be saved.
      </AlertDescription>
    </Alert>
  );
}
