require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const Question = require('./models/Question');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error details:');
        console.error('Error Code:', err.code);
        console.error('Syscall:', err.syscall);
        console.error('Hostname:', err.hostname);
        console.error('Message:', err.message);
        console.log('\nTip: This "ECONNREFUSED" on querySrv usually means a DNS issue.');
        console.log('Try using the "Standard Connection String" (starts with mongodb://) instead of the +srv one in your .env file.');
        process.exit(1);
    }
};

connectDB();

// Routes

// 1. Upload Excel and store data
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        // Check if database is connected before proceeding
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                message: 'Database not connected', 
                error: 'The server is unable to connect to MongoDB Atlas. Please check your IP whitelist and connection string.' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload an excel file' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        if (data.length === 0) {
            return res.status(400).json({ message: 'The uploaded file is empty' });
        }

        // Map keys from Excel to match our Schema exactly (with trimming to avoid space issues)
        const formattedData = data.map(item => ({
            "Speaker Name": String(item['Speaker Name'] || "").trim(),
            "Question": String(item['Question'] || "").trim(),
            "Category": String(item['Category'] || "").trim(),
            "Short Summary": item['Short Summary'],
            "Summery": item['Summery'] || item['Summary'], // Handle both spellings
            "Detailed Points": item['Detailed Points'],
            "Source": item['Source']
        }));

        // Filter out duplicates (STRICTLY both Speaker AND Question must match)
        const finalData = [];
        const seenInBatch = new Set();
        let skipCount = 0;

        for (const item of formattedData) {
            // Skip empty rows
            if (!item["Speaker Name"] || !item["Question"]) continue;

            const batchKey = `${item["Speaker Name"]}|${item["Question"]}`;
            
            // 1. Check if already in this current batch
            if (seenInBatch.has(batchKey)) {
                skipCount++;
                console.log(`Skipping duplicate in batch: [${item["Speaker Name"]}] - ${item["Question"].substring(0, 30)}...`);
                continue;
            }

            // 2. Check if already in Database
            const exists = await Question.findOne({
                "Speaker Name": item["Speaker Name"],
                "Question": item["Question"]
            });

            if (!exists) {
                finalData.push(item);
                seenInBatch.add(batchKey);
            } else {
                skipCount++;
                console.log(`Skipping duplicate in DB: [${item["Speaker Name"]}] - ${item["Question"].substring(0, 30)}...`);
            }
        }

        if (finalData.length > 0) {
            await Question.insertMany(finalData);
        }

        res.status(201).json({
            message: finalData.length > 0 
                ? 'Data uploaded and stored successfully' 
                : 'All records were duplicates, nothing new stored',
            count: finalData.length,
            duplicatesSkipped: skipCount
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Error processing file', error: error.message });
    }
});

// 1.1 New Endpoint: Accept JSON data directly from frontend
app.post('/api/upload-json', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                message: 'Database not connected', 
                error: 'The server is unable to connect to MongoDB Atlas. Please check your IP whitelist and connection string.' 
            });
        }

        const { data } = req.body;
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ message: 'Invalid data format. Expected an array of objects.' });
        }

        // Map keys from Excel to match our Schema exactly (with trimming to avoid space issues)
        const formattedData = data.map(item => ({
            "Speaker Name": String(item['Speaker Name'] || "").trim(),
            "Question": String(item['Question'] || "").trim(),
            "Category": String(item['Category'] || "").trim(),
            "Short Summary": item['Short Summary'],
            "Summery": item['Summery'] || item['Summary'],
            "Detailed Points": item['Detailed Points'],
            "Source": item['Source']
        }));

        // Filter out duplicates (STRICTLY both Speaker AND Question must match)
        const finalData = [];
        const seenInBatch = new Set();
        let skipCount = 0;

        for (const item of formattedData) {
            // Skip empty rows
            if (!item["Speaker Name"] || !item["Question"]) continue;

            const batchKey = `${item["Speaker Name"]}|${item["Question"]}`;
            
            // 1. Check if already in this current upload batch
            if (seenInBatch.has(batchKey)) {
                skipCount++;
                console.log(`Skipping duplicate in batch: [${item["Speaker Name"]}] - ${item["Question"].substring(0, 30)}...`);
                continue;
            }

            // 2. Check if already in Database
            const exists = await Question.findOne({
                "Speaker Name": item["Speaker Name"],
                "Question": item["Question"]
            });

            if (!exists) {
                finalData.push(item);
                seenInBatch.add(batchKey);
            } else {
                skipCount++;
                console.log(`Skipping duplicate in DB: [${item["Speaker Name"]}] - ${item["Question"].substring(0, 30)}...`);
            }
        }

        if (finalData.length > 0) {
            await Question.insertMany(finalData);
        }

        res.status(201).json({
            message: finalData.length > 0 
                ? 'JSON data received and stored successfully' 
                : 'All records were duplicates, nothing new stored',
            count: finalData.length,
            duplicatesSkipped: skipCount
        });
    } catch (error) {
        console.error('JSON upload error:', error);
        res.status(500).json({ message: 'Error storing JSON data', error: error.message });
    }
});

// 2. Get data by category
app.get('/api/questions/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const questions = await Question.find({ "Category": new RegExp(`^${category}$`, 'i') });
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching questions', error: error.message });
    }
});

// 3. Get count of questions by speaker
app.get('/api/questions/count/:speaker', async (req, res) => {
    try {
        const { speaker } = req.params;
        const count = await Question.countDocuments({ "Speaker Name": new RegExp(`^${speaker}$`, 'i') });
        res.json({ speaker, questionCount: count });
    } catch (error) {
        res.status(500).json({ message: 'Error counting questions', error: error.message });
    }
});

// 3.1 Get count of questions by category
app.get('/api/questions/count/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const count = await Question.countDocuments({ "Category": new RegExp(`^${category}$`, 'i') });
        res.json({ category, questionCount: count });
    } catch (error) {
        res.status(500).json({ message: 'Error counting questions by category', error: error.message });
    }
});

// 3.2 Get overall count of all questions
app.get('/api/questions/count/total', async (req, res) => {
    try {
        const count = await Question.countDocuments({});
        res.json({ totalQuestions: count });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching total count', error: error.message });
    }
});

// 3.3 Get aggregated count for ALL categories
app.get('/api/questions/count/all-categories', async (req, res) => {
    try {
        const stats = await Question.aggregate([
            {
                $group: {
                    _id: "$Category",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Transform array into the requested format: { CategoryName: "Count", ... }
        const result = {};
        stats.forEach(item => {
            if (item._id) {
                result[item._id] = String(item.count);
            }
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching category statistics', error: error.message });
    }
});

// 4. Get all questions (optional but useful)
app.get('/api/questions', async (req, res) => {
    try {
        const questions = await Question.find();
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching all questions', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
