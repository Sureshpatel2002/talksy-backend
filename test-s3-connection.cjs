const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS
AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();

async function testS3Connection() {
    try {
        // List buckets to test connection
        console.log('Testing S3 connection...');
        const buckets = await s3.listBuckets().promise();
        console.log('Successfully connected to AWS S3!');
        console.log('Available buckets:', buckets.Buckets.map(b => b.Name));

        // Test specific bucket access
        if (process.env.S3_BUCKET) {
            console.log(`\nTesting access to bucket: ${process.env.S3_BUCKET}`);
            const objects = await s3.listObjectsV2({
                Bucket: process.env.S3_BUCKET,
                MaxKeys: 1
            }).promise();
            console.log('Successfully accessed bucket!');
            console.log('First object:', objects.Contents[0]?.Key || 'No objects found');
        }

        // Test bucket CORS configuration
        console.log('\nChecking CORS configuration...');
        const cors = await s3.getBucketCors({
            Bucket: process.env.S3_BUCKET
        }).promise();
        console.log('CORS Configuration:', JSON.stringify(cors.CORSRules, null, 2));

    } catch (error) {
        console.error('Error testing S3 connection:', error.message);
        if (error.code === 'AccessDenied') {
            console.error('Access denied. Please check your AWS credentials and bucket permissions.');
        } else if (error.code === 'NoSuchBucket') {
            console.error('Bucket does not exist. Please check your S3_BUCKET environment variable.');
        }
    }
}

testS3Connection(); 