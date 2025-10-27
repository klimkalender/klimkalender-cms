import winston from 'winston';
import { parse } from 'node-html-parser';
import axios from 'axios';
import { Bot } from '../Bot.ts';
import { CompData, Classification, EventCategory } from '../CompData.ts';
import { Hall } from '../Hall.ts';
import console from "node:console";
import { DateTime } from "luxon";

/**
 * Cmbel page configuration
 */
class CmbelPage {
    public type: string;
    public eventPageUrl: string;

    constructor(type: string, eventPageUrl: string) {
        this.type = type;
        this.eventPageUrl = eventPageUrl;
    }
}

/**
 * CmbelBot for scraping events from CMBEL (Belgian climbing federation)
 */
export class CmbelBot implements Bot {
    private pages: CmbelPage[];
    private logger: winston.Logger;
    private options: Record<string, any>;

    constructor(logger: winston.Logger, options: Record<string, any> = {}) {
        this.logger = logger;
        this.options = options;
        this.pages = [
            new CmbelPage('Regionaal', 'https://cmbel.shiftf5.be/competitions/cmbelregional'),
            new CmbelPage('Nationaal', 'https://cmbel.shiftf5.be/competitions/cmbel'),
            // other only link to the NL was
        ];
    }

    identifier(): string {
        return 'cmbel-was';
    }

    async run(): Promise<CompData[]> {
        const eventsFound: CompData[] = [];

        for (const page of this.pages) {
            const pageEvents = await this.processMainPage(page);
            eventsFound.push(...pageEvents);
        }

        return eventsFound;
    }

    private async processMainPage(page: CmbelPage): Promise<CompData[]> {
        const eventsFound: CompData[] = [];

        this.logger.info(`Scraping Cmbel Main page ${page.type}`);

        // Calculate this year
        const year = new Date().getFullYear();
        const eventsPageUrl = `${page.eventPageUrl}/year/${year}`;
        const thisYearEvents = await this.processEventsPage(page, eventsPageUrl);
        eventsFound.push(...thisYearEvents);

        // Calculate next year
        const nextYear = year + 1;
        const nextYearEventsPageUrl = `${page.eventPageUrl}/year/${nextYear}`;
        const nextYearEvents = await this.processEventsPage(page, nextYearEventsPageUrl);
        eventsFound.push(...nextYearEvents);

        return eventsFound;
    }

    private async processEventsPage(page: CmbelPage, eventsPageUrl: string): Promise<CompData[]> {
        const eventsFound: CompData[] = [];

        this.logger.info(`Scraping Cmbel ${page.type}|${eventsPageUrl}`);

        try {
            const response = await axios.get(eventsPageUrl);
            const root = parse(response.data);
            const urlInfo = new URL(eventsPageUrl);
            const baseUrl = `${urlInfo.protocol}//${urlInfo.host}`;

            const eventRows = root.querySelectorAll('#main table tbody tr');

            for (const eventRow of eventRows) {
                try {
                    const cells = eventRow.querySelectorAll('td');

                    if (cells.length < 4) continue;

                    const name = cells[0].text.trim();
                    const date = cells[1].text.trim();
                    const venueLocation = cells[2].text.trim();
                    const category = cells[3].text.toLowerCase().trim();

                    let venue = venueLocation;
                    let location = '';
                    if (venueLocation.includes(',')) {
                        const parts = venueLocation.split(',', 2);
                        venue = parts[0].trim();
                        location = parts[1].trim();
                    }

                    const eventData = new CompData();
                    eventData.eventName = name;

                    try {
                        const cleanDate = date.split(' ')[0]; // in case time is also given
                        eventData.eventDate = DateTime.fromFormat(cleanDate, 'dd-MM-yyyy', { zone: 'Europe/Amsterdam' }).toJSDate();
                        if (isNaN(eventData.eventDate.getTime())) {
                            throw new Error(`Invalid date ${cleanDate}`);
                        }
                    } catch (e: any) {
                        this.logger.info(`Date parsing error: ${e.message}`);
                        this.logger.error(`skipping event ${name} due to invalid date`);
                        continue;
                    }

                    this.logger.info(`Found event ${name} ${date} ${venue} ${location}`);

                    eventData.hall.name = venue;

                    if (category === 'boulder') {
                        eventData.eventCategory = EventCategory.BOULDER;
                    } else if (category === 'lead') {
                        eventData.eventCategory = EventCategory.LEAD;
                    } else {
                        eventData.eventCategory = EventCategory.OTHER;
                    }

                    const linkElement = cells[0].querySelector('a');
                    if (!linkElement) {
                        this.logger.error(`Failed to find href in ${cells[0].text}`);
                        continue;
                    }

                    const href = linkElement.getAttribute('href');
                    if (!href) {
                        this.logger.error('No href found in link element');
                        continue;
                    }

                    const eventUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
                    eventData.eventUrl = eventUrl;

                    // Look up unique id
                    const urlParts = eventUrl.split('/');
                    const id = urlParts[urlParts.length - 1];

                    eventData.uniqueRemoteId = `${this.identifier()}:${page.type.toLowerCase()}:${id}`;

                    await this.processEventPage(page.type, eventData);
                    eventsFound.push(eventData);
                } catch (error: any) {
                    this.logger.error(`Error processing event row: ${error.message}`);
                }
            };
        } catch (error: any) {
            this.logger.error(`Failed to fetch events from ${eventsPageUrl}: ${error.message}`);
        }

        return eventsFound;
    }

