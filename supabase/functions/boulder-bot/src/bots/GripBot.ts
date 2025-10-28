import winston from 'winston';
import { parse } from 'node-html-parser';
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

    // axios is timing out on Grip when done from supabase... fetch does work???
    async fetchUrlToText(url: string): Promise<string> {
        const resp = await fetch("https://gripnijmegen.nl/boulderhal/actueel/events/", {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en-GB;q=0.9,en;q=0.8,nl;q=0.7",
                "cache-control": "no-cache",
                "pragma": "no-cache",
                "priority": "u=0, i",
                "sec-ch-ua": "\"Google Chrome\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "none",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1"
            },
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include",
            signal: AbortSignal.timeout(1000)
        });
        return await resp.text();
    }

    async run(): Promise<CompData[]> {
        const eventsFound: CompData[] = [];

        try {
            this.logger.info(`Fetching events from ${this.eventsUrl}`);

            const root = parse(await this.fetchUrlToText(this.eventsUrl));
            this.logger.info(`Fetched events page successfully`);

            // Find all <a> tags containing the divs with the class "news card"
            const eventLinks: string[] = [];
            const newsElements = root.querySelectorAll('.news');
            for (const news of newsElements) {
                const linkElement = news.querySelector('a');
                const href = linkElement?.getAttribute('href');
                if (href) {
                    eventLinks.push(href);
                }
            }

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
        this.logger.info(`Processing event page: ${url}`);

        // Assume slug of event is unique id
        const urlParts = url.replace(/\/$/, '').split('/');
        const id = urlParts[urlParts.length - 1];
        compData.uniqueRemoteId = `${this.identifier()}:${id}`;

        try {
            const root = parse(await this.fetchUrlToText(url));

            // Find the h1 tag for the title
            const titleElement = root.querySelector('h1');
            if (titleElement) {
                compData.eventName = titleElement.text.trim();
            }

            // Extract content for description (simplified version)
            const contentElement = root.querySelector('.content, .description, .entry-content');
            if (contentElement) {
                compData.fullDescriptionHtml = contentElement.innerHTML || '';
            }

            // Find background image URL
            const pageHeaderDiv = root.querySelector('.page-header');
            if (pageHeaderDiv) {
                const style = pageHeaderDiv.getAttribute('style') || '';
                const urlMatch = style.match(/url\(['"]?([^'")]+)['"]?\)/);
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