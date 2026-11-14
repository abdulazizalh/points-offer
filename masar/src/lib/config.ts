// Public runtime configuration. Only NEXT_PUBLIC_* values may appear here.
//
// The UI currently runs on the in-browser demo engine (src/lib/engine.ts), clearly
// labelled as demo data. The production backend (supabase/migrations) implements the
// same rules server-side and is covered by supabase/tests. Switching the UI to it
// requires the Supabase data adapter (see docs/ARCHITECTURE.md → "Going live"); until
// that ships, DATA_MODE stays "demo" regardless of env so the app never claims live data.
export const SUPABASE_CONFIGURED = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const DATA_MODE: "demo" | "supabase" = "demo";
export const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
export const DEMO_OTP = "123456";
