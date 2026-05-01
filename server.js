const https = require('https');

const TOKENS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'];

const COINGECKO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum', 
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple'
};

function fetchPrice(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function getAllPrices(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const results = {};

  // CoinGecko se Binance price lo
  const ids = Object.values(COINGECKO_IDS).join(',');
  const gecko = await fetchPrice(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
  );

  for (const token of TOKENS) {
    results[token] = {};

    // Binance price CoinGecko se
    if (gecko && gecko[COINGECKO_IDS[token]]) {
      results[token].binance = gecko[COINGECKO_IDS[token]].usd;
    }

    // MEXC
    const mexc = await fetchPrice(
      `https://api.mexc.com/api/v3/ticker/24hr?symbol=${token}USDT`
    );
    if (mexc) results[token].mexc = parseFloat(mexc.lastPrice);

    // KuCoin
    const kucoin = await fetchPrice(
      `https://api.kucoin.com/api/v1/market/stats?symbol=${token}-USDT`
    );
    if (kucoin && kucoin.data) results[token].kucoin = parseFloat(kucoin.data.last);

    // OKX
    const okx = await fetchPrice(
      `https://www.okx.com/api/v5/market/ticker?instId=${token}-USDT`
    );
    if (okx && okx.data) results[token].okx = parseFloat(okx.data[0].last);
  }

  res.end(JSON.stringify(results));
}

const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/prices') getAllPrices(req, res);
  else res.end('Crypto Backend Running!');
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Server running!');
});
