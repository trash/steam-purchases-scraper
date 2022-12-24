import puppeteer from 'puppeteer';

type GamePurchase = {
    isGift: false;
    date: string | null;
    games: string[];
};

type GiftGamePurchase = {
    isGift: true;
    content: string;
};

export type FetchGamesReturn = {
    rowsWithGames: GamePurchase[];
    rowsWithoutGames: GiftGamePurchase[];
};

export async function fetchGames(
    htmlFilePath: string
): Promise<FetchGamesReturn> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    // Need to have a steam-purchases.html file in the root of the project
    await page.goto(`file:${htmlFilePath}`);
    await page.waitForSelector('.responsive_page_frame');
    const results = await page.evaluate(() => {
        // Each row is a purchase. Get rid of header row with slice.
        const rows = [...document.querySelectorAll('tr')]
            .slice(1)
            .map((row) => {
                // The node with the list of games
                const gamesContainerNode = row.querySelector('.wht_items');
                // If there's a wth_payment div that's a gift. Filter those out separately.
                if (gamesContainerNode?.querySelector('.wth_payment')) {
                    return {
                        isGift: true as true,
                        // For now just return the content of the div.
                        content: gamesContainerNode
                            ?.querySelector(':scope > div')
                            .innerHTML.trim(),
                    };
                }
                const dateElement = row.querySelector('.wht_date');

                // The direct descent divs are each a game a part of the purchase.
                let gamesNodesQueryList =
                    gamesContainerNode?.querySelectorAll(':scope > div');

                const gamesNodes =
                    gamesNodesQueryList !== undefined
                        ? Array.from(gamesNodesQueryList)
                        : [];

                return {
                    isGift: false as false,
                    date: dateElement?.textContent
                        ? new Date(dateElement.textContent).toString()
                        : null,
                    games: gamesNodes.map((node) => node.textContent.trim()),
                };
            });

        const rowsWithGames: GamePurchase[] = [];
        const rowsWithoutGames: GiftGamePurchase[] = [];
        rows.forEach((row) => {
            if (row.isGift) {
                rowsWithoutGames.push(row);
            } else if (row.isGift === false) {
                rowsWithGames.push(row);
            }
        });

        return {
            rowsWithGames,
            rowsWithoutGames,
        };
    });
    browser.close();

    return results;
}
