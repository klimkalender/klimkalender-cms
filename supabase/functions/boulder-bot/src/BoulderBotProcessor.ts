import { SupabaseClient } from '@supabase/supabase-js';
import { Classification, CompData } from './CompData.ts';
import { WasmClassification, WasmEvent, WasmEventDataOnly } from './types.ts';

export class BoulderBotProcessor {

  constructor(private readonly supabaseClient: SupabaseClient) {
    // Initialization code here
  }
  // Implementation of BoulderBotProcessor class
  async processResult(botResult?: CompData[]
  ) {
    console.log("Processing BoulderBot result...");
    let botResultData = botResult || await this.loadBotResultFromStorage();
    console.log("BoulderBot result data events:", botResultData?.length);
    if (!botResultData) {
      console.error("No BoulderBot result data found.");
      return;
    }
    // load id's of existing (NON REMOVED) wasm_events to check for updates
    const { data: existingEvents } = await this.supabaseClient
      .from('wasm_events')
      .select('external_id')
      .neq('status', 'eq', 'REMOVED')

    const notFoundDatabaseExternalIds = new Set(existingEvents?.map((e: { external_id: string }) => e.external_id));

    // status is one of NEW, IGNORED, UP_TO_DATE, CHANGED, REMOVED, EVENT_PASSED
    for (const comp of botResultData) {
      console.log(`Processing competition ${comp.eventName} (${comp.uniqueRemoteId}) with ${comp.classification}`);
      notFoundDatabaseExternalIds.delete(comp.uniqueRemoteId);
      // find existing event by external_id and update or insert
      const { data, error } = await this.supabaseClient
        .from('wasm_events')
        .select()
        .eq('external_id', comp.uniqueRemoteId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        console.error(`Error fetching competition ${comp.uniqueRemoteId}:`, error);
        continue;
      }
      const eventIsAlreadyLinked = Boolean(data && data.event_id);

      let  updatedEvent = data as WasmEvent | null;
      const mappedEvent = this.mapCompDataToWasEvent(comp);
      if (this.doWasmEventsDiffer( data || {} as WasmEvent, { ...data as WasmEvent, ...mappedEvent } as WasmEvent)) {
        console.log(`Detected changes in competition ${comp.eventName} - updating`);
        // console.dir({ ...data as WasmEvent, ...mappedEvent });
        const { error: upsertError, data: updatedEventResult } = await this.supabaseClient
          .from('wasm_events')
          .upsert({ ...mappedEvent, processed_at: new Date().toISOString() }, { onConflict: 'external_id' })
          .select()
          .single();
        if (upsertError) {
          console.error(`Error upserting competition ${comp.uniqueRemoteId}:`, upsertError);
        } else {
          console.log(`Successfully upserted competition ${comp.eventName}.`);
          updatedEvent = updatedEventResult;
        }
      }else{
        console.log(`No changes detected for competition ${comp.eventName}. Not updating.`);
      }
      if (!updatedEvent) {
        console.error(`No updated event data for competition ${comp.uniqueRemoteId}, skipping further processing.`);
        continue;
      }

      // if event has status REMOVED in db but is present in bot result, set to 
      // NEW if not linked or UP_TO_DATE if linked (will be checked for changes below)
      if (updatedEvent && updatedEvent.status === 'REMOVED') {
        const newStatus = eventIsAlreadyLinked ? 'UP_TO_DATE' : 'NEW';
        const { error: statusError } = await this.supabaseClient
          .from('wasm_events')
          .update({ status: newStatus })
          .eq('external_id', comp.uniqueRemoteId);
        if (statusError) {
          console.error(`Error updating status for competition ${comp.uniqueRemoteId}:`, statusError);
        } else {
          console.log(`Status of REMOVED event updated to ${newStatus} for competition ${comp.eventName}.`);
        }
      }

      // set wasm_event status to EVENT_PASSED if the event date is in the past
      if (comp.eventDate < new Date() && updatedEvent.status !== 'EVENT_PASSED') {
        const { error: statusError } = await this.supabaseClient
          .from('wasm_events')
          .update({ status: 'EVENT_PASSED' })
          .eq('external_id', comp.uniqueRemoteId);
        if (statusError) {
          console.error(`Error updating status for competition ${comp.uniqueRemoteId}:`, statusError);
        } else {
          console.log(`Status updated to EVENT_PASSED for competition ${comp.eventName}.`);
        }
      }

      // if linked wasm_event is UP_TO_DATE or CHANGED - check if data has changed
      if (eventIsAlreadyLinked && ['UP_TO_DATE', 'CHANGED'].includes(data.status)) {
        const eventChanged = this.didEventChangeFromAccepted(updatedEvent);
        const newStatus = eventChanged ? 'CHANGED' : 'UP_TO_DATE';
        const { error: statusError } = await this.supabaseClient
          .from('wasm_events')
          .update({ status: newStatus })
          .eq('external_id', comp.uniqueRemoteId);
        if (statusError) {
          console.error(`Error updating status for competition ${comp.uniqueRemoteId}:`, statusError);
        } else {
          console.log(`Status updated to ${newStatus} for competition ${comp.eventName}.`);
          console.dir(updatedEvent);
        }
        updatedEvent.status = newStatus;
      }
      // auto-process events that have action AUTO_IMPORT
      if (updatedEvent.status === 'CHANGED' && updatedEvent.action === 'AUTO_IMPORT'
      ) {
        console.log(`Auto-importing changes for competition ${comp.eventName}.`);
        const { error: importError } = await this.supabaseClient
          .from('events')
          .eq('id', updatedEvent.event_id)
          .update({
            title: updatedEvent.name,
            start_date_time: new Date(updatedEvent.date),
            featuredText: updatedEvent.full_description_html,
            event_url: updatedEvent.event_url,
          });
        if (importError) {
          console.error(`Error auto-importing competition ${comp.uniqueRemoteId}:`, importError);
        } else {
          // update the imaged separately if needed
          if (updatedEvent.image_url && updatedEvent.image_url != updatedEvent.accepted_image_url) {
            const newImageRef = await this.uploadEventImage(updatedEvent.image_url);
            if (newImageRef) {
              const { error: imageUpdateError } = await this.supabaseClient
                .from('events')
                .eq('id', updatedEvent.event_id)
                .update({ featured_image_ref: newImageRef });
              if (imageUpdateError) {
                console.error(`Error updating image for competition ${comp.uniqueRemoteId}:`, imageUpdateError);
              } else {
                console.log(`Successfully updated image for competition ${comp.eventName}.`);
              }
            }
          }
          // set wasm_event status to UP_TO_DATE after import
          const { error: statusError } = await this.supabaseClient
            .from('wasm_events')
            .update({
              status: 'UP_TO_DATE',
              accepted_name: updatedEvent.name,
              accepted_classification: updatedEvent.classification,
              accepted_date: updatedEvent.date,
              accepted_hall_name: updatedEvent.hall_name,
              accepted_short_description: updatedEvent.short_description,
              accepted_full_description_html: updatedEvent.full_description_html,
              accepted_event_url: updatedEvent.event_url,
              accepted_image_url: updatedEvent.image_url,
              accepted_event_category: updatedEvent.event_category,
            })
            .eq('external_id', comp.uniqueRemoteId);
          if (statusError) {
            console.error(`Error updating status for competition ${comp.uniqueRemoteId}:`, statusError);
          } else {
            console.log(`Status updated to UP_TO_DATE for competition ${comp.eventName}.`);
          }
        }
      }
    }
    // mark events there were not found events as REMOVED
    if (notFoundDatabaseExternalIds.size > 0) {
      console.log(`Marking ${notFoundDatabaseExternalIds.size} competition(s) as REMOVED.`);
      const { error: statusError } = await this.supabaseClient
        .from('wasm_events')
        .update({ status: 'REMOVED' })
        .in('external_id', notFoundDatabaseExternalIds);
      if (statusError) {
        console.error(`Error updating status for competitions:`, statusError);
      } else {
        console.log(`Status updated to REMOVED for ${notFoundDatabaseExternalIds.size} competitions.`);
      }
    }
    console.log("BoulderBot result processing completed.");
  }

