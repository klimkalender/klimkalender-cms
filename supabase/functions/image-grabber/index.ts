// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

console.log(`Function "event-image-grabber" up and running!`);

export async function uploadRemoteImageToSupabase(supabase: SupabaseClient, imageUrl: string, bucket: string, prefix?: string): Promise<string | undefined> {
  const extension = imageUrl.split('.').pop() || '';
  const imageName = imageUrl.split('/').pop()?.replaceAll(/\s/g, '-').replaceAll('%', '-') || '';
  const imagePrefix = prefix ? `${prefix}` : Math.random().toString(36).substring(2, 6);
  console.log(imageUrl);
  const response = await fetch(imageUrl);
  if (!response.ok) {
    console.error('Failed to fetch image:', response.statusText);
    return;
  }
  // map extension to content type
  const contentTypeMap: { [key: string]: string } = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
  };
  console.log('Uploading image:', imageName, extension, contentTypeMap[extension]);

  const imageBuffer = await response.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(`${imagePrefix}-${imageName}`, new Blob([imageBuffer], { type: contentTypeMap[extension] }), {
      upsert: true,
    });

  if (uploadError) {
    console.error('Error uploading image:', uploadError);
    return undefined
  }
  return `${imagePrefix}-${imageName}`;
}


async function getFileSize(imageUrl: string): Promise<number> {
  const response = await fetch(imageUrl, { method: 'HEAD' });
  const contentLength = response.headers.get('content-length');
  const currentImageSize = contentLength ? parseInt(contentLength) : 0;
  return currentImageSize;
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

    const params = await req.json();
    console.dir(params);
    const imageUrl = params?.imageUrl;
    if (!imageUrl) {
      throw new Error("No imageUrl provided");
    }
    const currentImageRef = params?.currentImageRef;
    if (currentImageRef) {
      try {
        const currentImageSize = await getFileSize(imageUrl);
        console.log(`Current image size from REF: ${currentImageRef}}`);
        const existingImage = await supabaseClient.storage.from(params?.bucket || "event-images").info(currentImageRef);
        const existingImageSize = existingImage.data?.size || 0;
        console.log(`Existing image size: ${existingImageSize}, Current image size: ${currentImageSize}`);
        if (existingImageSize === currentImageSize) {
          console.log('Image already exists with same size, skipping upload.');
          return new Response(JSON.stringify({ imageRef: currentImageRef }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      } catch (error) {
        console.warn('Could not determine current image size:', error);
      }
    }
    const bucket = params?.bucket || "event-images";

    console.log(`Uploading image from ${imageUrl} to bucket ${bucket}`);

    const imageRef = await uploadRemoteImageToSupabase(supabaseClient, imageUrl, bucket);
    if (!imageRef) {
      throw new Error("Failed to upload image");
    }

    if (currentImageRef && currentImageRef !== imageRef) {
      console.log(`Deleting old image reference ${currentImageRef}`);
      const { error: deleteError } = await supabaseClient.storage.from(bucket).remove([currentImageRef]);
      if (deleteError) {
        console.error('Error deleting old image:', deleteError);
      } else {
        console.log('Old image deleted successfully.');
      }
    }

    return new Response(JSON.stringify({ imageRef }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
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
