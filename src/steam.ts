import puppeteer from 'puppeteer';
import { GamePurchase, GiftGamePurchase } from './constants';
export type FetchGamesReturn = {
    gamePurchases: GamePurchase[];
    giftGamePurchases: GiftGamePurchase[];
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
        function getPriceFromPriceElement(
            priceElement: Element | null
        ): number | null {
            if (!priceElement) {
                return null;
            }
            // Indicates a refund or sale of trading cards or something
            if (priceElement.querySelector('.wth_payment')) {
                return null;
            }
            // Format: '$13.31'
            const priceString = priceElement.textContent.trim();
            return parseFloat(priceString.slice(1));
        }

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
                const priceElement = row.querySelector('.wht_total');

                // The direct descent divs are each a game a part of the purchase.
                let gamesNodesQueryList =
                    gamesContainerNode?.querySelectorAll(':scope > div');

                const gamesNodes =
                    gamesNodesQueryList !== undefined
                        ? Array.from(gamesNodesQueryList)
                        : [];

                return {
                    date: dateElement?.textContent
                        ? new Date(dateElement.textContent).toString()
                        : null,
                    games: gamesNodes.map((node) => node.textContent.trim()),
                    isGift: false as false,
                    price: getPriceFromPriceElement(priceElement),
                };
            });

        const gamePurchases: GamePurchase[] = [];
        const giftGamePurchases: GiftGamePurchase[] = [];
        rows.forEach((row) => {
            if (row.isGift) {
                giftGamePurchases.push(row);
            } else if (row.isGift === false) {
                gamePurchases.push(row);
            }
        });

        return {
            gamePurchases,
            giftGamePurchases,
        };
    });
    browser.close();

    return results;
}
