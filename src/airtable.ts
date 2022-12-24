import Airtable from 'airtable';
import { GameFields, GamePurchaseFields } from './constants';
import log from './log';

type GameRecord = Airtable.Record<{ Name: string }>;

export class AirtableService {
    gamesTable: Airtable.Table<GameFields>;
    gamePurchasesTable: Airtable.Table<GamePurchaseFields>;

    constructor(apiToken: string) {
        const base = new Airtable({ apiKey: apiToken }).base(
            'app6C7v5lHwKMR0RF'
        );
        this.gamesTable = base<GameFields>('Games');
        this.gamePurchasesTable = base<GamePurchaseFields>('Game purchases');
    }

    async getGameIdByName(gameName: string): Promise<string | null> {
        console.log(log.game(gameName), '[Searching]');
        return this.gamesTable
            .select({
                // Selecting the first 3 records in 2022 Recap:
                maxRecords: 3,
                view: 'Library',
                filterByFormula: `{Name} = "${gameName}"`,
            })
            .firstPage()
            .then((results) => {
                if (results.length === 0) {
                    console.log(log.game(gameName), log.warn('[Not found]'));
                    return null;
                }
                const id = results[0].id;
                console.log(log.game(gameName), log.success('[Found]'), id);
                return id;
            });
    }

    async updateGamePurchases(
        gamePurchases: { id: string; fields: GamePurchaseFields }[]
    ) {
        console.log(gamePurchases);
    }
}

export async function updateAirtable(apiToken: string) {}
