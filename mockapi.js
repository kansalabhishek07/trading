const express = require('express');
const axios = require('axios');
const app = express();
const port = 3001;

const apiKey = 'AYVY7E4EMK3518YQ'; // Replace with your actual Alpha Vantage API key
const symbols = ['RELIANCE.BSE', 'TCS.BSE']; // Add more stock symbols as needed

const getStockPrices = async () => {
    const prices = {};
    for (const symbol of symbols) {
        try {
            const response = await axios.get('https://www.alphavantage.co/query', {
                params: {
                    function: 'TIME_SERIES_DAILY',
                    symbol,
                    outputsize: 'compact',
                    apikey: apiKey
                }
            });
            const timeSeries = response.data['Time Series (Daily)'];
            const latestDate = Object.keys(timeSeries)[0];
            const latestPrice = parseFloat(timeSeries[latestDate]['4. close']);
            prices[symbol.split('.')[0]] = latestPrice.toFixed(2);
        } catch (error) {
            console.error(`Error fetching stock price for ${symbol}:`, error);
        }
    }
    return prices;
};

app.get('/stock-price', async (req, res) => {
    const prices = await getStockPrices();
    res.json(prices);
});

app.listen(port, () => {
    console.log(`Mock API running at http://localhost:${port}`);
});