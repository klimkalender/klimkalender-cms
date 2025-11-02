import winston from 'winston';
import Transport from 'winston-transport';
import { EventsClassifier } from './EventsClassifier.ts';
import { ChatGPTService } from './ChatGPTService.ts';
import { CompData, Classification } from './CompData.ts';
import { WerckStofBot } from './bots/WerckStofBot.ts';
import { WasBot } from './bots/WasBot.ts';
import { GripBot } from './bots/GripBot.ts';
import { CmbelBot } from './bots/CmbelBot.ts';

/**
 * Run mode enum
 */
export enum RunMode {
    STANDALONE = 'STANDALONE',
    EMBEDDED = 'EMBEDDED'
}

export class BoulderBotHookBase implements BoulderBotHook {
    async onBeforeRun(): Promise<void> {
        // no-op
    }
    async onLog(message: string, level: string): Promise<void> {
        // no-op
    }
    async onAfterRun(success: boolean, details?: string): Promise<void> {
        // no-op
    }
    async storeResult(data: CompData[]): Promise<void> {
        // no-op
    }    
}

export interface BoulderBotHook {
    onBeforeRun: () => Promise<void>;
    // onLog is used by BoulderBotLogger winston transport
    onLog: (message: string, level: string) => Promise<void>;
    storeResult(data: CompData[]): Promise<void>;
    onAfterRun: (success: boolean, details?: string) => Promise<void>;
}

class BoulderBotLogger extends Transport {
  private boulderBotHook: BoulderBotHook;
  constructor(opts) {
    const {boulderBotHook, ...rest} = opts || {};
    super(rest);
    this.boulderBotHook = boulderBotHook;
    if(!this.boulderBotHook) {
        throw new Error('BoulderBotHook is required for SupabaseBufferLogger');
    }
  }

  log(info, callback) {
    this.boulderBotHook.onLog(info.message, info.level);
    callback();
  }
};

/**
 * Main BoulderBot orchestration class
 */
export class BoulderBot {
    private logger: winston.Logger;
    private chatGPTSecret: string;
    private boulderBotHook: BoulderBotHook;
    private static readonly BOT_RUN_MAX_MINUTES = 5;

    constructor(chatGPTSecret?: string, boulderBotHook: BoulderBotHook = new BoulderBotHookBase()) {
        this.chatGPTSecret = chatGPTSecret || '';
        this.boulderBotHook = boulderBotHook;
        this.logger = this.createDefaultLogger(); 
    }

    /**
     * Create a default logger for initialization
     */
    private createDefaultLogger(): winston.Logger {
        console.dir(this.boulderBotHook);
        const transport = new BoulderBotLogger({boulderBotHook: this.boulderBotHook});
        return winston.createLogger({
            level: 'info',
            format: winston.format.simple(),
            transports: [new winston.transports.Console(), transport],
        });
    }


    /**
     * Main run method
     */
    async run(): Promise<void> {
        try {
            await this.boulderBotHook.onBeforeRun();
            this.logger.info(`Running BoulderBot!!!`);

            // Create ChatGPT service
            const chatGPTService = new ChatGPTService(this.logger, this.chatGPTSecret);

            // Run all bots
            let events: CompData[] = [];

            // WerckStof Bot
            const werckstofBot = new WerckStofBot(this.logger);
            const werckstofEvents = await werckstofBot.run();
            events.push(...werckstofEvents);

            // WAS Bot
            const wasBot = new WasBot(this.logger, chatGPTService);
            const wasEvents = await wasBot.run();
            events.push(...wasEvents);

            // Grip Bot
            const gripBot = new GripBot(this.logger, chatGPTService);
            const gripEvents = await gripBot.run();
            events.push(...gripEvents);

            // CMBEL Bot
            const cmbelBot = new CmbelBot(this.logger);
            const cmbelEvents = await cmbelBot.run();
            events.push(...cmbelEvents);

            // Classify events
            const eventsClassifier = new EventsClassifier(this.logger, events, chatGPTService);
            events = await eventsClassifier.classifyEvents();

            // Export results
            await this.boulderBotHook.storeResult(events);

            this.logger.info(`BoulderBot run completed, found ${events.length} events.`);

        } catch (error: any) {
            this.logger.error(`BoulderBot error: ${error.message}`);
            throw error;
        } finally {
            await this.boulderBotHook.onAfterRun(true, 'Completed');
            this.logger.info('Boulderbot is done 🧗');
        }
    }

    /**
     * Export events to JSON
     */
    private async exportToJson(events: CompData[], outputDir: string): Promise<void> {
        // empty fullDescriptionHtml for export,we only need it for chatgpt processing
        // const cleanData = events.map(event => {
        //     event.fullDescriptionHtml = '';
        //     return event;
        // });
        const data = JSON.stringify(events, null, 2);
        // TODO store file
        console.log(`Exported ${events.length} events to JSON (simulated) ${data.length} bytes.`);
    }

}