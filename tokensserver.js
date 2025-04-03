const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.get('/api/token', (req, res) => {
    res.json({ token: process.env.GITHUB_TOKEN });
});

app.listen(2000, () => {
    console.log('Server is running on port 3000');
});