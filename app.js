// app.js
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Middleware for parsing JSON
app.use(bodyParser.json());

// Serve static files (like index.html) from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Replace with your MySQL username
    password: '', // Replace with your MySQL password
    database: 'payment_system'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Database connected!');
});

// Payment API
app.post('/', (req, res) => {
    const { customer_id, amount } = req.body;

    if (!customer_id || !amount) {
        return res.status(400).send({ message: 'Invalid input!' });
    }

    const checkBalanceSql = 'SELECT balance FROM customers WHERE customer_id = ?';
    db.query(checkBalanceSql, [customer_id], (err, result) => {
        if (err) return res.status(500).send({ message: 'Database error!' });

        if (result.length === 0) {
            return res.status(404).send({ message: 'Customer not found!' });
        }

        const currentBalance = result[0].balance;

        if (currentBalance >= amount) {
            const updateBalanceSql = 'UPDATE customers SET balance = balance - ? WHERE customer_id = ?';
            db.query(updateBalanceSql, [amount, customer_id], (err) => {
                if (err) return res.status(500).send({ message: 'Error updating balance!' });

                const transactionSql = 'INSERT INTO transactions (customer_id, amount, transaction_type) VALUES (?, ?, ?)';
                db.query(transactionSql, [customer_id, amount, 'debit'], (err) => {
                    if (err) return res.status(500).send({ message: 'Error recording transaction!' });
                    res.send({ message: 'Payment successful!' });
                });
            });
        } else {
            res.status(400).send({ message: 'Insufficient balance!' });
        }
    });
});

// Start the server
app.listen(2000, () => {
    console.log('Server running on port 2000');
});
