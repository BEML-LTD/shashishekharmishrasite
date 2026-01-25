import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useToast } from "@/hooks/use-toast";
import { useRoleFlags } from "@/hooks/useRoleFlags";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import ComplaintDetailPanel from "./ComplaintDetailPanel";
import type { ComplaintFullRow } from "./ComplaintEditDialog";

function canEditOwn(complaint: ComplaintFullRow, userId: string) {
  if (complaint.reporter_user_id !== userId) return false;
  if (complaint.status === "resolved") return false;
  const created = new Date(complaint.created_at).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= 24 * 60 * 60 * 1000;
}

export default function ComplaintsMasterDetail() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const { flags } = useRoleFlags();
  const { userId } = useCurrentUserId();

  useEffect(() => {
    const channel = supabase
      .channel("realtime:complaints")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "complaints",
        },
        () => {
          qc.invalidateQueries({ queryKey: ["complaints", "list"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const listQuery = useQuery({
    queryKey: ["complaints", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select(
          "id, created_at, updated_at, reporter_user_id, reporter_name, reporter_staff_number, train_number, coach_number, pnr_number, customer_name, berth_number, contact_number, issue_description, action_plan, action_during_service, action_required_in_yard, status, resolved_at, evidence_paths"
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as ComplaintFullRow[];
    },
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => {
    const list = listQuery.data ?? [];
    if (!selectedId) return list[0] ?? null;
    return list.find((c) => c.id === selectedId) ?? list[0] ?? null;
  }, [listQuery.data, selectedId]);

  const canDelete = Boolean(flags.isAdminOrInCharge);
  const canEditStatus = Boolean(flags.isAdminOrInCharge);
  const canEdit = useMemo(() => {
    if (!selected) return false;
    if (flags.isAdminOrInCharge) return true; // Admin/In-charge always can edit
    if (!userId) return false; // still loading or no auth
    return flags.isAdminOrInCharge || canEditOwn(selected, userId);
  }, [flags.isAdminOrInCharge, selected, userId]);

  const deleteComplaint = async (id: string) => {
    const { error } = await supabase.from("complaints").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    setSelectedId(null);
    qc.invalidateQueries({ queryKey: ["complaints", "list"] });
    qc.invalidateQueries({ queryKey: ["dashboard", "complaints"] });
  };

  const content = (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="rounded-lg border bg-card/40">
          <div className="flex items-center justify-between gap-2 p-3">
            <div className="text-sm font-medium">Complaints</div>
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["complaints", "list"] })}>
              Refresh
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Train</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Reported by</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : listQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-destructive">
                    Failed to load complaints.
                  </TableCell>
                </TableRow>
              ) : (listQuery.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    No complaints yet.
                  </TableCell>
                </TableRow>
              ) : (
                (listQuery.data ?? []).map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedId(c.id);
                    }}
                  >
                    <TableCell className="font-medium">{c.train_number}</TableCell>
                    <TableCell> {c.coach_number}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{c.reporter_name}</TableCell>
                    <TableCell className="hidden md:table-cell">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {!isMobile ? (
        <div className="lg:col-span-1">
          <ComplaintDetailPanel
            complaint={selected}
            canEdit={canEdit}
            canDelete={canDelete}
            canEditStatus={canEditStatus}
            onDelete={deleteComplaint}
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {content}

      {isMobile ? (
        <Drawer open={Boolean(selectedId)} onOpenChange={(o) => setSelectedId(o ? selectedId : null)}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Complaint details</DrawerTitle>
              <DrawerDescription>View full details. Edit is shown only if you have permission.</DrawerDescription>
            </DrawerHeader>
            <div className="p-4">
              <ComplaintDetailPanel
                complaint={selected}
                canEdit={canEdit}
                canDelete={canDelete}
                canEditStatus={canEditStatus}
                onDelete={deleteComplaint}
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}
    </>
  );
}
