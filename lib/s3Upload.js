const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const config = require('../config');
const { ListBucketsCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Log AWS configuration (without sensitive data)
console.log('AWS Configuration:', {
    region: config.aws.region,
    bucketName: config.aws.bucketName,
    hasAccessKey: !!config.aws.accessKeyId,
    hasSecretKey: !!config.aws.secretAccessKey
});

// Configure AWS S3 client with specific bucket settings
const s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey
    },
    forcePathStyle: true,
    signatureVersion: 'v4',
    maxAttempts: 3,
    retryMode: 'standard'
});

// Add debug logging for AWS credentials
console.log('AWS Credentials Check:', {
    region: config.aws.region,
    accessKeyId: config.aws.accessKeyId ? 'Present' : 'Missing',
    secretAccessKey: config.aws.secretAccessKey ? 'Present' : 'Missing',
    bucketName: config.aws.bucketName
});

// Test S3 connection
const testS3Connection = async () => {
    try {
        console.log('Testing S3 connection with config:', {
            region: config.aws.region,
            bucketName: config.aws.bucketName,
            hasAccessKey: !!config.aws.accessKeyId,
            hasSecretKey: !!config.aws.secretAccessKey
        });

        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);
        console.log('✅ S3 Connection Test Successful');
        console.log('Available buckets:', response.Buckets.map(b => b.Name));
        
        // Test bucket access
        try {
            const bucketName = config.aws.bucketName;
            console.log(`Testing access to bucket: ${bucketName}`);
            // Add a test object to verify write permissions
            const testKey = `uploads/test-${Date.now()}.txt`;
            const testContent = 'Test file for S3 access verification';
            
            const putObjectCommand = new PutObjectCommand({
                Bucket: bucketName,
                Key: testKey,
                Body: testContent,
                ContentType: 'text/plain',
                ACL: 'public-read'
            });
            
            await s3Client.send(putObjectCommand);
            console.log('✅ Successfully wrote test file to bucket');
            
            // Clean up test file
            const deleteObjectCommand = new DeleteObjectCommand({
                Bucket: bucketName,
                Key: testKey
            });
            await s3Client.send(deleteObjectCommand);
            console.log('✅ Successfully cleaned up test file');
        } catch (bucketError) {
            console.error('❌ Bucket access test failed:', bucketError.message);
            console.error('Error details:', {
                name: bucketError.name,
                code: bucketError.code,
                message: bucketError.message,
                stack: bucketError.stack
            });
        }
    } catch (error) {
        console.error('❌ S3 Connection Test Failed:', error.message);
        console.error('Error details:', {
            name: error.name,
            code: error.code,
            message: error.message,
            stack: error.stack
        });
    }
};

// Run connection test
testS3Connection();

// Configure multer for file upload
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: config.aws.bucketName,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        metadata: function (req, file, cb) {
            console.log('Uploading file:', {
                fieldname: file.fieldname,
                mimetype: file.mimetype,
                size: file.size
            });
            cb(null, { 
                fieldName: file.fieldname,
                contentType: file.mimetype
            });
        },
        key: function (req, file, cb) {
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000000);
            const extension = file.originalname.split('.').pop().toLowerCase();
            const key = `uploads/${timestamp}-${random}.${extension}`;
            console.log('Generated S3 key:', key);
            cb(null, key);
        }
    }),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Accept images and videos only
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images and videos are allowed!'), false);
        }
    }
});

// Export the multer middleware
module.exports = {
    upload,
    s3Client
}; 