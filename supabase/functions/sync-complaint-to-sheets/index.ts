 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const SHEETS_WEBHOOK = "https://script.google.com/macros/s/AKfycbz15-1JN2jWhQUe-8j8hTUfUGijbFjuCv1bXX0bT_1I-wWHI0F_XpcK-b4cFmzS9ovr/exec";
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, {
       status: 204,
       headers: {
         "Access-Control-Allow-Origin": "*",
         "Access-Control-Allow-Methods": "POST",
         "Access-Control-Allow-Headers": "Content-Type, Authorization",
       },
     });
   }
 
   try {
     const body = await req.json();
     const {
       created_at,
       train_number,
       coach_number,
       class: coach_class,
       configuration,
       unit,
       position,
       capacity,
       pnr_number,
       customer_name,
       berth_number,
       contact_number,
       issue_description,
       action_plan,
       action_during_service,
       action_required_in_yard,
       status,
       reporter_name,
       reporter_staff_number,
     } = body;
 
     const payload = {
       date: new Date(created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
       train_number,
       coach_number,
       class: coach_class,
       configuration,
       unit,
       position,
       capacity,
       pnr_number,
       customer_name,
       berth_number,
       contact_number: contact_number || "—",
       issue_description,
       action_plan,
       action_during_service: action_during_service || "—",
       action_required_in_yard: action_required_in_yard || "—",
       status: status || "open",
       reporter_name,
       reporter_staff_number,
     };
 
     const res = await fetch(SHEETS_WEBHOOK, {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(payload),
     });
 
     if (!res.ok) {
       const errTxt = await res.text();
       throw new Error(`Google Sheets webhook failed: ${res.status} ${errTxt}`);
     }
 
     return new Response(JSON.stringify({ success: true }), {
       status: 200,
       headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
     });
   } catch (e: any) {
     return new Response(JSON.stringify({ error: e.message }), {
       status: 500,
       headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
     });
   }
 });