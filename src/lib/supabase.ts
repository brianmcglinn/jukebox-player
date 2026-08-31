import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
  // Self-hosted, dedicated-schema-per-app pattern — same instance as
  // jeopardy_app, this project's tables/functions live in their own schema.
  db: { schema: 'mcjukebox' },
});
