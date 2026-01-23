import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRoleFlags } from "@/hooks/useRoleFlags";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

type DateRange = "7d" | "30d" | "all";
type StatusFilter = "all" | "open" | "in_progress" | "resolved";

type ComplaintRow = {
  id: string;
  created_at: string;
  status: "open" | "in_progress" | "resolved";
  coach_number: string;
  train_number: string;
  reporter_name: string;
  issue_description: string;
};

function toISODate(d: Date) {
  // yyyy-mm-dd
  return d.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { flags } = useRoleFlags();

  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [coach, setCoach] = useState<string>("all");

  const fromDate = useMemo(() => {
    if (dateRange === "all") return null;
    const days = dateRange === "7d" ? 7 : 30;
    const d = new Date();
    d.setDate(d.getDate() - (days - 1));
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [dateRange]);

  const complaintsQuery = useQuery({
    queryKey: ["dashboard", "complaints", { dateRange, status, coach }],
    queryFn: async () => {
      let q = supabase
        .from("complaints")
        .select("id, created_at, status, coach_number, train_number, reporter_name, issue_description")
        .order("created_at", { ascending: false })
        .limit(500);

      if (fromDate) q = q.gte("created_at", fromDate);
      if (status !== "all") q = q.eq("status", status);
      if (coach !== "all") q = q.eq("coach_number", coach);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ComplaintRow[];
    },
  });

  const complaints = complaintsQuery.data ?? [];

  const coachOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of complaints) set.add(c.coach_number);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [complaints]);

  const perCoach = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of complaints) {
      map.set(c.coach_number, (map.get(c.coach_number) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([coach_number, count]) => ({ coach_number, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [complaints]);

  const trend = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of complaints) {
      const key = toISODate(new Date(c.created_at));
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [complaints]);

  const summary = useMemo(() => {
    let open = 0,
      inProgress = 0,
      resolved = 0;
    for (const c of complaints) {
      if (c.status === "open") open++;
      else if (c.status === "in_progress") inProgress++;
      else resolved++;
    }
    return { total: complaints.length, open, inProgress, resolved };
  }, [complaints]);

  const updateStatus = async (id: string, next: ComplaintRow["status"]) => {
    const { error } = await supabase.from("complaints").update({ status: next }).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Status updated" });
    qc.invalidateQueries({ queryKey: ["dashboard", "complaints"] });
  };

  const deleteComplaint = async (id: string) => {
    const { error } = await supabase.from("complaints").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    qc.invalidateQueries({ queryKey: ["dashboard", "complaints"] });
  };

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {flags.isAdminOrInCharge ? "All complaints (team view)" : "Your complaints (officer view)"}
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Range</span>
          <Button
            variant={dateRange === "7d" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange("7d")}
          >
            7d
          </Button>
          <Button
            variant={dateRange === "30d" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange("30d")}
          >
            30d
          </Button>
          <Button
            variant={dateRange === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange("all")}
          >
            All
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status</span>
          {(["all", "open", "in_progress", "resolved"] as StatusFilter[]).map((s) => (
            <Button key={s} variant={status === s ? "default" : "outline"} size="sm" onClick={() => setStatus(s)}>
              {s === "all" ? "All" : s.replace("_", " ")}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Coach</span>
          <div className="flex flex-wrap gap-2">
            <Button variant={coach === "all" ? "default" : "outline"} size="sm" onClick={() => setCoach("all")}>
              All
            </Button>
            {coachOptions.slice(0, 8).map((c) => (
              <Button key={c} variant={coach === c ? "default" : "outline"} size="sm" onClick={() => setCoach(c)}>
                {c}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="glass glass-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.total}</CardContent>
        </Card>
        <Card className="glass glass-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.open}</CardContent>
        </Card>
        <Card className="glass glass-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In progress</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.inProgress}</CardContent>
        </Card>
        <Card className="glass glass-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.resolved}</CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="glass glass-border">
          <CardHeader>
            <CardTitle className="text-base">Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-64 w-full"
              config={{
                count: { label: "Complaints", color: `hsl(var(--primary))` },
              }}
            >
              <LineChart data={trend} margin={{ left: 12, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickMargin={8} />
                <YAxis width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass glass-border">
          <CardHeader>
            <CardTitle className="text-base">Top coaches</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-64 w-full"
              config={{
                count: { label: "Count", color: `hsl(var(--primary-glow))` },
              }}
            >
              <BarChart data={perCoach} margin={{ left: 12, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="coach_number" tickMargin={8} />
                <YAxis width={28} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="glass glass-border">
          <CardHeader>
            <CardTitle className="text-base">Recent complaints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {complaintsQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : complaintsQuery.isError ? (
              <div className="text-sm text-destructive">Failed to load complaints.</div>
            ) : complaints.length === 0 ? (
              <div className="text-sm text-muted-foreground">No complaints for current filters.</div>
            ) : (
              <div className="space-y-2">
                {complaints.slice(0, 10).map((c) => (
                  <div key={c.id} className="flex flex-col gap-2 rounded-lg border bg-card/40 p-3 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{c.train_number}</span>
                        <span className="text-sm text-muted-foreground">Coach {c.coach_number}</span>
                        <Badge variant="secondary">{c.status.replace("_", " ")}</Badge>
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.issue_description}</div>
                      <div className="mt-1 text-xs text-muted-foreground">By {c.reporter_name} • {new Date(c.created_at).toLocaleString()}</div>
                    </div>

                    {flags.isAdminOrInCharge ? (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => updateStatus(c.id, "in_progress")}>
                          In progress
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => updateStatus(c.id, "resolved")}>
                          Resolve
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteComplaint(c.id)}>
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
