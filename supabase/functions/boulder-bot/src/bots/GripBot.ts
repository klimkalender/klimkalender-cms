import winston from 'winston';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { Bot } from '../Bot.ts';
import { CompData, Classification } from '../CompData.ts';
import { Hall } from '../Hall.ts';
import { ChatGPTService } from '../ChatGPTService.ts';
import console from "node:console";

/**
 * GripBot for scraping events from Grip Nijmegen climbing hall
 */
export class GripBot implements Bot {
    private gripHall: Hall;
    private eventsUrl: string;
    private chatGPT: ChatGPTService;
    private logger: winston.Logger;
    private options: Record<string, any>;

    constructor(logger: winston.Logger, chatGPT: ChatGPTService, options: Record<string, any> = {}) {
        this.gripHall = new Hall('Grip');
        this.eventsUrl = 'https://gripnijmegen.nl/boulderhal/actueel/events/';
        this.chatGPT = chatGPT;
        this.logger = logger;
        this.options = options;
    }

    identifier(): string {
        return 'grip';
    }

    async run(): Promise<CompData[]> {
        const eventsFound: CompData[] = [];

        try {
            const response = await axios.get(this.eventsUrl);
            const $ = cheerio.load(response.data);

            // Find all <a> tags containing the divs with the class "news card"
            const eventLinks: string[] = [];
            $('.news').each((_, news) => {
                const $link = $(news);
                const href = $link.find('a').attr('href');
                if (href) {
                    eventLinks.push(href);
                }
            });

            // Process each event page
            for (const url of eventLinks) {
                try {
                    const eventData = await this.processEventPage(url);
                    eventsFound.push(eventData);
                } catch (error: any) {
                    this.logger.error(`Error processing event page ${url}: ${error.message}`);
                }
            }
        } catch (error: any) {
            this.logger.error(`Failed to fetch events from ${this.eventsUrl}: ${error.message}`);
        }

        return eventsFound;
    }

    private async processEventPage(url: string): Promise<CompData> {
        const compData = new CompData();
        compData.eventUrl = url;
        compData.hall = this.gripHall;

        // Assume slug of event is unique id
        const urlParts = url.replace(/\/$/, '').split('/');
        const id = urlParts[urlParts.length - 1];
        compData.uniqueRemoteId = `${this.identifier()}:${id}`;

        try {
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);

            // Find the h1 tag for the title
            const titleElement = $('h1').first();
            if (titleElement.length) {
                compData.eventName = titleElement.text().trim();
            }

            // Extract content for description (simplified version)
            const contentElement = $('.content, .description, .entry-content').first();
            if (contentElement.length) {
                compData.fullDescriptionHtml = contentElement.html() || '';
            }

            // Find background image URL
            const pageHeaderDiv = $('.page-header').first();
            if (pageHeaderDiv.length) {
                const style = pageHeaderDiv.attr('style') || '';
                const urlMatch = style.match(/url\\(['"]?([^'")]+)['"]?\\)/);
                if (urlMatch && urlMatch[1]) {
                    compData.imageUrl = urlMatch[1];
                }
            }

            // Try to extract date using ChatGPT
            if (this.chatGPT && compData.fullDescriptionHtml) {
                try {
                    const extractedDate = await this.chatGPT.dateFinder(compData.fullDescriptionHtml);
                    if (extractedDate) {
                        compData.eventDate = extractedDate;
                    }
                } catch (error: any) {
                    this.logger.error(`ChatGPT date extraction failed: ${error.message}`);
                }
            }

            // Add intro text if available
            const introKey = 'bbot_intro_generic';
            if (this.options[introKey]) {
                compData.fullDescriptionHtml = this.options[introKey] + compData.fullDescriptionHtml;
            }

            this.logger.info(`Processed event: ${compData.eventName}`);
        } catch (error: any) {
            this.logger.error(`Error fetching event page ${url}: ${error.message}`);
        }

        return compData;
    }

    private extractUrlFromStyle(style: string): string {
        const urlMatch = style.match(/url\(([^)]+)\)/);
        if (urlMatch && urlMatch[1]) {
            const url = urlMatch[1].replace(/['"]/g, '');
            return url;
        } else {
            this.logger.warn(`No URL found in style attribute for hall ${style}`);
        }
        return '';
    }

}