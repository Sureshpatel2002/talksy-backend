const { userService } = require('./services/s3Service.js');
require('dotenv').config();

async function addDummyUser() {
    try {
        const dummyUser = {
            name: 'Test User',
            email: 'test@example.com',
            phone: '+1234567890',
            profilePicture: 'https://via.placeholder.com/150',
            bio: 'This is a test user account',
            age: 25,
            gender: 'male',
            status: 'Hey there! I am using Talksy'
        };

        const user = await userService.createUser(dummyUser);
        console.log('Successfully created dummy user:');
        console.log(JSON.stringify(user, null, 2));
    } catch (error) {
        console.error('Error creating dummy user:', error.message);
    }
}

addDummyUser(); 