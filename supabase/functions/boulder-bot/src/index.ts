// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from "@supabase/supabase-js";
import { BoulderBot, RunMode } from './BoulderBot.ts';
import { parse } from 'node-html-parser';



export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

console.log(`Function "boulderbot" up and running!`);

Deno.serve(async (req: Request) => {
    // This is needed if you're planning to invoke your function from a browser.
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Create a Supabase client with the Auth context of the logged in user.
        const supabaseClient = createClient(
            // Supabase API URL - env var exported by default.
            Deno.env.get("SUPABASE_URL") ?? "",
            // Supabase API ANON KEY - env var exported by default.
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            // Create client with Auth context of the user that called the function.
            // This way your row-level-security (RLS) policies are applied.
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            },
        );

        // First get the token from the Authorization header
        const token = req.headers.get("Authorization").replace("Bearer ", "");

        // Now we can get the session or user object
        const {
            data: { user },
        } = await supabaseClient.auth.getUser(token);

        // And we can run queries in the context of our authenticated user
        const { data, error } = await supabaseClient.from("tags").select("*");
        if (error) throw error;

        const outputDir = process.env.OUTPUT_DIR || '../output';
        const apiKey = process.env.CHATGPT_API_KEY;
        if (!apiKey) {
            console.error('CHATGPT_API_KEY environment variable is required');
            throw new Error('CHATGPT_API_KEY environment variable is required');
        }

        // Create and run the bot
        const runner = new BoulderBot(RunMode.STANDALONE, apiKey, outputDir);
        await runner.run();
        const root = parse('<ul id="list"><li>Hello World</li></ul>');
        console.log(root.querySelector('#list')?.outerHTML);
        return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });


    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/select-from-table-with-auth-rls' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24ifQ.625_WdcF3KHqz5amU0x2X5WWHP-OEs_4qj0ssLNHzTs' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
