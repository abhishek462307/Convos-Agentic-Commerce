import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppsPage() {
  return (
    <div className="space-y-6">
      <Card className="border-zinc-200/80">
        <CardHeader>
          <CardTitle>Apps marketplace removed</CardTitle>
          <CardDescription>
            This single-merchant open-source build does not include the multi-merchant apps marketplace.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Configure integrations directly in Settings (AI keys, payments, domain, SMTP, and self-host checks).
        </CardContent>
      </Card>
    </div>
  );
}
