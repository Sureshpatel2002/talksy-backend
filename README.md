# Talksy Backend API Documentation

## Base URLs

### API Base URL
```
https://api.talksy.app/api
```

### S3 Base URL
```
https://talksy-bucket.s3.amazonaws.com
```

### CloudFront Distribution URL (if configured)
```
https://d1234abcd.cloudfront.net
```

## AWS S3 Configuration
- **Bucket Name**: talksy-bucket
- **Region**: us-east-1
- **Access**: Private with CloudFront distribution
- **CORS Configuration**:
```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedOrigins": ["https://talksy.app"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
```

## Deployment
The API is deployed on AWS using the following services:
- **EC2**: Application server
- **RDS**: Database
- **S3**: File storage
- **CloudFront**: CDN for static assets
- **Route 53**: DNS management
- **ACM**: SSL/TLS certificates

## AWS Configuration
Required AWS environment variables:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET=your_s3_bucket_name
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## API Endpoints

### Users

#### Create User
```http
POST /users
Content-Type: application/json

{
    "displayName": "John Doe",
    "email": "john@example.com"
}
```
Response:
```json
{
    "status": "success",
    "data": {
        "id": "123456789",
        "displayName": "John Doe",
        "email": "john@example.com",
        "deviceTokens": [],
        "notificationSettings": {
            "pushEnabled": true,
            "emailEnabled": true,
            "soundEnabled": true
        },
        "createdAt": "2024-03-20T10:00:00.000Z",
        "updatedAt": "2024-03-20T10:00:00.000Z"
    }
}
```

#### Register Device Token
```http
POST /users/device-tokens
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
    "token": "YOUR_FCM_TOKEN"
}
```
Response:
```json
{
    "status": "success",
    "data": {
        "id": "123456789",
        "deviceTokens": ["YOUR_FCM_TOKEN"],
        "updatedAt": "2024-03-20T10:00:00.000Z"
    }
}
```

#### Update Notification Settings
```http
PUT /users/notification-settings
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
    "pushEnabled": true,
    "emailEnabled": false,
    "soundEnabled": true
}
```
Response:
```json
{
    "status": "success",
    "data": {
        "id": "123456789",
        "notificationSettings": {
            "pushEnabled": true,
            "emailEnabled": false,
            "soundEnabled": true
        },
        "updatedAt": "2024-03-20T10:00:00.000Z"
    }
}
```

### Conversations

#### Create Conversation
```http
POST /conversations
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
    "participants": ["user1_id", "user2_id"]
}
```
Response:
```json
{
    "status": "success",
    "data": {
        "id": "conv_123456",
        "participants": ["user1_id", "user2_id"],
        "createdAt": "2024-03-20T10:00:00.000Z",
        "updatedAt": "2024-03-20T10:00:00.000Z"
    }
}
```

#### Send Message
```http
POST /conversations/:conversationId/messages
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
    "content": "Hello, how are you?",
    "type": "text"
}
```
Response:
```json
{
    "status": "success",
    "data": {
        "id": "msg_123456",
        "conversationId": "conv_123456",
        "senderId": "user1_id",
        "content": "Hello, how are you?",
        "type": "text",
        "createdAt": "2024-03-20T10:00:00.000Z"
    }
}
```

### Notifications

#### Send Test Notification
```http
POST /test/test
Content-Type: application/json

{
    "userId": "user_id",
    "title": "Test Notification",
    "body": "This is a test notification"
}
```
Response:
```json
{
    "status": "success",
    "data": {
        "successCount": 1,
        "failureCount": 0,
        "responses": [
            {
                "messageId": "msg_123456",
                "success": true
            }
        ]
    }
}
```

## Notification Types

The system supports the following notification types:

1. **Message Notifications**
   - Triggered when a user receives a new message
   - Type: `message`

2. **Status Notifications**
   - Triggered when a followed user posts a new status
   - Type: `status`

3. **Group Message Notifications**
   - Triggered when a new message is sent in a group chat
   - Type: `group_message`

4. **Mention Notifications**
   - Triggered when a user is mentioned in a message
   - Type: `mention`

## Notification Payload Structure

All notifications include:
```json
{
    "title": "Notification Title",
    "body": "Notification Body",
    "type": "notification_type",
    "data": {
        // Additional data specific to the notification type
    }
}
```

## Error Responses

All endpoints return errors in the following format:
```json
{
    "status": "error",
    "message": "Error description"
}
```

Common HTTP Status Codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET=your_s3_bucket_name
```

3. Place your Firebase service account file in the project root:
```
talksy-fe0a6-firebase-adminsdk-fbsvc-b886059a6c.json
```

4. Start the server:
```bash
node server.js
```

## Deployment Instructions

1. **EC2 Setup**
   - Launch an EC2 instance (t2.micro or larger)
   - Configure security groups for ports 80, 443, and 3000
   - Install Node.js and npm

2. **RDS Setup**
   - Create a PostgreSQL RDS instance
   - Configure security groups to allow EC2 access
   - Update database connection string in `.env`

3. **S3 Setup**
   - Create an S3 bucket for file storage
   - Configure CORS and bucket policies
   - Update S3_BUCKET in `.env`

4. **Deploy Application**
   ```bash
   # SSH into EC2
   ssh -i your-key.pem ec2-user@your-ec2-ip

   # Clone repository
   git clone https://github.com/your-repo/talksy-backend.git
   cd talksy-backend

   # Install dependencies
   npm install

   # Set up environment variables
   nano .env

   # Start server with PM2
   npm install -g pm2
   pm2 start server.js
   pm2 save
   ```

5. **Set up Nginx as reverse proxy**
   ```nginx
   server {
       listen 80;
       server_name api.talksy.app;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **Set up SSL with Let's Encrypt**
   ```bash
   sudo certbot --nginx -d api.talksy.app
   ```

## Testing

You can test the API using PowerShell:

1. Create a user:
```powershell
$body = @{
    "displayName" = "Test User"
    "email" = "test@example.com"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "https://api.talksy.app/api/users" -Headers @{"Content-Type" = "application/json"} -Body $body
```

2. Send a test notification:
```powershell
$body = @{
    "userId" = "USER_ID"
    "title" = "Test Notification"
    "body" = "This is a test notification"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "https://api.talksy.app/api/test/test" -Headers @{"Content-Type" = "application/json"} -Body $body
``` 