import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { ComplaintEditDialog, ComplaintFullRow } from "./ComplaintEditDialog";

function fmt(d: string) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

export default function ComplaintDetailPanel({
  complaint,
  canEdit,
  canDelete,
  canEditStatus,
  onDelete,
}: {
  complaint: ComplaintFullRow | null;
  canEdit: boolean;
  canDelete: boolean;
  canEditStatus: boolean;
  onDelete: (id: string) => Promise<void>;
}) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);

  const openEvidence = async (path: string) => {
    const { data, error } = await supabase.storage.from("evidence").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Could not open photo", description: error?.message || "Please try again.", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (!complaint) {
    return (
      <Card className="glass glass-border">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Select a complaint to view full details.</CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass glass-border">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Complaint details</CardTitle>
            <Badge variant="secondary">{complaint.status.replace("_", " ")}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            #{complaint.id.slice(0, 8)} • Created {fmt(complaint.created_at)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <section className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">Train / Coach</div>
              <div className="text-sm font-medium">
                {complaint.train_number} • Coach {complaint.coach_number}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">PNR / Berth</div>
              <div className="text-sm font-medium">
                {complaint.pnr_number} • {complaint.berth_number}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Customer</div>
              <div className="text-sm font-medium">{complaint.customer_name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Contact</div>
              <div className="text-sm font-medium">{complaint.contact_number || "—"}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground">Reported by</div>
              <div className="text-sm font-medium">
                {complaint.reporter_name} ({complaint.reporter_staff_number})
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-2">
            <div className="text-xs text-muted-foreground">Issue</div>
            <div className="text-sm whitespace-pre-wrap">{complaint.issue_description}</div>
          </section>

          <section className="space-y-2">
            <div className="text-xs text-muted-foreground">Action plan</div>
            <div className="text-sm whitespace-pre-wrap">{complaint.action_plan}</div>
          </section>

          {(complaint.action_during_service || complaint.action_required_in_yard) ? (
            <section className="space-y-3">
              {complaint.action_during_service ? (
                <div>
                  <div className="text-xs text-muted-foreground">Action during service</div>
                  <div className="text-sm whitespace-pre-wrap">{complaint.action_during_service}</div>
                </div>
              ) : null}
              {complaint.action_required_in_yard ? (
                <div>
                  <div className="text-xs text-muted-foreground">Action required in yard</div>
                  <div className="text-sm whitespace-pre-wrap">{complaint.action_required_in_yard}</div>
                </div>
              ) : null}
            </section>
          ) : null}

          {complaint.evidence_paths?.length ? (
            <section className="space-y-2">
              <div className="text-xs text-muted-foreground">Evidence</div>
              <div className="flex flex-col gap-2">
                {complaint.evidence_paths.map((p) => (
                  <Button key={p} variant="outline" size="sm" className="justify-start" onClick={() => openEvidence(p)}>
                    Open photo
                  </Button>
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!window.confirm("Delete this complaint? This cannot be undone.")) return;
                  await onDelete(complaint.id);
                }}
              >
                Delete
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {canEdit ? (
        <ComplaintEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          complaint={complaint}
          canEdit={canEdit}
          canEditStatus={canEditStatus}
        />
      ) : null}
    </>
  );
}
