import winston from 'winston';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { Bot } from '../Bot.ts';
import { CompData, Classification, EventCategory } from '../CompData.ts';
import { Hall } from '../Hall.ts';
import console from "node:console";
import { DateTime } from "luxon";

/**
 * WerckStof hall configuration
 */
class WerckStofHall {
    public name: string;
    public eventPageUrl: string;

    constructor(name: string, eventPageUrl: string) {
        this.name = name;
        this.eventPageUrl = eventPageUrl;
    }
}

/**
 * WerckStof bot for scraping events from WerckStof climbing halls
 */
export class WerckStofBot implements Bot {
    private halls: WerckStofHall[];
    private logger: winston.Logger;
    private options: Record<string, any>;

    constructor(logger: winston.Logger, options: Record<string, any> = {}) {
        this.logger = logger;
        this.options = options;
        this.halls = [
            new WerckStofHall('Kunststof', 'https://www.boulderhalkunststof.nl/'),
            new WerckStofHall('Krachtstof', 'https://www.boulderhalkrachtstof.nl/'),
            new WerckStofHall('Energiehaven', 'https://www.boulderhalenergiehaven.nl/'),
            new WerckStofHall('Zuidhaven', 'https://www.boulderhalzuidhaven.nl/'),
            new WerckStofHall('Radium', 'https://www.radiumboulders.nl/'),
            new WerckStofHall('Roest', 'https://www.boulderhalroest.nl/'),
            new WerckStofHall('Apex', 'https://www.apexboulders.nl/')
        ];
        logger.info('WerckStofBot initialized');
    }

    identifier(): string {
        return 'werckstof';
    }

    async run(): Promise<CompData[]> {
        const eventsFound: CompData[] = [];

        for (const hall of this.halls) {
            const hallEvents = await this.processHall(hall);
            eventsFound.push(...hallEvents);
        }

        return eventsFound;
    }

    private async processHall(hall: WerckStofHall): Promise<CompData[]> {
        const eventsFound: CompData[] = [];

        this.logger.info(`Scraping ${hall.name}`);

        try {
            const eventsPage = `${hall.eventPageUrl}events`;
            const response = await axios.get(eventsPage);
            const $ = cheerio.load(response.data);

            const eventDivs = $('.eventItemBox.future');

            eventDivs.each((_, eventDiv) => {
                try {
                    const eventData = new CompData();
                    const $eventDiv = $(eventDiv);

                    // Extract unique ID
                    const divId = $eventDiv.attr('id') || '';
                    const [, id] = divId.split('_');
                    if (id) {
                        eventData.uniqueRemoteId = `${this.identifier()}:${hall.name.toLowerCase()}:${id}`;
                    }

                    // Image URL
                    const imageDiv = $eventDiv.find('.eventLeftBox');
                    if (imageDiv.length) {
                        const style = imageDiv.attr('style') || '';
                        eventData.imageUrl = this.extractUrlFromStyle(style, hall);
                    } else {
                        this.logger.warn(`No image div found for event in hall ${hall.name}`);
                    }

                    // Event Name
                    const eventNameNode = $eventDiv.find('h2');
                    if (eventNameNode.length) {
                        eventData.eventName = eventNameNode.text().trim();
                    }

                    // Event Date
                    const dayText = $eventDiv.find('.eventdaynr').text();
                    const monthText = $eventDiv.find('.eventdateMonth').text();
                    eventData.eventDate = this.parseEventDateFromMiniContainer(dayText, monthText);

                    // Short Description
                    const shortDescriptionNode = $eventDiv.find('.cSubTitle');
                    if (shortDescriptionNode.length) {
                        eventData.shortDescription = shortDescriptionNode.text().trim();
                    }

                    // Full Description
                    const fullDescriptionNode = $eventDiv.find('.detailEventDescription');
                    if (fullDescriptionNode.length) {
                        eventData.fullDescriptionHtml = fullDescriptionNode.html()?.trim() || '';
                    }
                    // Event URL
                    eventData.eventUrl = `${hall.eventPageUrl}events`;

                    // Hall
                    eventData.hall = new Hall(hall.name);

                    // Check if it's likely a competition based on the event name and description
                    eventData.classification = this.classifyEvent(eventData);

                    // Add intro text if available
                    const introKey = 'bbot_intro_generic';
                    if (this.options[introKey]) {
                        eventData.fullDescriptionHtml = this.options[introKey] + eventData.fullDescriptionHtml;
                    }

                    eventsFound.push(eventData);

                    this.logger.info(`Found event: ${eventData.eventName} on ${eventData.eventDate.toISOString().split('T')[0]}`);
                } catch (error: any) {
                    this.logger.error(`Error processing event: ${error.message}`);
                }
            });
        } catch (error: any) {
            this.logger.error(`Failed to fetch events from ${hall.name}: ${error.message}`);
        }

        return eventsFound;
    }

    private extractUrlFromStyle(style: string, hall: WerckStofHall): string {
        const urlMatch = style.match(/url\(([^)]+)\)/);
        if (urlMatch && urlMatch[1]) {
            let url = urlMatch[1].replace(/['"]/g, '');
            if (!url.startsWith('http')) {
                url = `${hall.eventPageUrl}${url.replace(/^\//, '')}`;
            }
            return url;
        } else {
            this.logger.warn(`No URL found in style attribute for hall ${hall.name}: ${style}`);
        }
        return '';
    }

    private parseEventDateFromMiniContainer(dayText: string, monthText: string): Date {
        const currentYear = new Date().getFullYear();
        const day = parseInt(dayText, 10);

        // Convert Dutch month names to numbers
        const monthMap: Record<string, number> = {
            'jan': 0, 'feb': 1, 'mrt': 2, 'apr': 3, 'mei': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'dec': 11
        };

        const month = monthMap[monthText.toLowerCase().substring(0, 3)];

        if (month !== undefined && !isNaN(day)) {
            let eventDate = DateTime.local({ zone: "Europe/Amsterdam" }).set({ year: currentYear, month: month + 1, day, hour: 0, minute: 0, second: 0, millisecond: 0 });

            // If the date is in the past, assume it's next year
            if (eventDate < DateTime.now()) {
                eventDate = eventDate.plus({ years: 1 });
            }

            return eventDate.setZone('Europe/Amsterdam').toJSDate();
        }

        return new Date();
    }

    private classifyEvent(eventData: CompData): Classification {
        const eventName = eventData.eventName.toLowerCase();
        const description = (eventData.shortDescription + ' ' + eventData.fullDescriptionHtml).toLowerCase();

        // Check for obvious competitions
        if (
            eventName.includes('competitie') ||
            eventName.includes('wedstrijd') ||
            eventName.includes('cup') ||
            eventName.includes('championship') ||
            description.includes('competitie') ||
            description.includes('wedstrijd')
        ) {
            return Classification.COMPETITION;
        }

        // Check for obvious non-competitions
        if (
            eventName.includes('yoga') ||
            eventName.includes('workshop') ||
            eventName.includes('training') ||
            eventName.includes('cursus') ||
            description.includes('workshop') ||
            description.includes('training')
        ) {
            return Classification.NOCOMPETITION;
        }

        return Classification.UNKNOWN;
    }
}