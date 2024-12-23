const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');  // Import nodemailer

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

// Create a Nodemailer transporter object
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'alamin.cu.cse@gmail.com',  // Your Gmail address
        pass: '123'    // Your Gmail app password
    }
});

// OTP generation function
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
}

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

// Payment API
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

            // Send OTP to customer's email
            sendOTPEmail(customerEmail, otp);

            res.send({ message: `Payment is valid. OTP sent to ${customerEmail}.` });
        } else {
            res.status(400).send({ message: 'Insufficient balance!' });
        }
    });
});

// Start the server
app.listen(2000, () => {
    console.log('Server running on port 2000');
});
