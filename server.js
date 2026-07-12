const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

const dbPath = path.join(__dirname, 'database.json');
const backupDir = path.join(__dirname, 'Backups');

if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

function autoBackupDatabase() {
    const date = new Date();
    const dateString = date.toLocaleDateString('en-GB').replace(/\//g, '-'); 
    const backupPath = path.join(backupDir, `backup_${dateString}.json`);
    fs.copyFileSync(dbPath, backupPath);
}

if (!fs.existsSync(dbPath)) {
    const initialData = { admin: { id: "admin", password: "admin123" }, customers: [], expenses: [] };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
}

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
    newCustomer.startDate = new Date().toLocaleDateString('en-GB'); 

    db.customers.push(newCustomer);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    autoBackupDatabase();
    res.json({ success: true, message: "Account Created!" });
});

app.post('/api/action', (req, res) => {
    const { phone, action, amount } = req.body;
    let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Feature 6: Bug-Free Delete System
    if (action === 'delete_customer') {
        db.customers = db.customers.filter(c => c.phone !== phone);
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        autoBackupDatabase();
        return res.json({ success: true });
    }

    let customer = db.customers.find(c => c.phone === phone);
    if(!customer) return res.json({success: false});

    if(!customer.paidWeeks) customer.paidWeeks = 0;
    if(!customer.penalty) customer.penalty = 0;
    if(!customer.history) customer.history = [];

    if (action === 'request_payment') {
        customer.pendingApproval = true;
        customer.requestAmount = amount;
    } else if (action === 'approve_payment') {
        customer.pendingApproval = false;
        customer.paidWeeks += 1;
        customer.lastPaidDate = new Date().toLocaleDateString('en-GB'); // Auto set on approve
        customer.history.push({
            week: customer.paidWeeks, amount: customer.requestAmount || amount, date: customer.lastPaidDate
        });
    } else if (action === 'reject_payment') {
        customer.pendingApproval = false;
        customer.requestAmount = 0;
    } else if (action === 'add_penalty') {
        customer.penalty += Number(amount);
    } else if (action === 'waive_penalty') {
        customer.penalty = 0;
    } else if (action === 'settle_loan') {
        customer.pendingApproval = false;
        customer.paidWeeks = Number(customer.duration); 
        customer.history.push({ week: 'SETTLED', amount: amount, date: new Date().toLocaleDateString('en-GB') });
    } 
    // Features 2, 3 & 4: Master Edit System (Updates Name, Loan, Dates, Notes)
    else if (action === 'edit_customer') {
        customer.name = req.body.editName || customer.name;
        customer.amount = req.body.editAmount || customer.amount;
        customer.duration = req.body.editDuration || customer.duration;
        customer.lastPaidDate = req.body.editLastPaid || customer.lastPaidDate || '';
        customer.nextDueDate = req.body.editNextDue || customer.nextDueDate || '';
        customer.notes = req.body.editNotes || customer.notes || '';
    }

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    autoBackupDatabase();
    res.json({ success: true, customerData: customer });
});

app.get('/api/expenses', (req, res) => {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    res.json(db.expenses || []);
});

app.post('/api/expenses', (req, res) => {
    const { reason, amount } = req.body;
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    if(!db.expenses) db.expenses = [];
    db.expenses.push({ id: Date.now().toString(), reason: reason, amount: Number(amount), date: new Date().toLocaleDateString('en-GB') });
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    autoBackupDatabase();
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`🚀 Server ON: http://localhost:${PORT}`);
});