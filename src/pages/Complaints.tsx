import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WorkEntryForm from "@/components/complaints/WorkEntryForm";
import ComplaintsMasterDetail from "@/components/complaints/ComplaintsMasterDetail";

export default function Complaints() {
  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Work Entry</h1>
        <p className="text-sm text-muted-foreground">Log a new complaint with coach details and evidence.</p>
      </header>

      <Card className="glass glass-border">
        <CardHeader>
          <CardTitle>New work entry</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkEntryForm />
        </CardContent>
      </Card>

      <Card className="glass glass-border">
        <CardHeader>
          <CardTitle>All complaints</CardTitle>
        </CardHeader>
        <CardContent>
          <ComplaintsMasterDetail />
        </CardContent>
      </Card>
    </main>
  );
}
