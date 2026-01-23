import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Manage() {
  return (
    <main>
      <Card className="glass glass-border">
        <CardHeader>
          <CardTitle>Management</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          PRD management screens (roster management, password reset assistance, audit history) will be implemented here.
        </CardContent>
      </Card>
    </main>
  );
}
