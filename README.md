# Klimkalender CMS

## generating types

cd /workspace/klimkalender-cms && supabase gen types typescript --project-id  zrshjxlfodmuulctapbw  > ./src/database.types.ts

## import data

place events.json in /data/events.json and run 

```
cd /workspace/klimkalender-cms/scripts/import && ts-node import.ts