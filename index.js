const express = require('express');
const app = express();
const port = 3000;

// Import telegram bot
require('./telegram');

// Route cơ bản để kiểm tra
app.get('/', (req, res) => {
    res.send('Telegram bot đang chạy!');
});

// Khởi chạy server
app.listen(port, () => {
    console.log(`Server bot trade forex running http://localhost:${port}`);
});