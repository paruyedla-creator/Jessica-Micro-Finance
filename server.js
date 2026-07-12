const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
// Feature 9: Render Live Support (PORT ఆటోమేటిక్ సెట్టింగ్)
const PORT = process.env.PORT || 3000; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// 1. మెయిన్ డేటాబేస్ ఫైల్
const dbPath = path.join(__dirname, 'database.json');

// 2. బ్యాకప్స్ కోసం కొత్త ఫోల్డర్ సెటప్
const backupDir = path.join(__dirname, 'Backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
    console.log("📁 కొత్త Backups ఫోల్డర్ క్రియేట్ అయ్యింది.");
}

// 3. ఆటో-బ్యాకప్ తీసే ఫంక్షన్
function autoBackupDatabase() {
    const date = new Date();
    const dateString = date.toLocaleDateString('en-GB').replace(/\//g, '-'); 
    const backupPath = path.join(backupDir, `backup_${dateString}.json`);
    fs.copyFileSync(dbPath, backupPath);
    console.log(`💾 ఆటో-బ్యాకప్ సేవ్ అయ్యింది: backup_${dateString}.json`);
}

// స్టార్టింగ్ డేటాబేస్ క్రియేషన్ & Feature 8: పాత డేటా అప్‌గ్రేడ్
if (!fs.existsSync(dbPath)) {
    // Feature 4: Expenses అరే యాడ్ చేశాను
    const initialData = { admin: { id: "admin", password: "admin123" }, customers: [], expenses: [] };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
} else {
    // పాత ఫైల్ ఉంటే, దానికి expenses యాడ్ అయ్యేలా సెక్యూరిటీ
    let existingData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    if (!existingData.expenses) {
        existingData.expenses = [];
        fs.writeFileSync(dbPath, JSON.stringify(existingData, null, 2));
    }
}

// --- API ROUTES ---

app.post('/api/login', (req, res) => {
    const { userId, password } = req.body;
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    if (userId === db.admin.id && password === db.admin.password) return res.json({ success: true, role: 'admin' });
    
    const customer = db.customers.find(c => c.phone === userId && c.password === password);
    if (customer) return res.json({ success: true, role: 'customer', customerData: customer });

    return res.json({ success: false, message: "Invalid Details" });
});

app.get('/api/customers', (req, res) => {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    res.json(db.customers);
});

// కస్టమర్ ని యాడ్ చేసినప్పుడు
app.post('/api/customers', (req, res) => {
    const newCustomer = req.body;
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    if (db.customers.find(c => c.phone === newCustomer.phone)) {
        return res.json({ success: false, message: "Phone number already exists!" });
    }
    
    newCustomer.paidWeeks = 0;
    newCustomer.penalty = 0;
    newCustomer.history = [];
    newCustomer.pendingApproval = false;
    newCustomer.referralCode = 'REF' + Math.floor(Math.random() * 90000 + 10000);
    // Feature 7: లోన్ మొదలైన తేదీ సేవ్ అవుతుంది (డ్యూ డేట్స్ కోసం)
    newCustomer.startDate = new Date().toLocaleDateString('en-GB'); 

    db.customers.push(newCustomer);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    
    autoBackupDatabase();
    res.json({ success: true, message: "Account Created!" });
});

// అడ్మిన్ కంట్రోల్స్ (అప్రూవ్, రిజెక్ట్, సెటిల్, పెనాల్టీ)
app.post('/api/action', (req, res) => {
    const { phone, action, amount } = req.body;
    let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    let customer = db.customers.find(c => c.phone === phone);

    if(!customer) return res.json({success: false});

    if(!customer.paidWeeks) customer.paidWeeks = 0;
    if(!customer.penalty) customer.penalty = 0;
    if(!customer.history) customer.history = [];

    if(action === 'request_payment') {
        customer.pendingApproval = true;
        customer.requestAmount = amount;
    } 
    else if(action === 'approve_payment') {
        customer.pendingApproval = false;
        customer.paidWeeks += 1;
        customer.history.push({
            week: customer.paidWeeks,
            amount: customer.requestAmount || amount,
            date: new Date().toLocaleDateString('en-GB')
        });
    } 
    // Feature 2: ఫేక్ పేమెంట్ రిజెక్ట్
    else if(action === 'reject_payment') {
        customer.pendingApproval = false;
        customer.requestAmount = 0;
    }
    else if(action === 'add_penalty') {
        customer.penalty += Number(amount);
    }
    // Feature 3: పెనాల్టీ జీరో చేయడం (Waive Penalty)
    else if(action === 'waive_penalty') {
        customer.penalty = 0;
    }
    // Feature 1: ఒకేసారి లోన్ మొత్తం సెటిల్ చేయడం
    else if(action === 'settle_loan') {
        customer.pendingApproval = false;
        customer.paidWeeks = Number(customer.duration); // కట్టాల్సిన వారాలన్నీ కట్టేసినట్లుగా
        customer.history.push({
            week: 'SETTLED',
            amount: amount, // ఎంతకు మాట్లాడుకుని సెటిల్ చేశారో ఆ అమౌంట్
            date: new Date().toLocaleDateString('en-GB')
        });
    }

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    autoBackupDatabase();
    res.json({ success: true, customerData: customer });
});

app.delete('/api/customers/:phone', (req, res) => {
    let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    db.customers = db.customers.filter(c => c.phone !== req.params.phone);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    autoBackupDatabase(); 
    res.json({ success: true });
});

// --- NEW EXPENSE TRACKER APIs (Features 5 & 6) ---

// ఖర్చులు చూడటానికి
app.get('/api/expenses', (req, res) => {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    res.json(db.expenses || []);
});

// కొత్త ఖర్చు యాడ్ చేయడానికి
app.post('/api/expenses', (req, res) => {
    const { reason, amount } = req.body;
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    if(!db.expenses) db.expenses = [];
    db.expenses.push({
        id: Date.now().toString(),
        reason: reason,
        amount: Number(amount),
        date: new Date().toLocaleDateString('en-GB')
    });

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    autoBackupDatabase();
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`🚀 Server ON: http://localhost:${PORT}`);
    console.log(`🛡️ Auto-Backup System is Active!`);
});