const https = require('https');
const WebSocket = require('ws');

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

function getBinancePrices() {
  return new Promise((resolve) => {
    const prices = {};
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];

    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

    ws.on('message', (data) => {
      const tickers = JSON.parse(data);
      tickers.forEach(t => {
        if (symbols.includes(t.s)) {
          prices[t.s.replace('USDT', '')] = parseFloat(t.c);
        }
      });
      if (Object.keys(prices).length >= 5) {
        ws.close();
        resolve(prices);
      }
    });

    ws.on('error', () => resolve({}));
    setTimeout(() => { ws.close(); resolve(prices); }, 5000);
  });
}

async function getAllPrices(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const results = {};

  // Binance WebSocket se prices lo
  const binancePrices = await getBinancePrices();

  for (const token of TOKENS) {
    results[token] = {};

    // Binance
    if (binancePrices[token]) results[token].binance = binancePrices[token];

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
