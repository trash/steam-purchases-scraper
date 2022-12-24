// import { promises } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

// promises.readFile('steam-purchases.html', 'utf8').then(console.log);
async function main() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    // await page.goto('file://C:/Users/compoundeye/test.html');
    const htmlFilePath = path.join(__dirname, '../steam-purchases.html');
    console.log(htmlFilePath);
    await page.goto(`file:${htmlFilePath}`);
    await page.waitForSelector('.responsive_page_frame');
    const results = await page.evaluate(() => {
        // Each row is a purchase. Get rid of header row with slice.
        const rows = [...document.querySelectorAll('tr')]
            .slice(1)
            .map((row) => {
                const dateElement = row.querySelector('.wht_date');

                // The node with the list of games
                const gamesContainerNode = row.querySelector('.wht_items');
                // If there's a wth_payment div that's a gift. Filter those out
                if (gamesContainerNode?.querySelector('.wth_payment')) {
                    return {
                        isGift: true,
                        content: gamesContainerNode
                            ?.querySelector(':scope > div')
                            .innerHTML.trim(),
                    };
                }
                //
                let gamesNodesQueryList =
                    gamesContainerNode?.querySelectorAll(':scope > div');

                const gamesNodes =
                    gamesNodesQueryList !== undefined
                        ? Array.from(gamesNodesQueryList)
                        : [];

                return {
                    isGift: false,
                    date: dateElement?.textContent,
                    games: gamesNodes.map((node) => node.textContent.trim()),
                };
            });

        return {
            rowsWithGames: rows.filter((x) => !x.isGift),
            rowsWithoutGames: rows.filter((x) => x.isGift),
        };
    });
    console.log(
        results.rowsWithGames.length,
        results.rowsWithoutGames.length,
        results
    );
    browser.close();
}

main();
