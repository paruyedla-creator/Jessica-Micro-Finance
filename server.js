const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); 

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error(err.message);
    console.log('✅ SQLite డేటాబేస్ కనెక్ట్ అయ్యింది!');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT UNIQUE, password TEXT, name TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT, week TEXT, amount TEXT, status TEXT, color TEXT)`);

    db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
        if (row.count === 0) {
            db.run(`INSERT INTO users (phone, password, name) VALUES ('9876543210', 'jessica123', 'Ram')`);
            db.run(`INSERT INTO payments (phone, week, amount, status, color) VALUES ('9876543210', 'Week 1', '₹1000', 'Pending', 'red')`);
        }
    });
});

app.post('/login', (req, res) => {
    const { phone, password } = req.body;
    db.get("SELECT * FROM users WHERE phone = ? AND password = ?", [phone, password], (err, user) => {
        if (user) {
            res.json({ success: true, message: "లాగిన్ సక్సెస్!" });
        } else {
            res.status(401).json({ success: false, message: "ఫోన్ నంబర్ లేదా పాస్‌వర్డ్ తప్పు." });
        }
    });
});

app.post('/get-dashboard-data', (req, res) => {
    const { phone } = req.body;
    db.get("SELECT * FROM users WHERE phone = ?", [phone], (err, user) => {
        if (user) {
            db.all("SELECT * FROM payments WHERE phone = ?", [phone], (err, payments) => {
                user.payments = payments;
                res.json({ success: true, data: user });
            });
        } else {
            res.json({ success: false });
        }
    });
});

app.get('/get-all-customers', (req, res) => {
    db.all("SELECT * FROM users", [], (err, users) => {
        if (err) return res.json({ success: false });
        db.all("SELECT * FROM payments", [], (err, allPayments) => {
            const data = users.map(user => {
                return { ...user, payments: allPayments.filter(p => p.phone === user.phone) };
            });
            res.json({ success: true, data });
        });
    });
});

app.post('/approve-payment', (req, res) => {
    const { phone, week } = req.body;
    db.run("UPDATE payments SET status = 'Paid', color = 'green' WHERE phone = ? AND week = ?", [phone, week], function(err) {
        if (err) res.json({ success: false, message: "ఎర్రర్ వచ్చింది" });
        else res.json({ success: true, message: "Payment Approved!" });
    });
});

// ----------- కొత్త ఫీచర్స్ (New Customer & Payment) -----------

app.post('/add-customer', (req, res) => {
    const { name, phone, password } = req.body;
    db.run(`INSERT INTO users (name, phone, password) VALUES (?, ?, ?)`, [name, phone, password], function(err) {
        if (err) {
            res.json({ success: false, message: "ఈ ఫోన్ నంబర్ తో ఇప్పటికే ఒక కస్టమర్ ఉన్నారు!" });
        } else {
            res.json({ success: true, message: "కొత్త కస్టమర్ యాడ్ అయ్యారు!" });
        }
    });
});

app.post('/add-payment', (req, res) => {
    const { phone, week, amount } = req.body;
    db.run(`INSERT INTO payments (phone, week, amount, status, color) VALUES (?, ?, ?, 'Pending', 'red')`, [phone, week, amount], function(err) {
        if (err) {
            res.json({ success: false, message: "ఎర్రర్ వచ్చింది" });
        } else {
            res.json({ success: true, message: "కొత్త పేమెంట్ వీక్ యాడ్ అయ్యింది!" });
        }
    });
});
// కస్టమర్ పేమెంట్ చేశాక అప్రూవల్ కోసం రిక్వెస్ట్ పెట్టే API
app.post('/request-approval', (req, res) => {
    const { phone, week } = req.body;
    // స్టేటస్ ని Pending నుండి Requested కి మారుస్తున్నాం (ఆరెంజ్ కలర్ లో)
    db.run("UPDATE payments SET status = 'Requested ⏳', color = '#ff9800' WHERE phone = ? AND week = ?", [phone, week], function(err) {
        if (err) res.json({ success: false, message: "ఎర్రర్ వచ్చింది" });
        else res.json({ success: true, message: "మీ రిక్వెస్ట్ అడ్మిన్ కి పంపబడింది!" });
    });
});
app.listen(port, () => {
    console.log(`సర్వర్ రన్ అవుతోంది! బ్రౌజర్‌లో http://localhost:${port} ఓపెన్ చేయండి.`);
});// ----------- అడ్మిన్ లాగిన్ సెక్యూరిటీ -----------
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    // ఇక్కడ ఉన్నది మీ ఓనర్ ఐడీ మరియు పాస్‌వర్డ్ (మీరు కావాలంటే మార్చుకోవచ్చు)
    if (username === "admin" && password === "jessica@owner") {
        res.json({ success: true, message: "అడ్మిన్ లాగిన్ సక్సెస్!" });
    } else {
        res.status(401).json({ success: false, message: "ఐడీ లేదా పాస్‌వర్డ్ తప్పు!" });
    }
});