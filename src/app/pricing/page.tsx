import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-6 py-20">
      <Card className="w-full border-zinc-200/80">
        <CardHeader>
          <CardTitle>No SaaS pricing</CardTitle>
          <CardDescription>
            Convos is distributed as a single-merchant self-hosted application. There are no platform subscriptions or plans in this build.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/setup">Continue setup</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Log in</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