    private async processEventPage(type: string, eventData: CompData): Promise<void> {
        // Assume for now that CMBEL only contains competitions
        eventData.classification = Classification.COMPETITION;

        try {
            const response = await axios.get(eventData.eventUrl);
            const root = parse(response.data);

            const titleElement = root.querySelector('h3');
            if (titleElement) {
                const [title, date, location] = this.parseEventTitle(titleElement.text);
                eventData.eventName = title;
                eventData.eventDate = date;
                eventData.hall.name = location;
            }

            const fullDescription = root.querySelector('.content div div');
            if (fullDescription) {
                // Clean up full description
                const h3Elements = fullDescription.querySelectorAll('h3');
                h3Elements.forEach(h3 => h3.remove());
                fullDescription.removeAttribute('class');

                // Remove hr elements and all elements after hr (these are the competition results)
                const hrElements = fullDescription.querySelectorAll('hr');
                hrElements.forEach(hr => {
                    let nextSibling = hr.nextElementSibling;
                    while (nextSibling) {
                        const toRemove = nextSibling;
                        nextSibling = nextSibling.nextElementSibling;
                        toRemove.remove();
                    }
                    hr.remove();
                });

                eventData.fullDescriptionHtml = fullDescription.innerHTML || '';
            }

            // Check description if title is not conclusive
            if (eventData.eventCategory === EventCategory.OTHER) {
                if (/Discipline:\\s*Boulder/i.test(eventData.fullDescriptionHtml)) {
                    eventData.eventCategory = EventCategory.BOULDER;
                } else if (/Discipline:\\s*Lead/i.test(eventData.fullDescriptionHtml)) {
                    eventData.eventCategory = EventCategory.LEAD;
                }
            }

        } catch (error: any) {
            this.logger.error(`Error processing event page ${eventData.eventUrl}: ${error.message}`);
        }
    }

    // Belgian Lead Youth Cup 1 + OVJK , Sat, 20 Jan 2024 10:00:00 +0100, Klimax, Puurs
    // Balance New Year's Challenge 2024, 19/01 & 20/01 , 19-01-2024 00:00, Klimzaal Balance, Gent
    private parseEventTitle(wasTitle: string): [string, Date, string] {
        const res = wasTitle.split(',', 3);

        const title = res[0]?.trim() || '';
        let dateStr = res[1]?.trim() || '';

        // Multi-day events have an extra component
        if (dateStr.includes('&')) {
            dateStr = res[2]?.trim() || '';
        }

        const date = DateTime.fromFormat(dateStr.trim(), 'dd-MM-yyyy HH:mm', { zone: 'Europe/Amsterdam' }).toJSDate();
        const location = res[res.length - 1]?.trim() || '';

        return [title, date, location];
    }
}