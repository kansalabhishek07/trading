const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'trading'
};

class Stock {
    static async createTable() {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS stocks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                exchange VARCHAR(255),
                company VARCHAR(255),
                openingValue FLOAT,
                closingValue FLOAT,
                currentPrice FLOAT,
                historicalPrices JSON
            )
        `);
        await connection.end();
    }

    static async findOne(company) {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM stocks WHERE company = ?', [company]);
        await connection.end();
        return rows[0];
    }

    static async insert(stock) {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'INSERT INTO stocks (exchange, company, openingValue, closingValue, currentPrice, historicalPrices) VALUES (?, ?, ?, ?, ?, ?)',
            [stock.exchange, stock.company, stock.openingValue, stock.closingValue, stock.currentPrice, JSON.stringify(stock.historicalPrices)]
        );
        await connection.end();
    }

    static async update(stock) {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'UPDATE stocks SET currentPrice = ?, historicalPrices = ? WHERE company = ?',
            [stock.currentPrice, JSON.stringify(stock.historicalPrices), stock.company]
        );
        await connection.end();
    }
}

module.exports = Stock;