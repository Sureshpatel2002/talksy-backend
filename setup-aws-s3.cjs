const { S3Client, CreateBucketCommand, PutBucketCorsCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function setupS3() {
    try {
        // Create bucket if it doesn't exist
        console.log('Creating S3 bucket...');
        const createBucketCommand = new CreateBucketCommand({
            Bucket: process.env.S3_BUCKET,
            // Only include LocationConstraint if not us-east-1
            ...(process.env.AWS_REGION !== 'us-east-1' && {
                CreateBucketConfiguration: {
                    LocationConstraint: process.env.AWS_REGION
                }
            })
        });

        try {
            await s3Client.send(createBucketCommand);
            console.log('Bucket created successfully!');
        } catch (error) {
            if (error.name === 'BucketAlreadyOwnedByYou') {
                console.log('Bucket already exists and is owned by you.');
            } else {
                throw error;
            }
        }

        // Configure CORS
        console.log('Configuring CORS...');
        const corsCommand = new PutBucketCorsCommand({
            Bucket: process.env.S3_BUCKET,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ['*'],
                        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                        AllowedOrigins: ['*'],
                        ExposeHeaders: []
                    }
                ]
            }
        });

        await s3Client.send(corsCommand);
        console.log('CORS configured successfully!');

        // Create initial users.json file
        console.log('Creating initial users.json file...');
        const putObjectCommand = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: 'users.json',
            Body: JSON.stringify([]),
            ContentType: 'application/json'
        });

        await s3Client.send(putObjectCommand);
        console.log('Initial users.json file created successfully!');

        console.log('AWS S3 setup completed successfully!');
    } catch (error) {
        console.error('Error setting up AWS S3:', error.message);
        if (error.name === 'AccessDenied') {
            console.error('Access denied. Please check your AWS credentials and permissions.');
        }
    }
}

setupS3(); 