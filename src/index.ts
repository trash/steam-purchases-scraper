import fs from 'fs';
import path from 'path';
import { AirtableService } from './airtable';
import {
    Condition,
    GamePurchaseFields,
    PhysicalDigital,
    Retailer,
    GameSystem,
    GamePurchase,
    AIRTABLE_MAX_RECORDS_PER_REQUEST,
    skippedGamesFileName,
    searchedGamesCacheFileName,
} from './constants';
import log from './log';
require('dotenv').config();
import { fetchGames, FetchGamesReturn } from './steam';

async function asyncTimeout(timeoutMs: number) {
    return new Promise((resolve) => setTimeout(resolve, timeoutMs));
}

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

function getAirtableUpdateFieldsFromGamePurchase(
    purchase: GamePurchase,
    recordId: string
): GamePurchaseFields {
    const singleGamePurchase = purchase.games.length <= 1;

    return {
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
}

async function writeSkippedGames(
    skippedGamesFilePath: string,
    skippedGames: { gameName: string; purchase: GamePurchase }[]
): Promise<void> {
    return fs.promises.writeFile(
        skippedGamesFilePath,
        JSON.stringify(skippedGames, null, 4)
    );
}

async function updateAirtable(
    results: FetchGamesReturn,
    skippedGamesFilePath: string,
    searchedGamesCache: { [key: string]: boolean }
) {
    console.log(log.info('Starting Airtable update...'));
    const airtablePersonalToken = process.env.AIRTABLE_PERSONAL_TOKEN;
    const airtable = new AirtableService(airtablePersonalToken);

    // Games that are skipped due to being in a bulk purchase should be added to a list
    // so we can record them to be manually entered later.
    const skippedGames: { gameName: string; purchase: GamePurchase }[] = [];

    // First reduce all the purchases to a list of all games. We still need a ref to the purchase for metadata
    // so just add it as a pointer.
    const gamesWithPurchase = results.gamePurchases
        .reduce((allGames, nextPurchase) => {
            return allGames.concat(
                nextPurchase.games.map((g) => ({
                    gameName: g,
                    purchase: nextPurchase,
                }))
            );
        }, [])
        // Filter out games we've already searched
        .filter((g) => !searchedGamesCache[g.gameName])
        // TODO: Right now we're just doing 50 at a time in case we error out. Should probably fix this.
        .slice(0, 50);

    // Process them in batches based on Airtable's max records per request.
    for (
        let i = 0;
        i <
        Math.ceil(gamesWithPurchase.length / AIRTABLE_MAX_RECORDS_PER_REQUEST);
        i++
    ) {
        console.log(log.info(`Batch ${i + 1} starting...`));
        const currentSlice = gamesWithPurchase.slice(
            i * AIRTABLE_MAX_RECORDS_PER_REQUEST,
            i * AIRTABLE_MAX_RECORDS_PER_REQUEST +
                AIRTABLE_MAX_RECORDS_PER_REQUEST
        );

        const gamesWithIds = await Promise.all(
            // Process each purchase
            currentSlice.map(async ({ gameName, purchase }) => {
                // Make sure to mark our cache. We mark both games with no id and games with an id.
                searchedGamesCache[gameName] = true;

                // Fetch each individual game in the purchase
                const recordId = await airtable.getGameIdByName(gameName);
                if (recordId) {
                    const fields = getAirtableUpdateFieldsFromGamePurchase(
                        purchase,
                        recordId
                    );
                    return {
                        fields,
                    };
                }
                skippedGames.push({ gameName, purchase });
                return null;
            })
        );

        await airtable.updateGamePurchases(gamesWithIds);

        // Wait 2 seconds before spamming the api with another 11 requests again
        await asyncTimeout(2000);
        console.log(log.info(`Batch ${i + 1} complete.`));
    }

    console.log(
        log.info(`Writing skipped games to file: ${skippedGamesFilePath}`)
    );
    await writeSkippedGames(skippedGamesFilePath, skippedGames);

    // Return the updated games cache so we can write it to disk.
    return searchedGamesCache;
}

async function getSearchedGameCacheFromDisk(
    searchedGamesCacheFilePath: string
) {
    const fileExists = await fs.promises
        .access(searchedGamesCacheFilePath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
    if (!fileExists) {
        await fs.promises.writeFile(
            searchedGamesCacheFilePath,
            JSON.stringify({})
        );
    }
    const buffer = await fs.promises.readFile(searchedGamesCacheFilePath);
    return JSON.parse(buffer.toString());
}

async function main() {
    const htmlFilePath = path.join(__dirname, '../steam-purchases.html');
    const results = await fetchGames(htmlFilePath);
    console.log(
        `Games: ${results.gamePurchases.length} Gifts: ${results.giftGamePurchases.length}`
    );

    // Check for an existing searchedGamesCache file so we don't need to
    // re-search for previously searched games.

    const skippedGamesFilePath = path.join(
        __dirname,
        `../${skippedGamesFileName}`
    );
    const searchedGamesCacheFilePath = path.join(
        __dirname,
        `../${searchedGamesCacheFileName}`
    );

    let searchedGamesCache = await getSearchedGameCacheFromDisk(
        searchedGamesCacheFilePath
    );
    searchedGamesCache = await updateAirtable(
        results,
        skippedGamesFilePath,
        searchedGamesCache
    );
    // Write updated cache to disk
    await fs.promises.writeFile(
        searchedGamesCacheFilePath,
        JSON.stringify(searchedGamesCache, null, 4)
    );
}

main();