  mapCompDataToWasEvent(compData: CompData): WasmEventDataOnly {
    let classification: WasmClassification = 'UNKNOWN';
    let status: string | undefined = undefined;
    if (compData.eventDate < new Date()) {
      status = 'EVENT_PASSED';
    }
    switch (compData.classification) {
      case Classification.COMPETITION:
        classification = 'COMPETITION';
        break;
      case Classification.NOCOMPETITION:
        classification = 'NOCOMPETITION';
        break;
    }

    return {
      external_id: compData.uniqueRemoteId,
      name: compData.eventName,
      classification: classification,
      date: compData.eventDate.toISOString(),
      hall_name: compData.hall.name,
      short_description: compData.shortDescription,
      full_description_html: compData.fullDescriptionHtml,
      event_url: compData.eventUrl,
      image_url: compData.imageUrl,
      event_category: compData.eventCategory,
    };
  }

  doWasmEventsDiffer(eventA: WasmEvent, eventB: WasmEvent): boolean {
    if(eventA.name !== eventB.name){
      console.log(`Name changed: ${eventA.name} != ${eventB.name}`);
      return true;
    }
    if(  eventA.classification !== eventB.classification){
      console.log(`Classification changed: ${eventA.classification} != ${eventB.classification}`);
      return true;
    }
    // the string representation of date may differ even if the date is the same
    if( new Date(eventA.date).getTime() !== new Date(eventB.date).getTime()){
      console.log(`Date changed: ${eventA.date} != ${eventB.date}`);
      return true;
    }
    if(  eventA.hall_name !== eventB.hall_name){
      console.log(`Hall name changed: ${eventA.hall_name} != ${eventB.hall_name}`);
      return true;
    }
    if(  eventA.short_description !== eventB.short_description){
      console.log(`Short description changed.`);
      return true;
    }
    if(  eventA.full_description_html !== eventB.full_description_html){
      console.log(`Full description HTML changed.`);
      return true;
    }
    if(  eventA.event_url !== eventB.event_url){
      console.log(`Event URL changed: ${eventA.event_url} != ${eventB.event_url}`);
      return true;
    }
    if(  eventA.image_url !== eventB.image_url){
      console.log(`Image URL changed: ${eventA.image_url} != ${eventB.image_url}`);
      return true;
    }
    if(  eventA.event_category !== eventB.event_category){
      console.log(`Event category changed: ${eventA.event_category} != ${eventB.event_category}`); 
      return true;
    } 
   return false;
  }

