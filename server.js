const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// --- CLOUD DATABASE SETUP (JSONBin) ---
const BIN_ID = '6a53982ada38895dfe52ba5a';
const API_KEY = '$2a$10$e2nyXRn87ZTYmmx1xTnlyO4GhxNGkZC0SCAAVKhV2vWVFQv36TgV6';
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// క్లౌడ్ నుంచి డేటా తెచ్చుకునే ఫంక్షన్
async function getDB() {
    try {
        const response = await fetch(`${BIN_URL}/latest`, {
            headers: { 'X-Master-Key': API_KEY }
        });
        const data = await response.json();
        return data.record || { customers: [], expenses: [] }; 
    } catch (error) {
        console.error("Error reading DB:", error);
        return { customers: [], expenses: [] };
    }
}

// క్లౌడ్ లోకి డేటా సేవ్ చేసే ఫంక్షన్
async function saveDB(db) {
    try {
        await fetch(BIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify(db)
        });
    } catch (error) {
        console.error("Error saving DB:", error);
    }
}

// 1. లాగిన్ సిస్టం
app.post('/api/login', async (req, res) => {
    const { userId, password } = req.body;
    
    // అడ్మిన్ లాగిన్
    if (userId === "CEO JF" && password === "JF 2026") {
        return res.json({ success: true, role: 'admin' });
    }
    
    // కస్టమర్ లాగిన్
    const db = await getDB();
    if (db.customers) {
        const customer = db.customers.find(c => c.phone === userId && c.password === password);
        if (customer) return res.json({ success: true, role: 'customer', customerData: customer });
    }
    return res.json({ success: false, message: "Invalid Details" });
});

// 2. కస్టమర్ల లిస్ట్ పంపడం
app.get('/api/customers', async (req, res) => {
    const db = await getDB();
    res.json(db.customers || []);
});

// 3. కొత్త కస్టమర్ ని యాడ్ చేయడం
app.post('/api/customers', async (req, res) => {
    const newCustomer = req.body;
    let db = await getDB();
    
    if (db.customers.find(c => c.phone === newCustomer.phone)) {
        return res.json({ success: false, message: "Phone number already exists!" });
    }
    
    // NEW FEATURES ADDED: పాతవి పోకుండా కొత్తవి సేవ్ చేస్తున్నాం
    newCustomer.customerId = 'JF-' + Math.floor(1000 + Math.random() * 9000); // Unique ID Generate
    newCustomer.village = newCustomer.village || '';
    newCustomer.address = newCustomer.address || '';
    newCustomer.aadhaar = newCustomer.aadhaar || '';
    
    newCustomer.paidWeeks = 0;
    newCustomer.penalty = 0;
    newCustomer.history = [];
    newCustomer.pendingApproval = false;
    newCustomer.referralCode = 'REF' + Math.floor(Math.random() * 90000 + 10000);
    newCustomer.startDate = new Date().toLocaleDateString('en-GB'); 

    db.customers.push(newCustomer);
    await saveDB(db);
    res.json({ success: true, message: "Account Created!" });
});

// 4. యాక్షన్స్ (Approve, Reject, Delete, Edit, Penalty)
app.post('/api/action', async (req, res) => {
    // NEW: "mode" ని కూడా తీసుకుంటున్నాం
    const { phone, action, amount, mode } = req.body; 
    let db = await getDB();
    
    // కస్టమర్ డిలీట్
    if (action === 'delete_customer') {
        db.customers = db.customers.filter(c => c.phone !== phone);
        await saveDB(db);
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
        customer.lastPaidDate = new Date().toLocaleDateString('en-GB'); 
        
        // NEW FEATURE: పేమెంట్ మోడ్ ని హిస్టరీలో సేవ్ చేయడం
        customer.history.push({
            week: customer.paidWeeks, 
            amount: customer.requestAmount || amount, 
            date: customer.lastPaidDate,
            mode: mode || 'online' // (e.g., Cash, GPay)
        });

        // SMART BUSINESS LOGIC: డబ్బులు కట్టేశాడు కాబట్టి పెనాల్టీ జీరో చేయాలి
        customer.penalty = 0; 
        
    } else if (action === 'reject_payment') {
        customer.pendingApproval = false;
        customer.requestAmount = 0;
        
    } else if (action === 'add_penalty') {
        customer.penalty += Number(amount); // పెనాల్టీ ప్లస్ అవుతుంది
        
    } else if (action === 'waive_penalty') {
        customer.penalty = 0;
        
    } else if (action === 'settle_loan') {
        customer.pendingApproval = false;
        customer.paidWeeks = Number(customer.duration); 
        customer.history.push({ week: 'SETTLED', amount: amount, date: new Date().toLocaleDateString('en-GB'), mode: mode || 'settlement' });
        customer.penalty = 0;
        
    } else if (action === 'edit_customer') {
        customer.name = req.body.editName || customer.name;
        customer.amount = req.body.editAmount || customer.amount;
        customer.duration = req.body.editDuration || customer.duration;
        customer.lastPaidDate = req.body.editLastPaid || customer.lastPaidDate || '';
        customer.nextDueDate = req.body.editNextDue || customer.nextDueDate || '';
        customer.notes = req.body.editNotes || customer.notes || '';
        
        // NEW FIELDS IN EDIT: ఎడిట్ లో కూడా ఈ డీటెయిల్స్ సేవ్ అవుతాయి
        customer.village = req.body.editVillage || customer.village || '';
        customer.address = req.body.editAddress || customer.address || '';
        customer.aadhaar = req.body.editAadhaar || customer.aadhaar || '';
    }

    await saveDB(db);
    res.json({ success: true, customerData: customer });
});

// 5. ఖర్చులు (Expenses)
app.get('/api/expenses', async (req, res) => {
    const db = await getDB();
    res.json(db.expenses || []);
});

app.post('/api/expenses', async (req, res) => {
    const { reason, amount } = req.body;
    let db = await getDB();
    if(!db.expenses) db.expenses = [];
    db.expenses.push({ id: Date.now().toString(), reason: reason, amount: Number(amount), date: new Date().toLocaleDateString('en-GB') });
    await saveDB(db);
    res.json({ success: true });
});

// సర్వర్ ఆన్
app.listen(PORT, () => {
    console.log(`🚀 Server ON: http://localhost:${PORT}`);
});