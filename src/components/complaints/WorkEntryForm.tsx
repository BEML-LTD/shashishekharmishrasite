import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type TrainRow = { id: string; train_number: string };
type CoachRow = {
  id: string;
  coach_number: string;
  class: string;
  unit: string;
  configuration: string;
  capacity: number;
  position: number;
};

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const complaintSchema = z
  .object({
    train_number: z.string().trim().min(1, "Train is required"),
    coach_number: z.string().trim().min(1, "Coach is required"),

    // Auto-filled coach metadata (still validated so the insert never fails)
    class: z.string().trim().min(1, "Class is required"),
    unit: z.string().trim().min(1, "Unit is required"),
    configuration: z.string().trim().min(1, "Configuration is required"),
    capacity: z.coerce.number().int().min(1, "Capacity is required"),
    position: z.coerce.number().int().min(1, "Position is required"),

    pnr_number: z.string().trim().min(1, "PNR is required").max(20, "PNR is too long"),
    customer_name: z.string().trim().min(1, "Customer name is required").max(120, "Name is too long"),
    berth_number: z.string().trim().min(1, "Berth is required").max(20, "Berth is too long"),
    contact_number: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.replace(/\D/g, "") : ""))
      .refine((v) => !v || (v.length >= 10 && v.length <= 15), {
        message: "Contact number should be 10–15 digits",
      }),

    issue_description: z.string().trim().min(10, "Please describe the issue (min 10 characters)").max(2000),
    action_plan: z.string().trim().min(3, "Action plan is required").max(1000),
  })
  .strict();

type ComplaintFormValues = z.infer<typeof complaintSchema>;

function safeExt(fileName: string) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "jpg";
  if (ext === "png") return "png";
  if (ext === "webp") return "webp";
  return "jpg";
}

