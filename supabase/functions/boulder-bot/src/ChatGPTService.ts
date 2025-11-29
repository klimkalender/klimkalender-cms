import axios, { AxiosResponse } from 'axios';
import { CompData } from './CompData.ts';
import winston from 'winston';

/**
 * ChatGPT API response structure
 */
interface ChatGPTMessage {
    role: string;
    content: string;
}

interface ChatGPTChoice {
    message: ChatGPTMessage;
}

interface ChatGPTResponse {
    choices: ChatGPTChoice[];
}

/**
 * ChatGPT Service for AI-powered event classification and date extraction
 */
export class ChatGPTService {
    private apiKey: string;
    private logger: winston.Logger;
    private options: Record<string, any>;
    private cache: Map<string, string>;

    constructor(logger: winston.Logger, apiKey: string, options: Record<string, any> = {}) {
        this.logger = logger;
        this.apiKey = apiKey;
        this.options = options;
        this.cache = new Map<string, string>();
    }

    /**
     * Sends a generic prompt to ChatGPT and returns the response
     * @param prompt - The prompt to send
     * @returns The ChatGPT response
     */
    private async queryChatGPTGeneric(prompt: string): Promise<string> {
        // Check cache first
        const cachedResponse = this.cache.get(prompt);
        if (cachedResponse) {
            this.logger.debug('Returning cached ChatGPT response');
            return cachedResponse;
        }

        const data = {
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 50,
            temperature: 0
        };

        try {
            const response: AxiosResponse<ChatGPTResponse> = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                data,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );

            if (response.status !== 200) {
                throw new Error(`Failed to query ChatGPT: HTTP code ${response.status}`);
            }

            const result = response.data.choices?.[0]?.message?.content || 'No response';
            
            // Cache the response
            this.cache.set(prompt, result);
            
            return result;
        } catch (error: any) {
            if (error.response) {
                // The request was made and the server responded with a status code
                throw new Error(`ChatGPT API Error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`);
            } else if (error.request) {
                // The request was made but no response was received
                throw new Error(`Network Error: ${error.message}`);
            } else {
                // Something happened in setting up the request
                throw new Error(`Request Error: ${error.message}`);
            }
        }
    }

    /**
     * Checks if the given event description likely describes a competition
     * @param event - The event to check
     * @returns True if likely a competition
     */
    async competitionChecker(event: CompData): Promise<boolean> {
        let prompt = 'Do you think the following text describes a competition?';
        prompt += `The name of the event is: ${event.eventName}`;
        prompt += `The description of the event is: ${event.shortDescription}\n${event.fullDescriptionHtml}\n\n`;
        prompt += 'Please answer with Yes or No.';

        const response = await this.queryChatGPTGeneric(prompt);
        const normalizedResponse = response.trim().toLowerCase();

        this.logger.info(`ChatGPT says: ${response}`);

        // Check if the first 3 characters of the response match 'yes'
        const firstThreeChars = normalizedResponse.substring(0, 3);
        return firstThreeChars === 'yes';
    }

    /**
     * Use ChatGPT to find the most likely date for the event
     * @param text - The event text to analyze
     * @returns The extracted date or null
     */
    async dateFinder(text: string): Promise<Date | null> {
        const currentYear = new Date().getFullYear();

        let prompt = `The current year is ${currentYear}\n`;
        prompt += 'Given the following event information. What is the most likely date for this event?\n';
        prompt += `The description of the event is: ${text}\n\n`;
        prompt += 'Please answer only the date and do this in the format dd-mm-yyyy';

        const response = await this.queryChatGPTGeneric(prompt);
        const normalizedResponse = response.trim().toLowerCase();

        // ChatGPT sometimes is a bit too verbose :-) We just search for the date
        const dateMatch = normalizedResponse.match(/(\d{2}-\d{2}-\d{4})/);

        if (dateMatch && dateMatch[1]) {
            const [day, month, year] = dateMatch[1].split('-').map(Number);
            return new Date(year, month - 1, day); // month is 0-indexed in JavaScript Date
        }

        return null;
    }
}