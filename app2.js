const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');  // Import nodemailer

const app = express();

// Middleware for parsing JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// Create a Nodemailer transporter object
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'alamin.cu.cse@gmail.com',  // Your Gmail address
        pass: 'hfvfnqmaaijmznwc'  // Your Gmail app password
    }
});

// OTP generation function
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
}

// Store OTP temporarily (you can use a more persistent storage method like Redis for production)
let otpData = {};

// Function to send OTP email
function sendOTPEmail(email, otp) {
    const mailOptions = {
        from: 'alamin.cu.cse@gmail.com',  // Your Gmail address
        to: email,
        subject: 'Your OTP for Payment',
        text: `Your OTP for the payment is: ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending OTP:', error);
        } else {
            console.log('OTP sent: ' + info.response);
        }
    });
}

// Payment API - Step 1: Verify customer balance and send OTP
app.post('/', (req, res) => {
    const { customer_id, amount } = req.body;

    if (!customer_id || !amount) {
        return res.status(400).send({ message: 'Invalid input!' });
    }

    const checkBalanceSql = 'SELECT balance, email FROM customers WHERE customer_id = ?';
    db.query(checkBalanceSql, [customer_id], (err, result) => {
        if (err) return res.status(500).send({ message: 'Database error!' });

        if (result.length === 0) {
            return res.status(404).send({ message: 'Customer not found!' });
        }

        const currentBalance = result[0].balance;
        const customerEmail = result[0].email;  // Get customer's email

        if (currentBalance >= amount) {
            const otp = generateOTP();  // Generate OTP

            // Store OTP and customer id for validation
            otpData = { customer_id, otp, balance: currentBalance, amount };

            // Send OTP to customer's email
            sendOTPEmail(customerEmail, otp);

            res.send({ message: `Payment is valid. OTP sent to ${customerEmail}. Please verify the OTP on the next page.` });
        } else {
            res.status(400).send({ message: 'Insufficient balance!' });
        }
    });
});

// OTP verification API - Step 2: Verify OTP, update balance and insert into transactions table
app.post('/verify-otp', (req, res) => {
    const { otp, customer_id } = req.body;

    if (!otp || !customer_id) {
        return res.status(400).send({ message: 'Invalid input!' });
    }

    console.log(`OTP entered: ${otp}, Customer ID entered: ${customer_id}`);
    console.log(`Stored OTP: ${otpData.otp}, Stored Customer ID: ${otpData.customer_id}`);

    if (otpData.otp === parseInt(otp) && otpData.customer_id === customer_id) {
        // OTP is correct, now update the balance
        const newBalance = otpData.balance - otpData.amount;

        console.log(`Current balance: ${otpData.balance}, Amount to deduct: ${otpData.amount}, New balance: ${newBalance}`);

        const updateBalanceSql = 'UPDATE customers SET balance = ? WHERE customer_id = ?';
        db.query(updateBalanceSql, [newBalance, customer_id], (err, result) => {
            if (err) {
                console.error('Error updating balance:', err);
                return res.status(500).send({ message: 'Database error during balance update!' });
            }

            // Insert transaction record into the transactions table
            const transactionSql = 'INSERT INTO transactions (customer_id, amount, balance_after_transaction, status) VALUES (?, ?, ?, ?)';
            db.query(transactionSql, [customer_id, otpData.amount, newBalance, 'successful'], (err, result) => {
                if (err) {
                    console.error('Error inserting transaction:', err);
                    return res.status(500).send({ message: 'Error recording transaction!' });
                }

                console.log('Transaction recorded successfully!');
                // Clear OTP data after use
                otpData = {};
                res.send({ message: 'Payment successful. Balance updated and transaction recorded.' });
            });
        });
    } else {
        res.status(400).send({ message: 'Invalid OTP or Customer ID!' });
    }
});



// Start the server
app.listen(2000, () => {
    console.log('Server running on port 2000');
});
