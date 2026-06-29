const https = require('https');

async function fetchHtml(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch: Status Code ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function parseLiveSharePrices(html) {
  const tableRegex = /<table[^>]*id=["']headFixed["'][^>]*>([\s\S]*?)<\/table>/i;
  const tableMatch = html.match(tableRegex);
  
  if (!tableMatch) {
    throw new Error("Could not find table with id='headFixed' in the HTML.");
  }

  const tableContent = tableMatch[1];
  const tbodyRegex = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i;
  const tbodyMatch = tableContent.match(tbodyRegex);
  const bodyContent = tbodyMatch ? tbodyMatch[1] : tableContent;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  const stocks = [];

  const cleanNum = (str) => {
    const val = parseFloat(str.replace(/,/g, ''));
    return isNaN(val) ? 0 : val;
  };

  while ((rowMatch = rowRegex.exec(bodyContent)) !== null) {
    const rowHtml = rowMatch[1];
    if (rowHtml.includes('<th')) continue;

    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    const cells = [];

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
    }

    if (cells.length >= 10) {
      // Columns: S.No (0), Symbol (1), LTP (2), Point Change (3), % Change (4), Open (5), High (6), Low (7), Volume (8), Prev. Close (9)
      stocks.push({
        symbol: cells[1].toUpperCase(),
        ltp: cleanNum(cells[2]),
        diff: cleanNum(cells[3]),
        changePercent: cleanNum(cells[4]),
        open: cleanNum(cells[5]),
        high: cleanNum(cells[6]),
        low: cleanNum(cells[7]),
        volume: cleanNum(cells[8])
      });
    }
  }

  return stocks;
}

async function run() {
  const url = 'https://www.sharesansar.com/live-trading';
  console.log(`Fetching NEPSE Live share price from: ${url}...`);

  try {
    const html = await fetchHtml(url);
    const stocks = parseLiveSharePrices(html);
    console.log(`Successfully parsed ${stocks.length} stocks from Live Trading.`);

    const ymhlStock = stocks.find(s => s.symbol === 'YMHL');
    console.log("\n*** LIVE YMHL DETAILS ***");
    console.log(ymhlStock);
    console.log("**************************\n");

  } catch (error) {
    console.error("Live Scraping error:", error);
  }
}

run();
