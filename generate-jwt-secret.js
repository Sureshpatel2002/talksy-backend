const crypto = require('crypto');

// Generate a random 64-byte hex string
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('Generated JWT Secret:');
console.log(jwtSecret); 