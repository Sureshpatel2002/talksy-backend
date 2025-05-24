const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const config = require('../config');
const { ListBucketsCommand } = require('@aws-sdk/client-s3');

// Log AWS configuration (without sensitive data)
console.log('AWS Configuration:', {
    region: config.aws.region,
    bucketName: config.aws.bucketName,
    hasAccessKey: !!config.aws.accessKeyId,
    hasSecretKey: !!config.aws.secretAccessKey
});

// Configure AWS S3 client with additional options
const s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey
    },
    forcePathStyle: true,
    signatureVersion: 'v4',
    maxAttempts: 3,
    retryMode: 'standard',
    // Add these options to ensure consistent signature generation
    endpoint: `https://s3.${config.aws.region}.amazonaws.com`,
    useAccelerateEndpoint: false,
    useDualstackEndpoint: false,
    useArnRegion: false
});

// Test S3 connection
const testS3Connection = async () => {
    try {
        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);
        console.log('✅ S3 Connection Test Successful');
        console.log('Available buckets:', response.Buckets.map(b => b.Name));
    } catch (error) {
        console.error('❌ S3 Connection Test Failed:', error.message);
        console.error('Error details:', {
            name: error.name,
            code: error.code,
            message: error.message
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
        metadata: function (req, file, cb) {
            cb(null, { 
                fieldName: file.fieldname,
                contentType: file.mimetype
            });
        },
        key: function (req, file, cb) {
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000000);
            const extension = file.originalname.split('.').pop().toLowerCase();
            cb(null, `uploads/${timestamp}-${random}.${extension}`);
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