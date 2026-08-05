"use client";

import { useState } from "react";
import { Mail, UserPlus, ShieldCheck, Building2, UserCheck, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InvitePage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"employee" | "supplier">("employee");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation.");
      }

      setSuccessMsg(`Invitation successfully sent to ${data.invitation.email}`);
      setEmail("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UserPlus className="w-8 h-8 text-primary" /> Invite Team Members & Suppliers
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Send Clerk email invitations to assign new users as internal staff or external suppliers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Invite Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" /> Send New Invitation
            </CardTitle>
            <CardDescription>An invitation email with a sign-up link will be dispatched automatically.</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Feedback Alerts */}
              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email">Recipient Email Address</Label>
                <Input id="email" type="email" placeholder="colleague@medistock.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Assign Role</Label>
                <Select
                  value={role}
                  onValueChange={(val) => {
                    if (val) setRole(val as "employee" | "supplier");
                  }}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-500" />
                        <span>Employee</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="supplier">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-500" />
                        <span>Supplier</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button type="submit" disabled={loading} className="w-full gap-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending Invitation...
                  </>
                ) : (
                  <>
                    Send Clerk Invitation <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Roles Reference Card */}
        <Card className="bg-muted/40 border-dashed">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Role Privileges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Employee
              </div>
              <p className="text-muted-foreground leading-relaxed">Can manage inventory items, record stock movements (IN/OUT), process orders, and view stock alerts.</p>
            </div>

            <div className="border-t pt-3 space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-500" /> Supplier
              </div>
              <p className="text-muted-foreground leading-relaxed">Restricted access. Can view their own supplied products, pending purchase orders, and update order statuses.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
