const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const meetingsRouter = require('./routes/meetings');
const chatRouter = require('./routes/chat');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/meetings', meetingsRouter);
app.use('/api/chat', chatRouter);

app.get('/', (req, res) => {
  res.send('MindLedger Backend is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
