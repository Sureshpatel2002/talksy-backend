import express from 'express';
import mongoose from 'mongoose';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import config from '../config.js';

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
    console.log('Health check endpoint called');
    
    const health = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
        services: {
            mongodb: {
                status: 'unknown',
                message: ''
            },
            aws: {
                status: 'unknown',
                message: ''
            }
        }
    };

    try {
        console.log('Checking MongoDB connection...');
        // Check MongoDB connection
        if (mongoose.connection.readyState === 1) {
            health.services.mongodb.status = 'healthy';
            health.services.mongodb.message = 'Connected to MongoDB';
            
            // Test database access
            const collections = await mongoose.connection.db.listCollections().toArray();
            health.services.mongodb.collections = collections.map(c => c.name);
            console.log('MongoDB collections:', health.services.mongodb.collections);
        } else {
            health.services.mongodb.status = 'unhealthy';
            health.services.mongodb.message = 'MongoDB not connected';
            console.log('MongoDB not connected. ReadyState:', mongoose.connection.readyState);
        }

        console.log('Checking AWS S3 connection...');
        // Check AWS S3 connection
        try {
            const s3Client = new S3Client({
                region: config.aws.region,
                credentials: {
                    accessKeyId: config.aws.accessKeyId,
                    secretAccessKey: config.aws.secretAccessKey
                }
            });

            const command = new ListBucketsCommand({});
            await s3Client.send(command);
            
            health.services.aws.status = 'healthy';
            health.services.aws.message = 'AWS S3 connection successful';
            console.log('AWS S3 connection successful');
        } catch (error) {
            health.services.aws.status = 'unhealthy';
            health.services.aws.message = `AWS S3 error: ${error.message}`;
            console.error('AWS S3 connection error:', error.message);
        }

        // Set overall status
        const allHealthy = Object.values(health.services).every(service => service.status === 'healthy');
        health.status = allHealthy ? 'healthy' : 'unhealthy';
        console.log('Overall health status:', health.status);

        // Send response
        console.log('Sending health check response:', health);
        res.status(allHealthy ? 200 : 503).json(health);
    } catch (error) {
        console.error('Health check error:', error);
        health.status = 'unhealthy';
        health.error = error.message;
        res.status(503).json(health);
    }
});

export default router; 