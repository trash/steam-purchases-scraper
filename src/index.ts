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
        const rows = [...document.querySelectorAll('tr')].slice(1);
        // Get rid of header row
        return rows.map((row) => {
            const dateElement = row.querySelector('.wht_date');
            let gamesNodesQueryList = row
                .querySelector('.wht_items')
                // We want just the direct children of the wht_items div. Each one represents a game.
                ?.querySelectorAll(':scope > div');

            let gamesNodes =
                gamesNodesQueryList !== undefined
                    ? Array.from(gamesNodesQueryList)
                    : [];
            // Filter out the payment elements
            gamesNodes = gamesNodes.filter(
                (n) => !n.classList.contains('wth_payment')
            );

            return {
                date: dateElement?.textContent,
                games: gamesNodes.map((node) => node.textContent.trim()),
            };
        });
    });
    console.log(results);
    browser.close();
}

main();
