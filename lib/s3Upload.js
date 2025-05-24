const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const config = require('../config');

// Configure AWS S3 client with additional options
const s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey
    },
    forcePathStyle: true, // Use path-style URLs
    signatureVersion: 'v4', // Use AWS Signature Version 4
    maxAttempts: 3, // Retry failed requests
    retryMode: 'standard'
});

// Configure multer for file upload
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: config.aws.bucketName,
        contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically detect content type
        metadata: function (req, file, cb) {
            cb(null, { 
                fieldName: file.fieldname,
                contentType: file.mimetype
            });
        },
        key: function (req, file, cb) {
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000000);
            const extension = file.originalname.split('.').pop();
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