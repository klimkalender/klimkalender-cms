// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { BoulderBot, BoulderBotHookBase } from './BoulderBot.ts';
import { CompData } from "./CompData.ts";

const BOT_RUN_MAX_MINUTES = 5;

export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

console.log(`Function "boulderbot" up and running!`);

class SupabaseBoulderBotHook extends BoulderBotHookBase {
    private readonly supabaseClient: SupabaseClient;
    private readonly userEmail: string | null;
    private actionId: number | null = null;
    constructor(opts: any) {
        const { supabaseClient, user, ...rest } = opts || {};
        super(opts);
        this.supabaseClient = supabaseClient;
        this.userEmail = user || null;
    }
    async storeResult(data: CompData[]): Promise<void> {
        console.log('Storing result locally:', data);
        const jsonString = JSON.stringify(data, null, 2);
        this.supabaseClient.storage.from('boulderbot').upload(`botresult.json`, jsonString, {
            contentType: 'application/json',
        });
        return Promise.resolve();
    }
    async onBeforeRun(): Promise<void> {
        // Query for the last BOULDER_BOT action with no end time
        console.log('Checking for existing BOULDERBOT actions with no end time...');
        const { data: lastAction, error: actionError } = await this.supabaseClient
            .from('actions')
            .select('*')
            .eq('type', 'BOULDERBOT')
            .is('end', null)
            .order('start', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (actionError && actionError.code !== 'PGRST116') {
            console.error('Error querying actions:', actionError);
            throw actionError;
        }
        if (lastAction) {
            console.log('Last BOULDERBOT action with no end:', lastAction);
            if ((new Date().getTime() - new Date(lastAction.start).getTime()) < BOT_RUN_MAX_MINUTES * 60 * 1000) {
                console.log('A BoulderBot run is already in progress.');
                throw new Error('A BoulderBot run is already in progress. since ' + lastAction.start);
            } else {
                console.log('Previous BoulderBot run exceeded max time, continuing...');
                // Update the timed-out action with end time and failure details
                const { error: updateError } = await this.supabaseClient
                    .from('actions')
                    .update({
                        end: new Date().toISOString(),
                        result_ok: false,
                        details: "closed because it timed out - did it crash?"
                    })
                    .eq('id', lastAction.id);

                if (updateError) {
                    console.error('Error updating timed-out action:', updateError);
                    throw updateError;
                }
            }
        }
        // Create a new action record for this bot run
        console.log('Creating new BOULDERBOT action record...');
        const { data: newAction, error: insertError } = await this.supabaseClient
            .from('actions')
            .insert({
                type: 'BOULDERBOT',
                start: new Date().toISOString(),
                user_email: this.userEmail,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating new action:', insertError);
            throw insertError;
        }
        console.log('Created new BOULDERBOT action:', newAction);
        this.actionId = newAction.id;
        return Promise.resolve();
    }
    async onLog(message: string, level: string): Promise<void> {
        const { error } = await this.supabaseClient
            .from('action_logs')
            .insert({
                action_type: 'BOULDERBOT',
                action_id: this.actionId || '0',
                level: level,
                data: message,
            });

        if (error) {
            console.error('Error inserting action log:', error);
        }
        return Promise.resolve();

    }
    async onAfterRun(success: boolean, details?: string): Promise<void> {
        const { error } = await this.supabaseClient
            .from('actions')
            .update({
                end: new Date().toISOString(),
                result_ok: success,
                details: details,
            })
            .eq('id', this.actionId);

        if (error) {
            console.error('Error updating action:', error);
        }
        // now clean all logs for this action older than 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { error: deleteError } = await this.supabaseClient
            .from('action_logs')
            .delete()
            .lt('datetime', sevenDaysAgo.toISOString());

        if (deleteError) {
            console.error('Error deleting old action logs:', deleteError);
        }
        return Promise.resolve();
    }

}


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
        const token = req?.headers?.get("Authorization")?.replace("Bearer ", "");

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
        const hooks = new SupabaseBoulderBotHook({ supabaseClient, user: user?.email || null });
        const runner = new BoulderBot(apiKey, hooks);
        await runner.run();
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
