import { SupabaseClient } from "@supabase/supabase-js";
import { CalendarEvent } from "./types.ts";
import { GitService } from "./git.ts";

const IMAGE_URL_PATH_PREFIX = "/images/uploads";
const IMAGE_DIRECTORY_IN_REPO = "/public" + IMAGE_URL_PATH_PREFIX;
const EVENTS_JSON_PATH_IN_REPO = "/public/events.json";

export async function generateExport(supabase: SupabaseClient) {
  function getPublicImageUrl(ref: string, bucket: string): string | null {
    const { data } = supabase.storage.from(bucket).getPublicUrl(ref);
    return data?.publicUrl || null;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  let { data: eventResp, error } = await supabase
    .from("events")
    .select(`
        id,
        title,
        start_date_time,
        end_date_time,
        external_id,
        featured,
        featured_image_ref,
        featured_text,
        is_full_day,
        link,
        organizer_id,
        remarks,
        status,
        time_zone,
        venue_id,
        created_at,
        updated_at,
        venue: venues (id, name, image_ref, full_address),
        organizer: organizers (id, name, image_ref),
        tags: event_tags (tag_id, tags!inner (name) )
      `)
    .eq("status", "PUBLISHED")
    .gte("start_date_time", yesterday.toISOString())
    .order("start_date_time", { ascending: true });

  // console.dir(eventResp, { depth: null });

  if (!eventResp) {
    console.error("No events found or error fetching events:", error);
    return [];
  }

  // any types because of this issue https://github.com/supabase/supabase-js/issues/1375
  const exportedEvents: CalendarEvent[] = [];
  for (const event of eventResp) {
    const organizerName = (event.organizer as any)?.name;
    const extraTag = organizerName || undefined;
    const tags = event.tags.map((t) => (t.tags as any).name);
    if (extraTag && !tags.includes(extraTag)) {
      tags.push(extraTag);
    }
    let featuredImageUrl: string | null = null;
    if (event.featured && event.featured_image_ref) {
      featuredImageUrl = getPublicImageUrl(
        event.featured_image_ref,
        "event-images",
      );
    }
    // use organizer image as venue image if organizer is available
    let venueImageUrl: string | null = null;
    if ((event.organizer as any)?.image_ref) {
      venueImageUrl = getPublicImageUrl(
        (event.organizer as any).image_ref,
        "organizer-images",
      );
    }
    if (!venueImageUrl && (event.venue as any)?.image_ref) {
      venueImageUrl = getPublicImageUrl(
        (event.venue as any).image_ref,
        "venue-images",
      );
    }
    const featured = event.featured || false;

    exportedEvents.push({
      id: event.external_id || event.id,
      title: event.title,
      date: event.start_date_time,
      startTimeUtc: event.start_date_time,
      endTimeUtc: event.end_date_time,
      timezone: event.time_zone,
      venueName: (event.venue as any).name,
      venueImage: venueImageUrl || "",
      venueAddress: (event.venue as any).full_address,
      link: event.link,
      tags,
      featured: featured,
      featuredImage: featured ? (featuredImageUrl || undefined) : undefined,
      featuredText: featured ? event.featured_text : undefined,
    });
  }
  // console.dir(exportedEvents, { depth: null });

  if (error) {
    console.error("Error exporting event:", error);
  }
  return exportedEvents;
}

export async function executeExport(
  userEmail: string,
  supabase: SupabaseClient,
  gitService: GitService,
  baseDirectory: string = "klimkalender-new",
): Promise<
  {
    result: "OK" | "ERROR" | "NO_CHANGES";
    filesPublished: string[];
    filesDeleted: string[];
  }
> {
  const exportedEvents = await generateExport(supabase);
  console.log(`Generated export with ${exportedEvents.length} events`);

  // extract filenames of all images
  const imageUrls: string[] = [];
  for (const event of exportedEvents) {
    // console.log(`Event: ${event.title}`);
    if (event.featuredImage) {
      imageUrls.push(event.featuredImage);
    }
    if (event.venueImage) {
      imageUrls.push(event.venueImage);
    }
  }
  // extract the image-names from the urls
  // and make a hashmap with the key as the image name and value as the full url
  const imageMap: { [key: string]: string } = {};
  for (const url of imageUrls) {
    const parts = url.split("/");
    const imageName = parts[parts.length - 1];
    imageMap[imageName] = url;
  }
  // new list all images in the repo under src/images
  console.log(
    "Listing images in repo directory:",
    baseDirectory + IMAGE_DIRECTORY_IN_REPO,
  );
  const repoImages = await gitService.listFilesInDirectory(
    baseDirectory + IMAGE_DIRECTORY_IN_REPO,
  );

  if (!Array.isArray(repoImages)) {
    console.error("Repo images is not an array:", repoImages);
    throw new Error("Repo images is not an array");
  }
  console.log(`Found ${repoImages.length} images in repo`);

  // extract the image-names from repo images
  // and create a hashmap with key as image name and value as the full path in repo
  const repoImageMap: { [key: string]: string } = {};
  for (const repoImage of repoImages) {
    if (
      "type" in repoImage && repoImage.type === "file" && repoImage.name &&
      !repoImage.name.startsWith(".")
    ) {
      const imageName = repoImage.name;
      repoImageMap[imageName] = repoImage.path;
    }
  }
  // console.log("Repo images:", repoImageMap);

  const filesToPublish: {
    path: string;
    content: string | Uint8Array | null;
  }[] = [];
  const filesToDelete: {
    path: string;
    content: string | Uint8Array | null;
  }[] = [];

  // find which images from imageMap are not in repoImageMap
  for (const imageName in imageMap) {
    if (!(imageName in repoImageMap)) {
      const imageUrl = imageMap[imageName];
      console.log(`Image ${imageName} not in repo, fetching from ${imageUrl}`);
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const imageContent = new Uint8Array(arrayBuffer);
      filesToPublish.push({
        path: `${baseDirectory}${IMAGE_DIRECTORY_IN_REPO}/${imageName}`,
        content: imageContent,
      });
    }
  }
  console.log("Images to publish:", filesToPublish.length);
  // find which images from repoImageMap are not in imageMap
  for (const imageName in repoImageMap) {
    if (!(imageName in imageMap)) {
      const imagePath = repoImageMap[imageName];
      console.log(`Image ${imageName} not used anymore, deleting from repo`);
      filesToDelete.push({
        path: imagePath,
        content: null,
      });
    }
  }
  console.log("Total images to delete:", filesToDelete.length);
  // rewrite the events.json file to use local image paths
  const eventsWithLocalImages = exportedEvents.map((event) => {
    let featuredImagePath: string | undefined = undefined;
    if (event.featuredImage) {
      const parts = event.featuredImage.split("/");
      const imageName = parts[parts.length - 1];
      featuredImagePath = `${IMAGE_URL_PATH_PREFIX}/${imageName}`;
    }
    let venueImagePath: string | undefined = undefined;
    if (event.venueImage) {
      const parts = event.venueImage.split("/");
      const imageName = parts[parts.length - 1];
      venueImagePath = `${IMAGE_URL_PATH_PREFIX}/${imageName}`;
    }
    return {
      ...event,
      featuredImage: featuredImagePath,
      venueImage: venueImagePath,
    };
  });
  const eventsJsonContent = JSON.stringify(eventsWithLocalImages, null, 2);
  filesToPublish.push({
    path: baseDirectory + EVENTS_JSON_PATH_IN_REPO,
    content: eventsJsonContent,
  });

  // now sync the images to the repo
  await gitService.commitFilesToBranch(
    "Klimkalender export by " + userEmail,
    [...filesToPublish, ...filesToDelete],
  );

  return {
    result: "OK",
    filesPublished: filesToPublish.map((f) => f.path),
    filesDeleted: filesToDelete.map((f) => f.path),
  };
}
