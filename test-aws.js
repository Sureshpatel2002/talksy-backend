require('dotenv').config();
const { S3Client, ListBucketsCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = require('./config');

// Log configuration (without sensitive data)
console.log('Testing AWS Configuration:');
console.log('Region:', config.aws.region);
console.log('Bucket:', config.aws.bucketName);
console.log('Has Access Key:', !!config.aws.accessKeyId);
console.log('Has Secret Key:', !!config.aws.secretAccessKey);

// Create S3 client
const s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey
    }
});

// Test functions
async function testListBuckets() {
    try {
        console.log('\nTesting ListBuckets...');
        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);
        console.log('✅ ListBuckets successful');
        console.log('Available buckets:', response.Buckets.map(b => b.Name));
        return true;
    } catch (error) {
        console.error('❌ ListBuckets failed:', error.message);
        return false;
    }
}

async function testBucketAccess() {
    try {
        console.log('\nTesting bucket access...');
        const testKey = `test-${Date.now()}.txt`;
        const testContent = 'Test content';
        
        // Try to upload a test file
        const uploadCommand = new PutObjectCommand({
            Bucket: config.aws.bucketName,
            Key: testKey,
            Body: testContent
        });
        
        await s3Client.send(uploadCommand);
        console.log('✅ Bucket access successful');
        return true;
    } catch (error) {
        console.error('❌ Bucket access failed:', error.message);
        console.error('Error details:', {
            name: error.name,
            code: error.code,
            message: error.message
        });
        return false;
    }
}

// Run tests
async function runTests() {
    console.log('\nStarting AWS configuration tests...\n');
    
    const listBucketsSuccess = await testListBuckets();
    const bucketAccessSuccess = await testBucketAccess();
    
    console.log('\nTest Results:');
    console.log('ListBuckets:', listBucketsSuccess ? '✅' : '❌');
    console.log('Bucket Access:', bucketAccessSuccess ? '✅' : '❌');
    
    if (!listBucketsSuccess || !bucketAccessSuccess) {
        console.log('\nTroubleshooting Tips:');
        console.log('1. Check if AWS credentials are correct');
        console.log('2. Verify the bucket exists in the specified region');
        console.log('3. Ensure the IAM user has the necessary permissions');
        console.log('4. Check if the bucket policy allows the required operations');
        process.exit(1);
    }
}

runTests(); 