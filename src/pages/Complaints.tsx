import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Complaints() {
  return (
    <main>
      <Card className="glass glass-border">
        <CardHeader>
          <CardTitle>Complaints</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          PRD complaints module is next (create complaint + list + status workflow).
        </CardContent>
      </Card>
    </main>
  );
}
