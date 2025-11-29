import winston from 'winston';
import { parse } from 'node-html-parser';
import axios from 'axios';
import { Bot } from '../Bot.ts';
import { CompData, Classification, EventCategory } from '../CompData.ts';
import { Hall } from '../Hall.ts';
import { ChatGPTService } from '../ChatGPTService.ts';
import { DateTime } from 'luxon';
import console from "node:console";

/**
 * WAS page configuration
 */
class WasPage {
    public type: string;
    public eventPageUrl: string;
    public categoryId: string;

    constructor(type: string, eventPageUrl: string, categoryId: string) {
        this.type = type;
        this.eventPageUrl = eventPageUrl;
        this.categoryId = categoryId;
    }
}

/**
 * WasBot for scraping events from WAS (Nederlandse Klim- en Bergsportvereniging)
 */
export class WasBot implements Bot {
    private pages: WasPage[];
    private logger: winston.Logger;
    private chatGPT: ChatGPTService;
    private options: Record<string, any>;

    constructor(logger: winston.Logger, chatGPT: ChatGPTService, options: Record<string, any> = {}) {
        this.logger = logger;
        this.options = options;
        this.chatGPT = chatGPT;
        this.pages = [
            new WasPage('Series', 'https://was.nkbv.nl/inschrijven/series', 'c_1'),
            new WasPage('Nationaal', 'https://was.nkbv.nl/inschrijven/nationaal', 'c_0'),
            new WasPage('Other', 'https://was.nkbv.nl/inschrijven/overige', 'c_4'),
        ];
    }

    identifier(): string {
        return 'nkbv-was';
    }

    async run(): Promise<CompData[]> {
        const eventsFound: CompData[] = [];

        for (const page of this.pages) {
            const pageEvents = await this.processEventsPage(page);
            eventsFound.push(...pageEvents);
        }

        return eventsFound;
    }

    private async processEventsPage(page: WasPage): Promise<CompData[]> {
        const eventsFound: CompData[] = [];

        this.logger.info(`=> Scraping WAS ${page.type}`);

        try {
            const response = await axios.get(page.eventPageUrl);
            const root = parse(response.data);
            const urlInfo = new URL(page.eventPageUrl);
            const baseUrl = `${urlInfo.protocol}//${urlInfo.host}`;

            // Find event containers (this is a simplified version)
            const eventDivs = root.querySelectorAll(`.uitslagen-wrapper .${page.categoryId}`);
            for (const eventDiv of eventDivs) {
                try {
                    const eventData = new CompData();

                    // Extract event name
                    const nameElement = eventDiv.querySelector('.naam');
                    if (nameElement) {
                        eventData.eventName = nameElement.text.trim();
                    }

                    // Extract date
                    const dateElement = eventDiv.querySelector('.date, .event-date, .datum');
                    if (dateElement) {
                        const dateText = dateElement.text.trim();
                        try {
                            eventData.eventDate = DateTime.fromFormat(dateText, 'dd-MM-yyyy', { zone: 'Europe/Amsterdam' }).toJSDate();
                            if (isNaN(eventData.eventDate.getTime())) {
                                throw new Error('Invalid date');
                            }
                        } catch (e) {
                            this.logger.warn(`Could not parse date: ${dateText}`);
                            eventData.eventDate = new Date();
                        }
                    }

                    // Extract venue/hall
                    const venueElement = eventDiv.querySelector('.plaats');
                    if (venueElement) {
                        eventData.hall.name = venueElement.text.trim();
                        if (eventData.hall.name.includes(',')) {
                            const parts = eventData.hall.name.split(',', 2);
                            eventData.hall.name = parts[0].trim();
                        }
                    }

                    // Extract event URL
                    const linkElement = eventDiv.querySelector('a');
                    if (linkElement) {
                        const href = linkElement.getAttribute('href');
                        if (href) {
                            eventData.eventUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
                        }
                    }

                    // Generate unique ID
                    const urlParts = eventData.eventUrl.split('/');
                    const id = urlParts[urlParts.length - 1] || Math.random().toString(36).substr(2, 9);
                    eventData.uniqueRemoteId = `${this.identifier()}:${page.type.toLowerCase()}:${id}`;

                    // Set classification as competition (WAS typically contains competitions)
                    eventData.classification = Classification.COMPETITION;

                    // Determine event category
                    const eventText = (eventData.eventName + ' ' + eventDiv.text).toLowerCase();
                    if (eventText.includes('boulder')) {
                        eventData.eventCategory = EventCategory.BOULDER;
                    } else if (eventText.includes('lead') || eventText.includes('voorklim')) {
                        eventData.eventCategory = EventCategory.LEAD;
                    } else {
                        eventData.eventCategory = EventCategory.OTHER;
                    }
                    const $lowerTitle = eventData.eventName.toLowerCase();
                    if ($lowerTitle.includes('serie')) {
                        if ($lowerTitle.includes('boulder')) {
                            eventData.eventCategory = EventCategory.BOULDER;
                            if ($lowerTitle.includes('jeugd')) {
                                eventData.imageUrl = 'https://www.klimkalender.nl/wp-content/uploads/2024/10/WASBOT-NKBV-Boulder-series-jeugd.png';
                            } else {
                                const intro_key = 'bbot_wasbot_intro_series_boulder_adult';
                                eventData.imageUrl = 'https://www.klimkalender.nl/wp-content/uploads/2024/10/WASBOT-NKBV-Boulder-series-volwassenen.png';
                            }
                        }

                        if ($lowerTitle.includes('lead')) {
                            eventData.eventCategory = EventCategory.LEAD;
                            if ($lowerTitle.includes('jeugd')) {
                                eventData.imageUrl = 'https://www.klimkalender.nl/wp-content/uploads/2024/10/WASBOT-NKBV-Lead-series-jeugd.jpg';
                            } else {
                                eventData.imageUrl = 'https://www.klimkalender.nl/wp-content/uploads/2024/10/WASBOT-NKBV-Lead-series-volwassenen.jpg';
                            }
                        }
                    }
                    await this.processEventPage(eventData);

                    this.logger.info(`Found WAS event: ${eventData.eventName}`);
                    eventsFound.push(eventData);
                } catch (error: any) {
                    this.logger.error(`Error processing WAS event: ${error.message}`);
                }
            };
        } catch (error: any) {
            this.logger.error(`Failed to fetch events from ${page.eventPageUrl}: ${error.message}`);
        }

        return eventsFound;
    }

    private async processEventPage(eventData: CompData): Promise<void> {
        try {
            if (!eventData.eventUrl) {
                this.logger.warn(`No event URL for event: ${eventData.eventName}`);
                return;
            }

            const response = await axios.get(eventData.eventUrl);
            const root = parse(response.data);

            // Extract image URL if available
            const descriptionElement = root.querySelector('.w-layout-blockcontainer');
            if (descriptionElement) {
                eventData.fullDescriptionHtml = descriptionElement.innerHTML || '';
            }
        } catch (error: any) {
            this.logger.error(`Failed to process event page ${eventData.eventUrl}: ${error.message}`);
        }
    }
}
