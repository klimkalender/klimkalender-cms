// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from "@supabase/supabase-js";
import { Octokit } from "@octokit/rest";
import { GitService } from "./git.ts";
import { executeExport } from "./export.ts";

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
if (!GITHUB_TOKEN) {
  console.error("❌ Missing GITHUB_TOKEN env variable");
  Deno.exit(1);
}

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

console.log(`Function "kk-publish" up and running! (kk)`);

const owner = "klimkalender";
const repo = "klimkalender-site";
const branch = "main";

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

    const gitService = new GitService(octokit, owner, repo, branch);

    // First get the token from the Authorization header
    const token = req?.headers?.get("Authorization")?.replace("Bearer ", "");

    // Now we can get the session or user object
    const {
      data: { user },
    } = await supabaseClient.auth.getUser(token);

    console.log("Authenticated user:", user?.email);
    if (!user) {
      throw new Error("User not authenticated");
    }

    const result = await executeExport(
      user.email || "anonymous@klimkalender.nl",
      supabaseClient,
      gitService,
    );

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as any).message }), {
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
