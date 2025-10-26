import { Hall } from './Hall.ts';

/**
 * Classification enum for events
 */
export enum Classification {
    UNKNOWN = 'Unknown',
    COMPETITION = 'Competition',
    NOCOMPETITION = 'NoCompetition'
}

/**
 * Event category enum
 */
export enum EventCategory {
    BOULDER = 'BOULDER',
    LEAD = 'LEAD',
    OTHER = 'OTHER'
}

/**
 * Competition data class representing an event
 */
export class CompData {
    public hall: Hall;
    public eventName: string;
    public eventDate: Date;
    public imageUrl: string;
    public shortDescription: string;
    public fullDescriptionHtml: string;
    public eventUrl: string;
    public classification: Classification;
    public uniqueRemoteId: string;
    public eventCategory: EventCategory;

    constructor() {
        this.hall = new Hall();
        this.eventName = '';
        this.eventDate = new Date();
        this.imageUrl = '';
        this.shortDescription = '';
        this.fullDescriptionHtml = '';
        this.eventUrl = '';
        this.classification = Classification.UNKNOWN;
        this.uniqueRemoteId = '';
        this.eventCategory = EventCategory.BOULDER; // Default for most cases
    }
}