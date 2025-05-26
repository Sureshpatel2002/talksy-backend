import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
        const dbName = uriParts[1]?.split('/')[1]?.split('?')[0] || '';
        
        console.log('Protocol:', protocol);
        console.log('Host part:', hostPart);
        console.log('Database name:', dbName);
        console.log('URI starts with mongodb:// or mongodb+srv://:', 
            uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'));
        console.log('Contains @ symbol:', uri.includes('@'));
        console.log('Contains hostname:', hostPart.includes('.'));

        // Validate database name
        if (dbName !== 'flutter_app') {
            throw new Error(`Invalid database name: ${dbName}. Must use 'flutter_app' database`);
        }

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
            socketTimeoutMS: 5000,
            connectTimeoutMS: 5000,
            dbName: 'flutter_app' // Explicitly set database name
        });

        console.log('✅ MongoDB connection successful!');
        
        // Verify database name
        const currentDb = mongoose.connection.db.databaseName;
        if (currentDb !== 'flutter_app') {
            throw new Error(`Connected to wrong database: ${currentDb}. Must use 'flutter_app' database`);
        }
        console.log('Connected to database:', currentDb);
        
        // Test database access
        console.log('\n📊 Testing database access...');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));

        // Test user collection
        console.log('\n👤 Testing user collection...');
        const User = mongoose.model('User', new mongoose.Schema({
            uid: String,
            displayName: String,
            email: String
        }));

        // Test find operation
        console.log('Testing find operation...');
        const startTime = Date.now();
        const users = await User.find().limit(1);
        const endTime = Date.now();
        console.log(`Find operation took ${endTime - startTime}ms`);
        console.log('Users found:', users.length);

        // Test insert operation
        console.log('\nTesting insert operation...');
        const testUser = new User({
            uid: 'test-' + Date.now(),
            displayName: 'Test User',
            email: 'test@example.com'
        });
        const insertStartTime = Date.now();
        await testUser.save();
        const insertEndTime = Date.now();
        console.log(`Insert operation took ${insertEndTime - insertStartTime}ms`);

        // Clean up
        await mongoose.connection.close();
        console.log('\n✅ All tests passed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('\nPlease check your MONGODB_URI format. It should look like:');
        console.error('mongodb+srv://<username>:<password>@<cluster>.mongodb.net/flutter_app?retryWrites=true&w=majority');
        console.error('or');
        console.error('mongodb://<username>:<password>@<host>:<port>/flutter_app');
        process.exit(1);
    }
}

// Run the test
testMongoDBConnection(); 