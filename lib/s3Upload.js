import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import config from '../config.js';

// Initialize S3 client
const s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey
    }
});

// Configure multer for S3 upload
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: config.aws.bucketName,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
        }
    }),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images and videos
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and videos are allowed.'));
        }
    }
});

// Test S3 connection
const testS3Connection = async () => {
    try {
        await s3Client.send(new ListBucketsCommand({}));
        return true;
    } catch (error) {
        console.error('S3 connection test failed:', error);
        return false;
    }
};

// Get S3 bucket URL
const getBucketUrl = () => {
    return `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com`;
};

export { upload, s3Client, testS3Connection, getBucketUrl }; 