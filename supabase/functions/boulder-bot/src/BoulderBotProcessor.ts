import { SupabaseClient } from '@supabase/supabase-js';
import { Classification, CompData } from './CompData.ts';

export class BoulderBotProcessor {

  constructor(private readonly supabaseClient: SupabaseClient) {
    // Initialization code here
  }
  // Implementation of BoulderBotProcessor class
  async processResult(botResult?: CompData[]
  ) {
    let botResultData: CompData[] | undefined;
    console.log("Processing BoulderBot result...");
    if (!botResult) {
      const { data, error } = await this.supabaseClient.storage
        .from('boulderbot')
        .download('botresult.json');
      if (error) {
        console.error('Error downloading botresult.json:', error);
        return;
      }
       botResultData = JSON.parse(await data.text()) as CompData[];
    }else{
      botResultData = botResult;
    }
    console.log("BoulderBot result data:", botResultData);
    for(const comp of botResultData){
      console.log(`Updating competition ${comp.eventName} (${comp.uniqueRemoteId}) with ${comp.classification}`);
      console.dir(comp);
      const { data, error } = await this.supabaseClient
        .from('wasm_events')
        .upsert({...this.mapCompDataToWasEvent(comp), processed_at: new Date().toISOString()}, { onConflict: 'external_id' })
        .single();
      if (error) {
        console.error(`Error upserting competition ${comp.uniqueRemoteId}:`, error);
      } else {
        console.log(`Successfully upserted competition ${comp.eventName}.`);
      }

    }
    console.log("BoulderBot result processing completed."); 
  }

  mapCompDataToWasEvent(compData: CompData) {
    let classification: string = 'UNKNOWN';
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
      date: compData.eventDate,
      hall_name: compData.hall.name,
      short_description: compData.shortDescription,
      full_description_html: compData.fullDescriptionHtml,
      event_url: compData.eventUrl,
      image_url: compData.imageUrl,
      event_category: compData.eventCategory,
    };
  } 
}