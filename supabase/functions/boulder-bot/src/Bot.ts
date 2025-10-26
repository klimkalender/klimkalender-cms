import { CompData } from './CompData.ts';

/**
 * Bot interface for web scraping bots
 * This is the base interface that all bot implementations must follow
 */
export interface Bot {
    /**
     * Run the bot and return the results.
     * @returns Promise<CompData[]> Array of CompData objects
     */
    run(): Promise<CompData[]>;

    /**
     * Identifier that will help to trace the source of a competition
     * @returns Unique identifier for this bot
     */
    identifier(): string;
}