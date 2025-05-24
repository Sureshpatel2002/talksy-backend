const User = require('../models/user');

const auth = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Authentication error' });
  }
};

module.exports = auth; 