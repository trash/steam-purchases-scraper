import path from 'path';
import { AirtableService } from './airtable';
import {
    Condition,
    GamePurchaseFields,
    PhysicalDigital,
    Retailer,
    GameSystem,
} from './constants';
require('dotenv').config();
import { fetchGames, FetchGamesReturn } from './steam';

// For January 3, 2022, returns 2022-01-03
function formatDate(dateString: string | null): string {
    if (!dateString) {
        return '';
    }
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}-${month}-${day}`;
}

async function updateAirtable(results: FetchGamesReturn) {
    const airtablePersonalToken = process.env.AIRTABLE_PERSONAL_TOKEN;
    const airtable = new AirtableService(airtablePersonalToken);

    const slicebefore = results.rowsWithGames.slice(0, 3);

    const gamesWithIds = await slicebefore.map(async (purchase) => {
        const dagames = await Promise.all(
            purchase.games.map(async (gameName) => {
                const recordId = await airtable.getGameIdByName(gameName);
                console.log('got the record id');
                if (recordId) {
                    const singleGamePurchase = purchase.games.length > 1;
                    if (singleGamePurchase) {
                        console.log('need to manually enter the price');
                    }

                    const fields: GamePurchaseFields = {
                        'Date Purchased': formatDate(purchase.date),
                        Condition: Condition.New,
                        'Physical/Digital': PhysicalDigital.Digital,
                        'Shipping Cost': 0,
                        System: [GameSystem.PC],
                        Retailer: Retailer.Steam,
                        // -1 will signal I need to update these records manually due to price not being itemized
                        // Price: singleGamePurchase ? purchase.price : -1,
                    };
                    return {
                        fields,
                        id: recordId,
                        name: gameName,
                    };
                }
                return null;
            })
        );
        console.log('dagames', dagames);
        return dagames;
    });

    console.log('end of program', gamesWithIds);
}

async function main() {
    const htmlFilePath = path.join(__dirname, '../steam-purchases.html');
    const results = await fetchGames(htmlFilePath);
    console.log(
        results.rowsWithGames.length,
        results.rowsWithoutGames.length,
        results
    );

    await updateAirtable(results);
}

main();
