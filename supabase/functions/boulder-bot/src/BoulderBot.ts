import winston from 'winston';
import * as path from "jsr:@std/path";
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

/**
 * Main BoulderBot orchestration class
 */
export class BoulderBot {
    private logger: winston.Logger;
    private mode: RunMode;
    private outputDir: string;
    private chatGPTSecret: string;
    private static readonly BOT_RUN_MAX_MINUTES = 5;

    constructor(mode: RunMode = RunMode.STANDALONE, chatGPTSecret?: string, outputDir?: string) {
        this.chatGPTSecret = chatGPTSecret || '';
        this.outputDir = outputDir || '../output';
        this.mode = mode;
        this.logger = this.createDefaultLogger(); // Will be replaced by setupLogger
    }

    /**
     * Get the version of the bot
     */
    version(): string {
        const tag = 'XX-VERSION-XX';
        if (!tag.includes('VERSION')) {
            return tag;
        }

        // In a real implementation, you might want to read from package.json
        // or use a git command to get the version
        return '1.0.0';
    }

    /**
     * Get lock file path
     */
    private lockFile(): string {
        return path.join(this.outputDir, 'boulderbot.lock');
    }

    /**
     * Create lock file to prevent multiple instances
     */
    private async createLockFile(): Promise<{ result: boolean; message: string }> {
        if (this.mode === RunMode.STANDALONE) {
            return {
                result: true,
                message: 'Running in standalone mode. skip lock file.'
            };
        }

        // setup lock file
        return ({ result: true, message: 'Lock file created (simulated).' });
    }

    /**
     * Release the lock file
     */
    private async releaseLockFile(): Promise<void> {
        // todo: remove lock file
    }

    /**
     * Create a default logger for initialization
     */
    private createDefaultLogger(): winston.Logger {
        return winston.createLogger({
            level: 'info',
            format: winston.format.simple(),
            transports: [new winston.transports.Console()]
        });
    }

    /**
     * Setup logger with proper configuration
     */
    private async setupLogger(skipRotate: boolean = false): Promise<void> {
        const logFormat = winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.printf(({ timestamp, level, message, stack }) => {
                return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
            })
        );

        const transports: winston.transport[] = [];

        transports.push(new winston.transports.Console({
            format: winston.format.combine(
                winston.format.simple(),
                logFormat
            )
        }));

        this.logger = winston.createLogger({
            level: 'info',
            transports
        });
    }


    /**
     * Main run method
     */
    async run(): Promise<void> {
        let lockCreated = false;

        try {
            const lockResult = await this.createLockFile();
            if (!lockResult.result) {
                await this.setupLogger(true);
                this.logger.error(lockResult.message);
                process.exit(1);
            }
            lockCreated = true;

            await this.setupLogger(false);
            this.logger.info(lockResult.message);
            this.logger.info(`Running BoulderBot!!! Version: ${this.version()}`);

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
            await this.exportToJson(events, this.outputDir);

        } catch (error: any) {
            this.logger.error(`BoulderBot error: ${error.message}`);
            throw error;
        } finally {
            if (lockCreated && this.mode === RunMode.EMBEDDED) {
                this.logger.info('Removing lock file');
                await this.releaseLockFile();
            }
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