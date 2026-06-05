import dotenv from 'dotenv'
dotenv.config()

export const PORT = process.env.PORT || 5000
// SUPABASE_URL and SUPABASE_ANON_KEY are loaded directly in server/lib/supabase.js
