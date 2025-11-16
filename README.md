# Klimkalender CMS

## generating types

cd /workspace/klimkalender-cms && supabase gen types typescript --project-id  zrshjxlfodmuulctapbw  > ./src/database.types.ts
cd /workspace/klimkalender-cms && supabase gen types typescript --project-id  zrshjxlfodmuulctapbw  > ../supabase/functions/boulder-bot/src/database.types.ts

## import data

place events.json in /data/events.json and run 

```
cd /workspace/klimkalender-cms/scripts/import && ts-node import.ts

## Delpoy edge function

```
supabase functions deploy kk-publisher --project-ref zrshjxlfodmuulctapbw 


supabase functions deploy boulder-bot --project-ref zrshjxlfodmuulctapbw

supabase functions deploy image-grabber --project-ref zrshjxlfodmuulctapbw