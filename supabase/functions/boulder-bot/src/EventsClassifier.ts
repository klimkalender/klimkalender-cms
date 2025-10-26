import winston from 'winston';
import { CompData, Classification } from './CompData.ts';
import { ChatGPTService } from './ChatGPTService.ts';

/**
 * Events classifier to determine if events are likely competitions
 */
export class EventsClassifier {
    private events: CompData[];
    private chatGPTService: ChatGPTService;
    private logger: winston.Logger;

    constructor(logger: winston.Logger, events: CompData[], chatGPTService: ChatGPTService) {
        this.logger = logger;
        this.events = events;
        this.chatGPTService = chatGPTService;
    }

    /**
     * Classify events by applying heuristics to check if the event is a competition.
     * This method modifies the classification of events based on heuristics.
     * @returns The classified events array
     */
    async classifyEvents(): Promise<CompData[]> {
        for (const event of this.events) {
            // skip if already classified
            if (event.classification !== Classification.UNKNOWN) {
                continue;
            }

            const eventName = event.eventName.toLowerCase();

            // By the name we can rule many things out
            if (
                eventName.includes('yoga') ||
                eventName.includes('workshop') ||
                eventName.includes('spelletjes') ||
                eventName.includes('open stage') ||
                eventName.includes('proefles')
            ) {
                event.classification = Classification.NOCOMPETITION;
            } else {
                // Ask the opinion of ChatGPT
                this.logger.info(`Asking ChatGPT opinion if ${event.eventName} is a competition...`);

                try {
                    const isCompetition = await this.chatGPTService.competitionChecker(event);
                    event.classification = isCompetition
                        ? Classification.COMPETITION
                        : Classification.NOCOMPETITION;
                } catch (error: any) {
                    this.logger.error(`Error checking competition status for ${event.eventName}: ${error.message}`);
                    // Leave as UNKNOWN on error
                }
            }
        }

        return this.events;
    }
}