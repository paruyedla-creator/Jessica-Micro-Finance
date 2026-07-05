const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // డేటాబేస్ ప్యాకేజీ
const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); 

// 1. డేటాబేస్ కనెక్షన్ (ఇది 'database.db' అనే కొత్త ఫైల్ క్రియేట్ చేస్తుంది)
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error(err.message);
    console.log('✅ SQLite డేటాబేస్ కనెక్ట్ అయ్యింది!');
});

// 2. కస్టమర్ల కోసం మరియు పేమెంట్స్ కోసం టేబుల్స్ క్రియేట్ చేయడం
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT UNIQUE, password TEXT, name TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT, week TEXT, amount TEXT, status TEXT, color TEXT)`);

    // కొత్తగా డేటాబేస్ క్రియేట్ అయినప్పుడు, టెస్టింగ్ కోసం 2 డమ్మీ అకౌంట్స్ వేస్తున్నాం
    db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
        if (row.count === 0) {
            db.run(`INSERT INTO users (phone, password, name) VALUES ('9876543210', 'jessica123', 'Ram')`);
            db.run(`INSERT INTO payments (phone, week, amount, status, color) VALUES ('9876543210', 'Week 1', '₹1000', 'Pending', 'red')`);
            db.run(`INSERT INTO payments (phone, week, amount, status, color) VALUES ('9876543210', 'Week 2', '₹1000', 'Pending', 'red')`);
            
            db.run(`INSERT INTO users (phone, password, name) VALUES ('9998887776', 'pass123', 'Raju')`);
            db.run(`INSERT INTO payments (phone, week, amount, status, color) VALUES ('9998887776', 'Week 1', '₹2000', 'Pending', 'red')`);
        }
    });
});

// 3. కస్టమర్ లాగిన్ API
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

// 4. డ్యాష్‌బోర్డ్ డేటా పంపే API
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

// 5. అడ్మిన్ కి కస్టమర్లందరి డేటా పంపే API
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

// 6. అడ్మిన్ అప్రూవల్ చేసే API (డేటాబేస్ లో పర్మినెంట్ గా అప్‌డేట్ అవుతుంది)
app.post('/approve-payment', (req, res) => {
    const { phone, week } = req.body;
    db.run("UPDATE payments SET status = 'Paid', color = 'green' WHERE phone = ? AND week = ?", [phone, week], function(err) {
        if (err) {
            res.json({ success: false, message: "ఎర్రర్ వచ్చింది" });
        } else {
            res.json({ success: true, message: "Payment Approved!" });
        }
    });
});

app.listen(port, () => {
    console.log(`సర్వర్ రన్ అవుతోంది! బ్రౌజర్‌లో http://localhost:${port} ఓపెన్ చేయండి.`);
});