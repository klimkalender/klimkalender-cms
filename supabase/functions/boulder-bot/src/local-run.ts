// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { BoulderBot, BoulderBotHookBase } from './BoulderBot.ts';
import { CompData } from "./CompData.ts";


console.log(`Function "boulderbot" up and running!`);

class LocalBoulderBotHook extends BoulderBotHookBase {
    async storeResult(data: CompData[]): Promise<void> {
        const jsonString = JSON.stringify(data, null, 2);
        await Deno.writeTextFile('./botresult.json', jsonString);
        return Promise.resolve();
    }
}


async function main() {
    const apiKey = process.env.CHATGPT_API_KEY;
    if (!apiKey) {
        console.error('CHATGPT_API_KEY environment variable is required');
        throw new Error('CHATGPT_API_KEY environment variable is required');
    }

    // just an
    const hooks = new LocalBoulderBotHook();

    // Create and run the bot
    const runner = new BoulderBot(apiKey, hooks);
    await runner.run();
}

main().catch((error) => {
    console.error('Error running BoulderBot:', error);
    Deno.exit(1);
});

