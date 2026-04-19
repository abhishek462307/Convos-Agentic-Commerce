"use client";

import Link from "next/link";
import { Ban, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UsersPermissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Team Management</h2>
        <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">
          This open-source build runs in single-merchant mode. Team and staff accounts are disabled.
        </p>
      </div>

      <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
        <CardHeader className="border-b border-border/70 py-4 px-6 bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-secondary/20 flex items-center justify-center border border-border/70">
              <Ban className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-[17px] font-semibold tracking-tight">Disabled in single-merchant mode</CardTitle>
              <CardDescription className="text-[13px] text-muted-foreground mt-0.5">
                Invite, role, and permission management is intentionally unavailable.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Use account-level security controls for the owner account.
            </p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/settings/security">
                <Shield className="w-4 h-4 mr-2" />
                Open Security Settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
