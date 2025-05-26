# Talksy API Documentation

## Base URL
```
https://talksy-backend-z1ta.onrender.com/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer your_jwt_token
```

## API Endpoints



### 2. User Management

#### Create/Update User Profile
```
POST /users/update
```
Request Body:
```json
{
    "uid": "user123",
    "name": "John Doe",
    "photoUrl": "https://example.com/photo.jpg",
    "email": "john@example.com",
    "bio": "Hello world!",
    "age": 25,
    "gender": "male",
    "fcmToken": "device_token",
    "status": "Available",
    "isOnline": true
}
```
Response:
```json
{
    "uid": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "photoUrl": "https://example.com/photo.jpg",
    "bio": "Hello world!",
    "isOnline": true,
    "lastSeen": "2024-03-20T10:00:00Z"
}
```

#### Get User Profile
```
GET /users/:userId/profile?requestingUserId=user123
```
Response:
```json
{
    "success": true,
    "profile": {
        "uid": "user123",
        "displayName": "John Doe",
        "photoUrl": "https://example.com/photo.jpg",
        "bio": "Hello world!",
        "isOnline": true,
        "lastSeen": "2024-03-20T10:00:00Z",
        "phoneNumber": "+1234567890",
        "email": "john@example.com",
        "address": {
            "street": "123 Main St",
            "city": "New York",
            "state": "NY",
            "country": "USA",
            "postalCode": "10001"
        },
        "socialLinks": {
            "facebook": "https://facebook.com/username",
            "twitter": "https://twitter.com/username"
        }
    }
}
```

#### Update Contact Information
```
PUT /users/:userId/contact
```
Request Body:
```json
{
    "phoneNumber": "+1234567890",
    "countryCode": "+1",
    "address": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "country": "USA",
        "postalCode": "10001"
    },
    "socialLinks": {
        "facebook": "https://facebook.com/username",
        "twitter": "https://twitter.com/username",
        "instagram": "https://instagram.com/username",
        "linkedin": "https://linkedin.com/in/username"
    }
}
```
Response:
```json
{
    "success": true,
    "message": "Contact information updated successfully",
    "user": {
        "uid": "user123",
        "phoneNumber": "+1234567890",
        "address": { ... },
        "socialLinks": { ... }
    }
}
```

#### Update Privacy Settings
```
PUT /users/:userId/privacy
```
Request Body:
```json
{
    "showPhoneNumber": true,
    "showEmail": false,
    "showAddress": false,
    "showSocialLinks": true
}
```
Response:
```json
{
    "success": true,
    "message": "Privacy settings updated successfully",
    "privacySettings": {
        "showPhoneNumber": true,
        "showEmail": false,
        "showAddress": false,
        "showSocialLinks": true
    }
}
```

### 3. Media Management

#### Upload Profile Image
```
POST /media/profile/:userId
```
Headers:
```
Authorization: Bearer your_jwt_token
Content-Type: multipart/form-data
```
Request Body (FormData):
```
image: [file]
```
Response:
```json
{
    "message": "Profile image uploaded successfully",
    "photoUrl": "https://your-bucket-name.s3.region.amazonaws.com/profile/user123.jpg"
}
```

#### Upload Status Media
```
POST /media/status/:userId
```
Headers:
```
Authorization: Bearer your_jwt_token
Content-Type: multipart/form-data
```
Request Body (FormData):
```
media: [file]
text: "Optional caption"
```
Response:
```json
{
    "message": "Status uploaded successfully",
    "status": {
        "id": "status123",
        "mediaUrl": "https://your-bucket-name.s3.region.amazonaws.com/status/status123.jpg",
        "mediaType": "image",
        "createdAt": "2024-03-20T10:00:00Z"
    }
}
```

### 4. Status Management

#### Create Status
```
POST /status/create
```
Headers:
```
Authorization: Bearer your_jwt_token
Content-Type: multipart/form-data
```
Request Body (FormData):
```
media: [file]
caption: "My status"
type: "image"
```
Response:
```json
{
    "userId": "user123",
    "status": {
        "id": "status123",
        "mediaUrl": "https://your-bucket-name.s3.region.amazonaws.com/status/status123.jpg",
        "type": "image",
        "caption": "My status",
        "createdAt": "2024-03-20T10:00:00Z"
    }
}
```

