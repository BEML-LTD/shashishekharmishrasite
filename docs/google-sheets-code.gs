 function doPost(e) {
   try {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     const payload = JSON.parse(e.postData.contents);
 
     // Auto-setup headers if sheet is empty
     if (sheet.getLastRow() === 0) {
       sheet.appendRow([
         "Date",
         "Train Number",
         "Coach Number",
         "Class",
         "Configuration",
         "Unit",
         "Position",
         "Capacity",
         "PNR",
         "Customer Name",
         "Berth",
         "Contact",
         "Issue Description",
         "Action Plan",
         "Action During Service",
         "Action Required in Yard",
         "Status",
         "Reporter Name",
         "Reporter Staff #",
       ]);
     }
 
     // Append the new complaint row
     sheet.appendRow([
       payload.date || "",
       payload.train_number || "",
       payload.coach_number || "",
       payload.class || "",
       payload.configuration || "",
       payload.unit || "",
       payload.position || "",
       payload.capacity || "",
       payload.pnr_number || "",
       payload.customer_name || "",
       payload.berth_number || "",
       payload.contact_number || "",
       payload.issue_description || "",
       payload.action_plan || "",
       payload.action_during_service || "",
       payload.action_required_in_yard || "",
       payload.status || "",
       payload.reporter_name || "",
       payload.reporter_staff_number || "",
     ]);
 
     return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
   } catch (error) {
     return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
   }
 }