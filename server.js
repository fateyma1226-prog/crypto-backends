const https = require('https');

const TOKENS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'];

function fetchPrice(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
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

  for (const token of TOKENS) {
    results[token] = {};

    // Binance
    const binance = await fetchPrice(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${token}USDT`
    );
    if (binance) results[token].binance = parseFloat(binance.lastPrice);

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