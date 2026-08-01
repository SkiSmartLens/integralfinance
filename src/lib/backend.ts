// Single backend client for the whole app.
// Re-exports the generated client so there is exactly one project/key in use.
export { supabase } from "@/integrations/supabase/client";
