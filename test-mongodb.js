require('dotenv').config();
const mongoose = require('mongoose');

async function testMongoDBConnection() {
    try {
        // Get the MongoDB URI
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error('❌ MONGODB_URI is not defined in environment variables');
            process.exit(1);
        }

        // Log URI format (without sensitive data)
        console.log('\n🔍 MongoDB URI Format Check:');
        const uriParts = uri.split('@');
        const protocol = uriParts[0].split('://')[0];
        const hostPart = uriParts[1]?.split('/')[0] || '';
        
        console.log('Protocol:', protocol);
        console.log('Host part:', hostPart);
        console.log('URI starts with mongodb:// or mongodb+srv://:', 
            uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'));
        console.log('Contains @ symbol:', uri.includes('@'));
        console.log('Contains hostname:', hostPart.includes('.'));

        // Validate URI format
        if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
            throw new Error('Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
        }

        if (!uri.includes('@')) {
            throw new Error('Invalid MongoDB URI format. Must include username and password');
        }

        if (!hostPart.includes('.')) {
            throw new Error('Invalid MongoDB URI format. Must include a valid hostname with domain');
        }

        // Test connection
        console.log('\n🔄 Testing MongoDB connection...');
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
        });

        console.log('✅ MongoDB connection successful!');
        
        // Test database access
        console.log('\n📊 Testing database access...');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));

        // Clean up
        await mongoose.connection.close();
        console.log('\n✅ All tests passed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('\nPlease check your MONGODB_URI format. It should look like:');
        console.error('mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority');
        console.error('or');
        console.error('mongodb://<username>:<password>@<host>:<port>/<database>');
        process.exit(1);
    }
}

// Run the test
testMongoDBConnection(); 