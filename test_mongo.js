require('dotenv').config();
const mongoose = require('mongoose');

console.log('Testing connection to:', process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@')); // Hide password

async function testConnection() {
    try {
        console.log('Connecting...');
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of default 30s
        });
        console.log('✅ SUCCESS: Connected to MongoDB successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ FAILED: Connection error.');
        console.error('--- Error Details ---');
        console.error('Name:', err.name);
        console.error('Message:', err.message);
        
        if (err.message.includes('IP')) {
            console.log('\nPossible Solution 1: Your IP is not whitelisted in MongoDB Atlas.');
        }
        if (err.message.includes('querySrv')) {
            console.log('\nPossible Solution 2: DNS resolution error. Your network cannot find the MongoDB server.');
        }
        
        console.log('\nChecklist:');
        console.log('1. Go to Atlas -> Network Access -> Add IP Address -> Add Current IP Address.');
        console.log('2. If you are on a public/office wifi, they might be blocking MongoDB ports.');
        console.log('3. Try using a mobile hotspot to see if it works.');
        process.exit(1);
    }
}

testConnection();
