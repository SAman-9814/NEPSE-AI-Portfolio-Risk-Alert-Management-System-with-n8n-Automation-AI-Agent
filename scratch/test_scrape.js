const https = require('https');

async function fetchHtml(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive'
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

function parseSharePrices(html) {
  // Debug: find all table tags and print their attributes
  const tableTagsRegex = /<table([^>]*?)>/gi;
  let tagMatch;
  console.log("Analyzing table tags in HTML...");
  while ((tagMatch = tableTagsRegex.exec(html)) !== null) {
    console.log("Found table tag attributes:", tagMatch[1].trim());
  }

  // Find the table by ID
  const tableRegex = /<table[^>]*id=["']headFixed["'][^>]*>([\s\S]*?)<\/table>/i;
  const tableMatch = html.match(tableRegex);
  
  if (!tableMatch) {
    throw new Error("Could not find table with id='headFixed' in the HTML.");
  }

  const tableContent = tableMatch[1];

  // Extract column headers to verify indices
  const headerRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/i;
  const headerMatch = tableContent.match(headerRowRegex);
  const headers = [];
  if (headerMatch) {
    const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
    let thMatch;
    while ((thMatch = thRegex.exec(headerMatch[1])) !== null) {
      headers.push(thMatch[1].replace(/<[^>]*>/g, '').trim());
    }
    console.log("Found Column Headers:", headers);
  }

  // Extract table body rows
  const tbodyRegex = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i;
  const tbodyMatch = tableContent.match(tbodyRegex);
  const bodyContent = tbodyMatch ? tbodyMatch[1] : tableContent;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  const stocks = [];

  while ((rowMatch = rowRegex.exec(bodyContent)) !== null) {
    const rowHtml = rowMatch[1];
    // Skip header row if it got caught
    if (rowHtml.includes('<th')) continue;

    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    const cells = [];

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      const cellText = cellMatch[1].replace(/<[^>]*>/g, '').trim();
      cells.push(cellText);
    }

    if (cells.length >= 10) {
      // Clean and parse the numeric values
      const cleanNum = (str) => {
        const val = parseFloat(str.replace(/,/g, ''));
        return isNaN(val) ? 0 : val;
      };

      // Table format on ShareSansar:
      // S.N. (0), Symbol (1), Conf (2), Open (3), High (4), Low (5), Close (6), LTP (7), Close-LTP (8), Close-LTP% (9), VWAP (10), Vol (11), Prev.Close (12), Turnover (13), Trans (14), Diff (15), Range (16), Diff% (17)
      stocks.push({
        symbol: cells[1],
        open: cleanNum(cells[3]),
        high: cleanNum(cells[4]),
        low: cleanNum(cells[5]),
        close: cleanNum(cells[6]),
        ltp: cleanNum(cells[7]),
        changePercent: cleanNum(cells[17]),
        volume: cleanNum(cells[11]),
        turnover: cleanNum(cells[13]),
        diff: cleanNum(cells[15])
      });
    }
  }

  return stocks;
}

async function run() {
  const url = 'https://www.sharesansar.com/today-share-price';
  console.log(`Fetching NEPSE today share price from: ${url}...`);

  try {
    const html = await fetchHtml(url);
    console.log("HTML fetched successfully. Length:", html.length);
    
    const stocks = parseSharePrices(html);
    console.log(`Successfully parsed ${stocks.length} stocks.`);

    if (stocks.length === 0) {
      console.log("No stocks parsed. Please check if table selector is correct.");
      return;
    }

    // Print first 5 stocks
    console.log("\nSample Stocks (First 5):");
    console.table(stocks.slice(0, 5));

    // Mock Watchlist
    const mockWatchlist = [
      { symbol: 'AHPC', targetSellPrice: 150.0 },
      { symbol: 'NABIL', targetSellPrice: 200.0 }, // Nabilla is usually higher but let's see
      { symbol: 'GBIME', targetSellPrice: 100.0 }
    ];

    console.log("\n--- Simulating Watchlist Alerts ---");
    console.log("Mock Watchlist:", mockWatchlist);

    const alerts = [];
    mockWatchlist.forEach(watch => {
      const stock = stocks.find(s => s.symbol.toUpperCase() === watch.symbol.toUpperCase());
      if (stock) {
        const targetReached = stock.ltp >= watch.targetSellPrice;
        console.log(`Checking ${watch.symbol}: LTP = Rs. ${stock.ltp}, Target Sell = Rs. ${watch.targetSellPrice} -> ${targetReached ? '🚨 TARGET REACHED!' : 'Pending'}`);
        if (targetReached) {
          alerts.push({
            ...watch,
            currentPrice: stock.ltp,
            open: stock.open,
            high: stock.high,
            low: stock.low,
            volume: stock.volume,
            changePercent: stock.changePercent
          });
        }
      } else {
        console.log(`Stock ${watch.symbol} not found in today's active trading list.`);
      }
    });

    console.log("\nTriggered Alerts to process with Gemini and WhatsApp:");
    console.log(JSON.stringify(alerts, null, 2));

  } catch (error) {
    console.error("Scraping error:", error);
  }
}

run();
