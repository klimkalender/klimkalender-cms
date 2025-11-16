// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { BoulderBotProcessor } from './BoulderBotProcessor.ts';
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv'

dotenv.config({ path: '/workspace/klimkalender-cms/.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);


async function main() {

    console.log("Starting BoulderBotProcessor local run...");
    const processor = new BoulderBotProcessor(supabase);
    processor.processResult();
    console.log("BoulderBotProcessor local run completed.");
}

main().catch((error) => {
    console.error('Error running BoulderBot:', error);
    Deno.exit(1);
});

