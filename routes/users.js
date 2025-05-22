const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.post('/update', async (req, res) => {
  const { uid, name, photoUrl, email, bio, age, gender } = req.body;
  try {
    await User.updateOne(
      { uid },
      { $set: { name, photoUrl, email, bio, age, gender } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