#### Get User Status
```
GET /status/:userId
```
Headers:
```
Authorization: Bearer your_jwt_token
```
Response:
```json
{
    "status": {
        "id": "status123",
        "mediaUrl": "https://your-bucket-name.s3.region.amazonaws.com/status/status123.jpg",
        "type": "image",
        "caption": "My status",
        "createdAt": "2024-03-20T10:00:00Z",
        "expiresAt": "2024-03-21T10:00:00Z"
    },
    "isExpired": false
}
```

### 5. Chat Management

#### Get Chats
```
GET /chats
```
Headers:
```
Authorization: Bearer your_jwt_token
```
Response:
```json
{
    "chats": [
        {
            "id": "chat123",
            "participants": ["user123", "user456"],
            "lastMessage": {
                "id": "msg123",
                "text": "Hello!",
                "sender": "user123",
                "timestamp": "2024-03-20T10:00:00Z"
            },
            "unreadCount": 2
        }
    ]
}
```

#### Update Chat Settings
```
PUT /chats/:chatId/settings
```
Headers:
```
Authorization: Bearer your_jwt_token
```
Request Body:
```json
{
    "muteNotifications": true,
    "theme": "dark"
}
```
Response:
```json
{
    "success": true,
    "message": "Chat settings updated successfully",
    "settings": {
        "muteNotifications": true,
        "theme": "dark"
    }
}
```

### 6. Notification Management

#### Get Notification Analytics
```
GET /notification-analytics
```
Headers:
```
Authorization: Bearer your_jwt_token
```
Query Parameters:
```
days: 30
```
Response:
```json
{
    "total": 100,
    "byType": {
        "message": 50,
        "status": 30,
        "friend_request": 20
    },
    "byTime": {
        "morning": 30,
        "afternoon": 40,
        "evening": 20,
        "night": 10
    },
    "engagement": {
        "read": 80,
        "unread": 20,
        "readPercentage": 80,
        "unreadPercentage": 20
    },
    "trends": {
        "daily": {
            "2024-03-20": 10,
            "2024-03-19": 8
        },
        "weekly": {
            "week12": 50,
            "week11": 40
        }
    }
}
```

#### Track Notification Event
```
POST /notification-analytics/track
```
Headers:
```
Authorization: Bearer your_jwt_token
```
Request Body:
```json
{
    "userId": "user123",
    "eventType": "message_received",
    "data": {
        "messageId": "msg123",
        "senderId": "user456"
    }
}
```
Response:
```json
{
    "success": true,
    "message": "Notification event tracked successfully"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
    "error": "Invalid request data",
    "message": "Detailed error message"
}
```

### 401 Unauthorized
```json
{
    "error": "Unauthorized",
    "message": "Invalid or missing authentication token"
}
```

### 403 Forbidden
```json
{
    "error": "Forbidden",
    "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
    "error": "Not Found",
    "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
    "error": "Internal Server Error",
    "message": "An unexpected error occurred"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. The current limits are:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

When rate limit is exceeded, the API returns:
```json
{
    "error": "Too Many Requests",
    "message": "Rate limit exceeded",
    "retryAfter": 60
}
```

## WebSocket Events

The API also supports real-time communication through WebSocket connections. Connect to:
```
wss://talksy-backend-z1ta.onrender.com
```

### Available Events

#### User Events
- `user:online` - User comes online
- `user:offline` - User goes offline
- `user:typing` - User is typing
- `user:profile:updated` - User profile updated

#### Chat Events
- `chat:message` - New message received
- `chat:message:read` - Message marked as read
- `chat:message:deleted` - Message deleted

#### Status Events
- `status:new` - New status created
- `status:expired` - Status expired

## Environment Variables

The following environment variables are required to run the application:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/talksy

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your_bucket_name

# Socket.IO Configuration
SOCKET_CORS_ORIGIN=http://localhost:3000
``` 