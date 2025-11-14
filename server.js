const express = require('express');
const path = require('path');
const feedHandler = require('./api/feed');
const descriptionsHandler = require('./api/descriptions');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('.'));

// API endpoints
app.get('/api/feed', feedHandler);
app.get('/api/descriptions', descriptionsHandler);

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Homepage server running at http://localhost:${PORT}`);
});
