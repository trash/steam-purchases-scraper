import path from 'path';
import { AirtableService, GamePurchaseUpdateEntry } from './airtable';
import {
    Condition,
    GamePurchaseFields,
    PhysicalDigital,
    Retailer,
    GameSystem,
} from './constants';
import log from './log';
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

    const slicebefore = results.rowsWithGames.slice(2, 5);

    const gamesWithIds = (
        await Promise.all(
            slicebefore.map(async (purchase) => {
                return await Promise.all(
                    purchase.games.map(async (gameName) => {
                        const recordId = await airtable.getGameIdByName(
                            gameName
                        );
                        if (recordId) {
                            const singleGamePurchase =
                                purchase.games.length <= 1;

                            const fields: GamePurchaseFields = {
                                Games: [recordId],
                                'Date Purchased': formatDate(purchase.date),
                                Condition: Condition.New,
                                'Physical/Digital': PhysicalDigital.Digital,
                                'Shipping Cost': 0,
                                System: [GameSystem.PC],
                                Retailer: Retailer.Steam,
                                // -1 will signal I need to update these records manually due to price not being itemized
                                Price: singleGamePurchase ? purchase.price : -1,
                            };
                            return {
                                fields,
                            };
                        }
                        return null;
                    })
                );
            })
        )
    ).reduce((aggregate, nextGames) => {
        return aggregate.concat(nextGames);
    }, [] as GamePurchaseUpdateEntry[]);
    // console.log(gamesWithIds);
    await airtable.updateGamePurchases(gamesWithIds);

    console.log('end of program');
}

async function main() {
    const htmlFilePath = path.join(__dirname, '../steam-purchases.html');
    const results = await fetchGames(htmlFilePath);
    console.log(
        results.rowsWithGames.length,
        results.rowsWithoutGames.length
        // results
    );

    await updateAirtable(results);
}

main();
