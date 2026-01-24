import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export type ComplaintStatus = "open" | "in_progress" | "resolved";

export type ComplaintFullRow = {
  id: string;
  created_at: string;
  updated_at: string;
  reporter_user_id: string;
  reporter_name: string;
  reporter_staff_number: string;
  train_number: string;
  coach_number: string;
  pnr_number: string;
  customer_name: string;
  berth_number: string;
  contact_number: string | null;
  issue_description: string;
  action_plan: string;
  action_during_service: string | null;
  action_required_in_yard: string | null;
  status: ComplaintStatus;
  resolved_at: string | null;
  evidence_paths: string[];
};

const editSchema = z
  .object({
    // status is only allowed for Admin/In-charge (we gate UI and omit field otherwise)
    status: z.enum(["open", "in_progress", "resolved"]).optional(),

    pnr_number: z.string().trim().min(1).max(20),
    customer_name: z.string().trim().min(1).max(120),
    berth_number: z.string().trim().min(1).max(20),
    contact_number: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.replace(/\D/g, "") : ""))
      .refine((v) => !v || (v.length >= 10 && v.length <= 15), {
        message: "Contact number should be 10–15 digits",
      }),

    issue_description: z.string().trim().min(10).max(2000),
    action_plan: z.string().trim().min(3).max(1000),
    action_during_service: z.string().trim().max(1000).optional(),
    action_required_in_yard: z.string().trim().max(1000).optional(),
  })
  .strict();

type EditValues = z.infer<typeof editSchema>;

export function ComplaintEditDialog({
  open,
  onOpenChange,
  complaint,
  canEdit,
  canEditStatus,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  complaint: ComplaintFullRow;
  canEdit: boolean;
  canEditStatus: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const defaultValues = useMemo<EditValues>(() => {
    return {
      status: canEditStatus ? complaint.status : undefined,
      pnr_number: complaint.pnr_number,
      customer_name: complaint.customer_name,
      berth_number: complaint.berth_number,
      contact_number: complaint.contact_number ?? "",
      issue_description: complaint.issue_description,
      action_plan: complaint.action_plan,
      action_during_service: complaint.action_during_service ?? "",
      action_required_in_yard: complaint.action_required_in_yard ?? "",
    };
  }, [canEditStatus, complaint]);

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues,
    mode: "onSubmit",
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const submit = async (values: EditValues) => {
    if (!canEdit) return;

    const payload: any = {
      pnr_number: values.pnr_number,
      customer_name: values.customer_name,
      berth_number: values.berth_number,
      contact_number: values.contact_number ? values.contact_number : null,
      issue_description: values.issue_description,
      action_plan: values.action_plan,
      action_during_service: values.action_during_service ? values.action_during_service : null,
      action_required_in_yard: values.action_required_in_yard ? values.action_required_in_yard : null,
    };
    if (canEditStatus && values.status) payload.status = values.status;

    const { error } = await supabase.from("complaints").update(payload).eq("id", complaint.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Updated" });
    qc.invalidateQueries({ queryKey: ["complaints", "list"] });
    qc.invalidateQueries({ queryKey: ["dashboard", "complaints"] });
    onOpenChange(false);
  };

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit complaint</DialogTitle>
          <DialogDescription>Changes are saved to the database and audited by access rules.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          {canEditStatus ? (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.watch("status") || complaint.status} onValueChange={(v) => form.setValue("status", v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>PNR</Label>
              <Input {...form.register("pnr_number")} />
            </div>
            <div className="space-y-2">
              <Label>Berth</Label>
              <Input {...form.register("berth_number")} />
            </div>
            <div className="space-y-2">
              <Label>Customer name</Label>
              <Input {...form.register("customer_name")} />
            </div>
            <div className="space-y-2">
              <Label>Contact (optional)</Label>
              <Input inputMode="numeric" {...form.register("contact_number")} />
              {errors.contact_number ? <p className="text-xs text-destructive">{errors.contact_number.message}</p> : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Issue description</Label>
            <Textarea rows={4} {...form.register("issue_description")} />
          </div>
          <div className="space-y-2">
            <Label>Action plan</Label>
            <Textarea rows={3} {...form.register("action_plan")} />
          </div>
          <div className="space-y-2">
            <Label>Action during service (optional)</Label>
            <Textarea rows={2} {...form.register("action_during_service")} />
          </div>
          <div className="space-y-2">
            <Label>Action required in yard (optional)</Label>
            <Textarea rows={2} {...form.register("action_required_in_yard")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canEdit}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
