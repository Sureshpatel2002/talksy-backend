require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Error:', err));

app.get('/', (req, res) => res.send('API is live'));
app.use('/api/users', require('./routes/users'));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
