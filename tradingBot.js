const axios = require('axios');
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'trading'
};

let balance = 100000;
let portfolio = {};
const buyThreshold = 0.97;
const sellThreshold = 1.05;
const initialBalance = balance;
let trades = [];

const getStockPrices = async () => {
    try {
        const response = await axios.get('https://www.alphavantage.co/query', {
            params: {
                function: 'TIME_SERIES_DAILY',
                symbol: 'RELIANCE.BSE',
                outputsize: 'full',
                apikey: 'AYVY7E4EMK3518YQ'
            }
        });
        const timeSeries = response.data['Time Series (Daily)'];
        const latestDate = Object.keys(timeSeries)[0];
        const latestPrice = parseFloat(timeSeries[latestDate]['4. close']);
        return { 'RELIANCE': latestPrice };
    } catch (error) {
        console.error('Error fetching stock prices:', error);
        return null;
    }
};

const trade = async () => {
    const prices = await getStockPrices();
    if (!prices) return;

    const connection = await mysql.createConnection(dbConfig);

    for (const [company, price] of Object.entries(prices)) {
        const [rows] = await connection.execute('SELECT * FROM stocks WHERE company = ?', [company]);
        let stock = rows[0];

        if (!stock) {
            await connection.execute(
                'INSERT INTO stocks (exchange, company, openingValue, closingValue, currentPrice, historicalPrices) VALUES (?, ?, ?, ?, ?, ?)',
                ['NSE', company, price, price, price, JSON.stringify({ daily: [price], weekly: [price], monthly: [price], quarterly: [price], yearly: [price] })]
            );
        } else {
            const historicalPrices = JSON.parse(stock.historicalPrices);
            historicalPrices.daily.push(price);
            await connection.execute(
                'UPDATE stocks SET currentPrice = ?, historicalPrices = ? WHERE company = ?',
                [price, JSON.stringify(historicalPrices), company]
            );
        }

        if (!portfolio[company]) {
            portfolio[company] = { quantity: 0, buyPrice: price };
        }

        if (portfolio[company].quantity === 0 && balance >= price) {
            const quantity = Math.floor(balance / price);
            portfolio[company].quantity = quantity;
            portfolio[company].buyPrice = price;
            balance -= quantity * price;
            trades.push({ action: 'buy', company, price, quantity });
            console.log(`Bought ${quantity} shares of ${company} at $${price}`);
        } else if (portfolio[company].quantity > 0) {
            if (price >= portfolio[company].buyPrice * sellThreshold) {
                balance += portfolio[company].quantity * price;
                trades.push({ action: 'sell', company, price, quantity: portfolio[company].quantity });
                console.log(`Sold ${portfolio[company].quantity} shares of ${company} at $${price}`);
                portfolio[company].quantity = 0;
            } else if (price <= portfolio[company].buyPrice * buyThreshold && balance >= price) {
                const quantity = Math.floor(balance / price);
                portfolio[company].quantity += quantity;
                balance -= quantity * price;
                trades.push({ action: 'buy', company, price, quantity });
                console.log(`Bought ${quantity} more shares of ${company} at $${price}`);
            }
        }
    }

    await connection.end();
    console.log(`Current balance: $${balance.toFixed(2)}`);
};

const generateReport = () => {
    const profitLoss = balance - initialBalance;
    console.log('Trading Summary:');
    trades.forEach(trade => {
        console.log(`${trade.action.toUpperCase()} - Company: ${trade.company}, Price: $${trade.price}, Quantity: ${trade.quantity}`);
    });
    console.log(`Final Balance: $${balance.toFixed(2)}`);
    console.log(`Profit/Loss: $${profitLoss.toFixed(2)}`);
};

process.on('SIGINT', () => {
    generateReport();
    process.exit();
});

setInterval(trade, 5000);