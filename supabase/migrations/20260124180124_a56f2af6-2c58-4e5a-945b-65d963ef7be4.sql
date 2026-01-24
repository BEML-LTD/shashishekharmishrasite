-- Enable realtime broadcasting for complaints changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;

-- Ensure update/delete events contain full row data when needed
ALTER TABLE public.complaints REPLICA IDENTITY FULL;