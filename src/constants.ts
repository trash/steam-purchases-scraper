// Hardcode this for now so we don't need to query the server. These shouldn't change anyway.
export enum GameSystem {
    PC = 'rectM896PMn1jcAIS',
}

export enum Retailer {
    Amazon = 'Amazon',
    Steam = 'Steam',
    Ebay = 'Ebay',
    Microsoft = 'Microsoft',
}
export enum Condition {
    New = 'New',
    Used = 'Used',
}

export enum PhysicalDigital {
    Physical = 'Physical',
    Digital = 'Digital',
}

export type GamePurchaseFields = Partial<{
    // List of ids from the Games table
    Games: string[];
    Price: number;
    'Shipping Cost': number;
    // List of ids from the System table
    System: GameSystem[];
    'Physical/Digital': PhysicalDigital;
    // string (ISO 8601 formatted date) e.g.: "2009-10-07"
    'Date Purchased': string;
    Retailer: Retailer;
    Condition: Condition;
}>;

export type GameFields = { Name: string };

export const AIRTABLE_MAX_RECORDS_PER_REQUEST = 10;

export type GamePurchase = {
    isGift: false;
    date: string | null;
    games: string[];
    price: number | null;
};

export type GiftGamePurchase = {
    isGift: true;
    content: string;
};

export const skippedGamesFileName = 'skippedGames.json';