export default function WorkEntryForm() {
  const { toast } = useToast();
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [evidenceKey, setEvidenceKey] = useState(0);

  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      train_number: "",
      coach_number: "",
      class: "",
      unit: "",
      configuration: "",
      capacity: 0,
      position: 0,
      pnr_number: "",
      customer_name: "",
      berth_number: "",
      contact_number: "",
      issue_description: "",
      action_plan: "",
    },
    mode: "onSubmit",
  });

  const trainsQuery = useQuery({
    queryKey: ["work-entry", "trains"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trains").select("id, train_number").order("train_number");
      if (error) throw error;
      return (data || []) as TrainRow[];
    },
  });

  const trainMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of trainsQuery.data ?? []) map.set(t.train_number, t.id);
    return map;
  }, [trainsQuery.data]);

  const selectedTrainNumber = form.watch("train_number");
  const selectedTrainId = selectedTrainNumber ? trainMap.get(selectedTrainNumber) ?? null : null;

  const coachesQuery = useQuery({
    queryKey: ["work-entry", "coaches", { trainId: selectedTrainId }],
    enabled: Boolean(selectedTrainId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_formations")
        .select("id, coach_number, class, unit, configuration, capacity, position")
        .eq("train_id", selectedTrainId as string)
        .order("position", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []) as CoachRow[];
    },
  });

  const coachByNumber = useMemo(() => {
    const map = new Map<string, CoachRow>();
    for (const c of coachesQuery.data ?? []) map.set(c.coach_number, c);
    return map;
  }, [coachesQuery.data]);

  const onTrainChange = (train_number: string) => {
    form.setValue("train_number", train_number, { shouldValidate: true });
    // Reset coach + metadata when train changes
    form.setValue("coach_number", "", { shouldValidate: true });
    form.setValue("class", "");
    form.setValue("unit", "");
    form.setValue("configuration", "");
    form.setValue("capacity", 0);
    form.setValue("position", 0);
  };

  const onCoachChange = (coach_number: string) => {
    form.setValue("coach_number", coach_number, { shouldValidate: true });
    const coach = coachByNumber.get(coach_number);
    if (coach) {
      form.setValue("class", coach.class, { shouldValidate: true });
      form.setValue("unit", coach.unit, { shouldValidate: true });
      form.setValue("configuration", coach.configuration, { shouldValidate: true });
      form.setValue("capacity", coach.capacity, { shouldValidate: true });
      form.setValue("position", coach.position, { shouldValidate: true });
    }
  };

  const validateEvidenceFiles = (files: File[]) => {
    if (files.length > 3) return "You can upload up to 3 photos.";
    for (const f of files) {
      if (!ACCEPTED_IMAGE_TYPES.includes(f.type as any)) return "Allowed file types: JPG, PNG, WEBP.";
      if (f.size > 5 * 1024 * 1024) return "Each photo must be under 5MB.";
    }
    return null;
  };

  const submit = async (values: ComplaintFormValues) => {
    if (!selectedTrainId) {
      toast({ title: "Train required", description: "Please select a train.", variant: "destructive" });
      return;
    }

    const evidenceFiles = Array.from(evidenceInputRef.current?.files ?? []);
    const evidenceErr = validateEvidenceFiles(evidenceFiles);
    if (evidenceErr) {
      toast({ title: "Evidence upload", description: evidenceErr, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw userErr ?? new Error("Session not found");

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("full_name, staff_number")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (profileErr || !profile) throw profileErr ?? new Error("Profile not found");

      const insertPayload = {
        reporter_user_id: userData.user.id,
        reporter_name: profile.full_name,
        reporter_staff_number: profile.staff_number,
        train_number: values.train_number,
        coach_number: values.coach_number,
        class: values.class,
        unit: values.unit,
        configuration: values.configuration,
        capacity: values.capacity,
        position: values.position,
        pnr_number: values.pnr_number,
        customer_name: values.customer_name,
        berth_number: values.berth_number,
        contact_number: values.contact_number ? values.contact_number : null,
        issue_description: values.issue_description,
        action_plan: values.action_plan,
        evidence_paths: [] as string[],
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("complaints")
        .insert(insertPayload)
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      const complaintId = inserted.id as string;

      let evidencePaths: string[] = [];
      if (evidenceFiles.length > 0) {
        const uploads = await Promise.all(
          evidenceFiles.map(async (file, idx) => {
            const ext = safeExt(file.name);
            const path = `${userData.user.id}/${complaintId}/${Date.now()}_${idx}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from("evidence").upload(path, file, {
              upsert: false,
              contentType: file.type,
            });
            if (uploadErr) throw uploadErr;
            return path;
          })
        );

        evidencePaths = uploads;
        const { error: updateErr } = await supabase
          .from("complaints")
          .update({ evidence_paths: evidencePaths })
          .eq("id", complaintId);
        if (updateErr) throw updateErr;
      }

     // Sync to Google Sheets immediately (and log compliance_sync)
     (async () => {
       try {
         const { data: sheetPayload } = await supabase
           .from("complaints")
           .select("*")
           .eq("id", complaintId)
           .single();

         if (!sheetPayload) return;

         const sheetRes = await supabase.functions.invoke("sync-complaint-to-sheets", {
           body: sheetPayload,
         });

         const syncLog = {
           complaint_id: complaintId,
           status: sheetRes.error ? "failed" : "success",
           message: sheetRes.error ? JSON.stringify(sheetRes.error) : null,
         };
         await supabase.from("compliance_sync").insert(syncLog);
       } catch (err: any) {
         console.error("Sheets sync error:", err);
         await supabase.from("compliance_sync").insert({
           complaint_id: complaintId,
           status: "failed",
           message: err?.message || "Unknown error",
         });
       }
     })();

      toast({
        title: "Work entry submitted",
        description: evidencePaths.length ? `Saved with ${evidencePaths.length} photo(s).` : "Saved successfully.",
      });

      form.reset();
      if (evidenceInputRef.current) evidenceInputRef.current.value = "";
      setEvidenceKey((k) => k + 1);
    } catch (err: any) {
      toast({
        title: "Submit failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const errors = form.formState.errors;

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(submit)}>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Train number</Label>
          <Select value={form.watch("train_number")} onValueChange={onTrainChange}>
            <SelectTrigger>
              <SelectValue placeholder={trainsQuery.isLoading ? "Loading trains…" : "Select train"} />
            </SelectTrigger>
            <SelectContent>
              {(trainsQuery.data ?? []).map((t) => (
                <SelectItem key={t.id} value={t.train_number}>
                  {t.train_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.train_number ? <p className="text-xs text-destructive">{errors.train_number.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Coach number</Label>
          <Select value={form.watch("coach_number")} onValueChange={onCoachChange} disabled={!selectedTrainId}>
            <SelectTrigger>
              <SelectValue
                placeholder={!selectedTrainId ? "Select train first" : coachesQuery.isLoading ? "Loading coaches…" : "Select coach"}
              />
            </SelectTrigger>
            <SelectContent>
              {(coachesQuery.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.coach_number}>
                  {c.coach_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.coach_number ? <p className="text-xs text-destructive">{errors.coach_number.message}</p> : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-sm font-medium">Coach metadata (auto-filled)</div>
        <div className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2">
            <Label>Class</Label>
            <Input value={form.watch("class")} readOnly />
            {errors.class ? <p className="text-xs text-destructive">{errors.class.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Input value={form.watch("unit")} readOnly />
            {errors.unit ? <p className="text-xs text-destructive">{errors.unit.message}</p> : null}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Configuration</Label>
            <Input value={form.watch("configuration")} readOnly />
            {errors.configuration ? <p className="text-xs text-destructive">{errors.configuration.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Capacity / Pos</Label>
            <Input value={`${form.watch("capacity") || ""}${form.watch("position") ? ` / ${form.watch("position")}` : ""}`} readOnly />
          </div>
        </div>
      </section>

      <Separator />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pnr">PNR</Label>
          <Input id="pnr" {...form.register("pnr_number")} />
          {errors.pnr_number ? <p className="text-xs text-destructive">{errors.pnr_number.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="berth">Berth</Label>
          <Input id="berth" {...form.register("berth_number")} />
          {errors.berth_number ? <p className="text-xs text-destructive">{errors.berth_number.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer">Customer name</Label>
          <Input id="customer" {...form.register("customer_name")} autoComplete="name" />
          {errors.customer_name ? <p className="text-xs text-destructive">{errors.customer_name.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact">Contact (optional)</Label>
          <Input id="contact" inputMode="numeric" placeholder="10–15 digits" {...form.register("contact_number")} autoComplete="tel" />
          {errors.contact_number ? <p className="text-xs text-destructive">{errors.contact_number.message}</p> : null}
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor="issue">Issue description</Label>
        <Textarea id="issue" rows={4} placeholder="Describe the issue clearly…" {...form.register("issue_description")} />
        {errors.issue_description ? <p className="text-xs text-destructive">{errors.issue_description.message}</p> : null}
      </section>

      <section className="space-y-2">
        <Label htmlFor="plan">Action plan</Label>
        <Textarea id="plan" rows={3} placeholder="What action will be taken?" {...form.register("action_plan")} />
        {errors.action_plan ? <p className="text-xs text-destructive">{errors.action_plan.message}</p> : null}
      </section>

      <section className="space-y-2">
        <Label htmlFor="evidence">Photo evidence (optional, up to 3)</Label>
        <Input
          key={evidenceKey}
          id="evidence"
          ref={evidenceInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
        />
        <p className="text-xs text-muted-foreground">JPG/PNG/WEBP only. Max 5MB each.</p>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.reset();
            if (evidenceInputRef.current) evidenceInputRef.current.value = "";
            setEvidenceKey((k) => k + 1);
          }}
          disabled={submitting}
        >
          Clear
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit work entry"}
        </Button>
      </div>
    </form>
  );
}
