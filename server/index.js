const express = require('express');
const cors = require('cors');
const csv = require('csvtojson');
const path = require('path');

const app = express();
const port = 3000;

// Enable CORS so frontend can access backend
app.use(cors());

// Endpoint to test server
app.get('/', (req, res) => {
    res.send("Hello World");
});

// Endpoint to serve invoice data from CSV
app.get('/api/invoices', async (req, res) => {
    try {
        // Path to your CSV file (put your CSV in the same folder for now)
        const csvFilePath = path.join(__dirname, 'cleaned_invoices.csv');
        
        // Parse CSV to JSON
        const invoices = await csv().fromFile(csvFilePath);

        // You can clean/process data here if needed

        res.json(invoices);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load invoice data' });
    }
});

app.listen(port, () => {
    console.log(`Server is online at http://localhost:${port}`);
});
