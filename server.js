const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// 1. మెయిన్ డేటాబేస్ ఫైల్
const dbPath = path.join(__dirname, 'database.json');

// 2. బ్యాకప్స్ కోసం కొత్త ఫోల్డర్ సెటప్
const backupDir = path.join(__dirname, 'Backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir); // బ్యాకప్ ఫోల్డర్ లేకపోతే కొత్తది క్రియేట్ చేస్తుంది
    console.log("📁 కొత్త Backups ఫోల్డర్ క్రియేట్ అయ్యింది.");
}

// 3. ప్యూర్ కోడింగ్ తో ఆటో-బ్యాకప్ తీసే ఫంక్షన్
function autoBackupDatabase() {
    const date = new Date();
    // తేదీని ఫార్మాట్ చేయడం (ఉదా: 09-07-2026)
    const dateString = date.toLocaleDateString('en-GB').replace(/\//g, '-'); 
    const backupPath = path.join(backupDir, `backup_${dateString}.json`);
    
    // మెయిన్ డేటాని బ్యాకప్ ఫైల్ లోకి కాపీ చేస్తుంది
    fs.copyFileSync(dbPath, backupPath);
    console.log(`💾 ఆటో-బ్యాకప్ సేవ్ అయ్యింది: backup_${dateString}.json`);
}

// స్టార్టింగ్ డేటాబేస్ క్రియేషన్
if (!fs.existsSync(dbPath)) {
    const initialData = { admin: { id: "admin", password: "admin123" }, customers: [] };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
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

    db.customers.push(newCustomer);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    
    // డేటా మారగానే ఆటోమేటిక్ గా బ్యాకప్ తీసుకుంటుంది
    autoBackupDatabase();
    
    res.json({ success: true, message: "Account Created!" });
});

// అడ్మిన్ అప్రూవ్ చేసినప్పుడు లేదా పేమెంట్ చేసినప్పుడు
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
    else if(action === 'add_penalty') {
        customer.penalty += Number(amount);
    }

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    
    // ట్రాన్సాక్షన్ జరిగిన వెంటనే ఫైల్ ని సేఫ్ గా బ్యాకప్ చేస్తుంది
    autoBackupDatabase();
    
    res.json({ success: true, customerData: customer });
});

app.delete('/api/customers/:phone', (req, res) => {
    let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    db.customers = db.customers.filter(c => c.phone !== req.params.phone);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    
    autoBackupDatabase(); // డిలీట్ చేసినప్పుడు కూడా బ్యాకప్ అప్‌డేట్ అవుతుంది
    
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`🚀 Server ON: http://localhost:${PORT}`);
    console.log(`🛡️ Auto-Backup System is Active!`);
});