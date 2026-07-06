const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// 1. Professional Database Connection
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error(err.message);
    else console.log('✅ Professional Database created successfully, Ram!');
});

// 2. Create Tables (Customers & Payments)
db.serialize(() => {
    // Customers Table
    db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT UNIQUE,
        password TEXT,
        aadhaar TEXT,
        pan TEXT,
        loan_amount INTEGER,
        total_weeks INTEGER,
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Payments Table
    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        customer_name TEXT,
        customer_phone TEXT,
        week_number TEXT,
        amount INTEGER,
        transaction_id TEXT,
        status TEXT DEFAULT 'Pending',
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// 3. Login Logic
app.post('/login', (req, res) => {
    const { phone, password } = req.body;
    
    // Admin Login
    if (phone === '7569532152' && password === 'ramu@2026') {
        return res.redirect('/admin-dashboard.html');
    }

    // Customer Login
    db.get("SELECT * FROM customers WHERE phone = ? AND password = ?", [phone, password], (err, customer) => {
        if (customer) {
            return res.redirect(`/customer-dashboard.html?phone=${phone}`);
        } else {
            return res.send("<h2>Login Failed! Incorrect Phone Number or Password. Please try again.</h2>");
        }
    });
});

// 4. Admin - Add New Customer
app.post('/add-customer', (req, res) => {
    const { name, phone, password, aadhaar, pan, loan_amount, total_weeks } = req.body;
    const stmt = db.prepare("INSERT INTO customers (name, phone, password, aadhaar, pan, loan_amount, total_weeks) VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    stmt.run([name, phone, password, aadhaar, pan, loan_amount, total_weeks], function(err) {
        if (err) return res.send("Account with this phone number already exists!");
        res.redirect('/admin-dashboard.html');
    });
});

// 5. Admin - Fetch All Data
app.get('/admin-data', (req, res) => {
    db.all("SELECT * FROM customers", [], (err, customers) => {
        db.all("SELECT * FROM payments ORDER BY id DESC", [], (err, payments) => {
            res.json({ customers, payments });
        });
    });
});

// 6. Admin - Approve Payment
app.post('/approve-payment', (req, res) => {
    const { payment_id } = req.body;
    db.run("UPDATE payments SET status = 'Approved' WHERE id = ?", [payment_id], (err) => {
        res.redirect('/admin-dashboard.html');
    });
});

// 7. Customer - Fetch Dashboard Data
app.get('/customer-data/:phone', (req, res) => {
    const phone = req.params.phone;
    db.get("SELECT * FROM customers WHERE phone = ?", [phone], (err, customer) => {
        if (!customer) return res.json({ error: "Customer not found" });
        
        db.all("SELECT * FROM payments WHERE customer_phone = ? ORDER BY id DESC", [phone], (err, payments) => {
            res.json({ customer, payments });
        });
    });
});

// 8. Customer - Submit New Payment
app.post('/submit-payment', (req, res) => {
    const { phone, week_number, amount, transaction_id } = req.body;
    
    db.get("SELECT id, name FROM customers WHERE phone = ?", [phone], (err, customer) => {
        if (!customer) return res.send("Invalid phone number.");

        const stmt = db.prepare("INSERT INTO payments (customer_id, customer_name, customer_phone, week_number, amount, transaction_id) VALUES (?, ?, ?, ?, ?, ?)");
        stmt.run([customer.id, customer.name, phone, week_number, amount, transaction_id], function(err) {
            if (err) return res.send("An error occurred while submitting payment.");
            res.send(`
                <div style="text-align:center; font-family:Arial; margin-top:50px;">
                    <h2 style="color:green;">Success! Your payment of ₹${amount} has been submitted ✅</h2>
                    <p>Please wait for Admin approval.</p>
                    <a href="/customer-dashboard.html?phone=${phone}" style="padding:10px 20px; background:#007bff; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">Go to Dashboard</a>
                </div>
            `);
        });
    });
});

// Start Server
app.listen(port, () => {
    console.log(`🚀 Server is running! Open http://localhost:${port}`);
});