  didEventChangeFromAccepted(event: WasmEvent): boolean {
    if(  event.name !== event.accepted_name){
      console.log(`Name changed: ${event.name} != ${event.accepted_name}`);
      return true;
    }
    if(  event.classification !== event.accepted_classification){
      console.log(`Classification changed: ${event.classification} != ${event.accepted_classification}`);
      return true;
    }
    if( new Date(event.date).getTime() !== new Date(event.accepted_date||'').getTime()){
      console.log(`Date changed: ${event.date} != ${event.accepted_date}`);
      return true;
    }
    if(  event.hall_name !== event.accepted_hall_name){
      console.log(`Hall name changed: ${event.hall_name} != ${event.accepted_hall_name}`);
      return true;
    }
    if(  event.short_description !== event.accepted_short_description){
      console.log(`Short description changed.`);
      return true;
    }
    if(  event.full_description_html !== event.accepted_full_description_html){
      console.log(`Full description HTML changed.`);
      return true;
    }
    if(  event.event_url !== event.accepted_event_url){
      console.log(`Event URL changed: ${event.event_url} != ${event.accepted_event_url}`);
      return true;
    }
    if(  event.image_url !== event.accepted_image_url){
      console.log(`Image URL changed: ${event.image_url} != ${event.accepted_image_url}`);
      return true;
    }
    if(  event.event_category !== event.accepted_event_category){
      console.log(`Event category changed: ${event.event_category} != ${event.accepted_event_category}`); 
      return true;
    }
    return false;
  }

  loadBotResultFromStorage = async (): Promise<CompData[] | null> => {
    const { data, error } = await this.supabaseClient.storage
      .from('boulderbot')
      .download('botresult.json');
    if (error) {
      console.error('Error downloading botresult.json:', error);
      return null;
    }
    const botResultData = (JSON.parse(await data.text()) as CompData[]).map(comp => {
      // Convert date strings to Date objects
      return {
        ...comp,
        eventDate: new Date(comp.eventDate),
      };
    });
    return botResultData;
  }

  // copy from cms, this re-used the image-grabber edge function
  async uploadEventImage(imageUrl: string, currentImageRef?: string): Promise<string | null> {
    const session = await this.supabaseClient.auth.getSession()
    const accessToken = session.data.session?.access_token;

    const response = await fetch('https://zrshjxlfodmuulctapbw.supabase.co/functions/v1/image-grabber', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl, currentImageRef }),
    })

    if (response.ok) {
      const respJson = await response.json()
      return respJson.imageRef;
    }
    console.error('Image upload error:', response);
    return null;
  }
}

