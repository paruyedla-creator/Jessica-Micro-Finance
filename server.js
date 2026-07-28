const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; 

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// --- CLOUD DATABASE SETUP (JSONBin) ---
// 🔥 మన లేటెస్ట్ మల్టీ-లోన్ డేటాబేస్ కీస్ (HTML కి మ్యాచ్ అయ్యేలా)
const BIN_ID = '6a680db5da38895dfe99644c';
const API_KEY = '$2a$10$hMjC2hJpy4MR4jrFYBGrMeX.3m5olpdY3LgNetbTgdcex3JgQItg6';
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// క్లౌడ్ నుంచి డేటా తెచ్చుకునే ఫంక్షన్ (Direct Array Format)
async function getDB() {
    try {
        const response = await fetch(`${BIN_URL}/latest`, {
            headers: { 'X-Master-Key': API_KEY }
        });
        const data = await response.json();
        return data.record || []; // ఇప్పుడు డైరెక్ట్ గా కస్టమర్ల array వస్తుంది
    } catch (error) {
        console.error("Error reading DB:", error);
        return [];
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
    
    // కస్టమర్ లాగిన్ (నెంబర్ చివర స్పేస్ పడ్డా లాగిన్ అవ్వడానికి trim వాడాం)
    const db = await getDB();
    const customerLoans = db.filter(c => String(c.phone).trim() === String(userId).trim() && String(c.password).trim() === String(password).trim());
    
    if (customerLoans.length > 0) {
        return res.json({ success: true, role: 'customer', customerData: customerLoans });
    }
    return res.json({ success: false, message: "Invalid Details" });
});

// 2. కస్టమర్ల లిస్ట్ పంపడం
app.get('/api/customers', async (req, res) => {
    const db = await getDB();
    res.json(db || []);
});

// 3. కొత్త కస్టమర్ ని యాడ్ చేయడం (మల్టీ-లోన్ కి సపోర్ట్)
app.post('/api/customers', async (req, res) => {
    const newCustomer = req.body;
    let db = await getDB();
    
    // 🔥 పాత కోడ్ లో ఉన్న "Phone number exists" రూల్ తీసేశాను (ఒకే నెంబర్ కి 3 లోన్స్ ఇవ్వొచ్చు)
    
    newCustomer.accId = 'JF-' + Math.floor(1000 + Math.random() * 9000); 
    newCustomer.village = newCustomer.village || '';
    newCustomer.aadhaar = newCustomer.aadhaar || '';
    newCustomer.guarantor = newCustomer.guarantor || ''; 
    newCustomer.security = newCustomer.security || ''; 
    newCustomer.notes = newCustomer.notes || '';
    
    newCustomer.paidWeeks = 0;
    newCustomer.penalty = 0;
    newCustomer.history = [];
    newCustomer.pendingApproval = false;
    newCustomer.paymentSuccessFlag = false; 
    newCustomer.startDate = new Date().toLocaleDateString('en-GB'); 

    db.push(newCustomer);
    await saveDB(db);
    res.json({ success: true, message: "Loan Account Created Successfully!" });
});

// 4. యాక్షన్స్ (ఇకపై ఫోన్ నెంబర్ తో కాకుండా, పక్కాగా accId తో సెట్ చేశాను)
app.post('/api/action', async (req, res) => {
    const { accId, action, amount, mode, utr } = req.body; 
    let db = await getDB();
    
    // కస్టమర్ లోన్ డిలీట్
    if (action === 'delete_customer') {
        db = db.filter(c => c.accId !== accId);
        await saveDB(db);
        return res.json({ success: true });
    }

    // పర్ఫెక్ట్ గా ఏ లోన్ కి ఆ లోన్ (JF-0000) పట్టుకోవడానికి 
    let customer = db.find(c => c.accId === accId);
    if(!customer) return res.json({success: false, message: "Account Not Found"});

    if(!customer.paidWeeks) customer.paidWeeks = 0;
    if(!customer.penalty) customer.penalty = 0;
    if(!customer.history) customer.history = [];

    // కస్టమర్ యాప్ నుండి పేమెంట్ రిక్వెస్ట్ వస్తే
    if (action === 'request_payment') {
        customer.pendingApproval = true;
        customer.paymentSuccessFlag = false;
        
    // అడ్మిన్ APPROVE చేసినప్పుడు (Date, Mode తో సహా సేవ్ అవ్వడానికి)
    } else if (action === 'approve_payment' || action === 'record_payment') {
        customer.pendingApproval = false;
        customer.paidWeeks += 1;
        customer.lastPaidDate = new Date().toLocaleDateString('en-GB'); 
        
        // హిస్టరీ (Passbook) లో సేవ్ చేయడం
        customer.history.push({
            week: customer.paidWeeks, 
            amount: Number(amount), 
            date: customer.lastPaidDate,
            mode: mode || 'Cash'
        });

        customer.penalty = 0; // కట్టగానే పెనాల్టీ జీరో
        customer.paymentSuccessFlag = true; 
        
    // అడ్మిన్ రిజెక్ట్ చేస్తే
    } else if (action === 'reject_payment') {
        customer.pendingApproval = false;
        
    // పెనాల్టీలు వేయడానికి / తీసేయడానికి
    } else if (action === 'add_penalty') {
        customer.penalty += Number(amount); 
    } else if (action === 'waive_penalty') {
        customer.penalty = 0; 
        
    // లోన్ సెటిల్మెంట్ కోసం
    } else if (action === 'settle_loan') {
        customer.pendingApproval = false;
        customer.paidWeeks = Number(customer.duration); 
        customer.history.push({ 
            week: 'Settle', 
            amount: Number(amount), 
            date: new Date().toLocaleDateString('en-GB'), 
            mode: 'Settlement' 
        });
        customer.amount = 0;
        customer.penalty = 0;
        
    // లోన్ డీటెయిల్స్ అన్నీ ఎడిట్ చేయడానికి
    } else if (action === 'edit_customer') {
        customer.name = req.body.editName || customer.name;
        customer.phone = req.body.editPhone || customer.phone;
        customer.password = req.body.editPass || customer.password;
        customer.amount = Number(req.body.editAmount) || customer.amount;
        customer.duration = Number(req.body.editDuration) || customer.duration;
        customer.village = req.body.editVillage || customer.village;
        customer.aadhaar = req.body.editAadhaar || customer.aadhaar;
        customer.guarantor = req.body.editGuarantor || customer.guarantor;
        customer.notes = req.body.editNotes || customer.notes;
        customer.startDate = req.body.editStartDate || customer.startDate;
        customer.lastPaidDate = req.body.editLastPaid || customer.lastPaidDate;
    }

    await saveDB(db);
    res.json({ success: true, customerData: customer });
});

// సర్వర్ ఆన్
app.listen(PORT, () => {
    console.log(`🚀 Jessica Finance Backend Server is ONLINE: http://localhost:${PORT}`);
});