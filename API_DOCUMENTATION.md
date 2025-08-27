# Talksy Backend API Documentation

## Base URLs

### API Base URL
```
https://talksy-media-bucket.s3.amazonaws.com
```

### S3 Base URL
```
https://talksy-media-bucket.s3.amazonaws.com
```

### Media Base URL
```
https://talksy-media-bucket.s3.amazonaws.com
```

## Data Models



S3 Base URL: https://talksy-media-bucket.s3.amazonaws.com




### User Model
```typescript
interface User {
    // Primary Key
    uid: string;                    // Unique identifier for the user
    
    // Profile Information
    displayName: string;            // User's display name
    email: string;                  // User's email address
    phone: string;                  // User's phone number
    photoUrl: string;               // URL to profile picture in S3
    bio: string;                    // User's biography
    age: number;                    // User's age
    gender: 'male' | 'female' | 'other';  // User's gender
    
    // Status Information
    status: string;                 // Current status message
    isOnline: boolean;              // Online status
    lastSeen: string;               // ISO timestamp of last seen
    
    // Settings
    notificationSettings: {
        pushEnabled: boolean;       // Push notification preference
        emailEnabled: boolean;      // Email notification preference
        soundEnabled: boolean;      // Sound notification preference
    };
    
    // Metadata
    createdAt: string;              // ISO timestamp of account creation
    updatedAt: string;              // ISO timestamp of last update
    deviceTokens: string[];         // List of registered device tokens
}
```

### Message Model
```typescript
interface Message {
    // Primary Key
    messageId: string;              // Unique identifier for the message
    conversationId: string;         // ID of the conversation
    
    // Message Content
    senderId: string;               // ID of the sender
    content: string;                // Message content
    type: 'text' | 'image' | 'video' | 'file' | 'audio';  // Message type
    mediaUrl?: string;              // URL to media in S3 (if any)
    
    // Message Status
    isRead: boolean;                // Read status
    isDelivered: boolean;           // Delivery status
    isEdited: boolean;              // Edit status
    editedAt?: string;              // ISO timestamp of last edit
    
    // Metadata
    timestamp: string;              // ISO timestamp of message
    replyTo?: string;               // ID of message being replied to
    reactions: {                    // Message reactions
        [userId: string]: string;   // User ID to reaction emoji
    };
}
```

### Conversation Model
```typescript
interface Conversation {
    // Primary Key
    conversationId: string;         // Unique identifier for the conversation
    participantId: string;          // ID of the participant (for GSI)
    
    // Participants
    participants: string[];         // Array of user IDs
    adminId: string;                // ID of the conversation admin
    
    // Conversation Info
    name?: string;                  // Group name (if group chat)
    photoUrl?: string;              // Group photo URL (if group chat)
    type: 'direct' | 'group';       // Conversation type
    
    // Last Message
    lastMessage: {
        messageId: string;          // ID of the last message
        content: string;            // Content of the last message
        mediaUrl?: string;          // Media URL of the last message
        timestamp: string;          // ISO timestamp of the last message
        senderId: string;           // ID of the last message sender
    };
    
    // Metadata
    createdAt: string;              // ISO timestamp of creation
    updatedAt: string;              // ISO timestamp of last update
    isArchived: boolean;            // Archive status
    isMuted: boolean;               // Mute status
}
```

### Status Model
```typescript
interface Status {
    // Primary Key
    statusId: string;               // Unique identifier for the status
    userId: string;                 // ID of the status owner
    
    // Status Content
    type: 'text' | 'image' | 'video';  // Status type
    content: string;                // Status content
    mediaUrl?: string;              // URL to media in S3 (if any)
    
    // Status Info
    views: number;                  // Number of views
    viewers: string[];              // Array of user IDs who viewed
    reactions: {                    // Status reactions
        [userId: string]: string;   // User ID to reaction emoji
    };
    
    // Metadata
    createdAt: string;              // ISO timestamp of creation
    expiresAt: string;              // ISO timestamp of expiration
    isPrivate: boolean;             // Privacy status
}
```

### Media Model
```typescript
interface Media {
    // Primary Key
    key: string;                    // S3 object key
    
    // Media Info
    url: string;                    // S3 URL
    type: 'profile' | 'message' | 'status';  // Media type
    referenceId: string;            // ID of the related entity
    
    // File Info
    fileName: string;               // Original file name
    fileType: string;               // MIME type
    fileSize: number;               // File size in bytes
    
    // Metadata
    uploadedAt: string;             // ISO timestamp of upload
    uploadedBy: string;             // User ID of uploader
    isPublic: boolean;              // Public access status
}
```

## Authentication
Include the user ID in request headers:
```http
X-User-ID: user-123
```

## AWS S3 Configuration
```
Bucket Name: talksy-media-bucket
Region: us-east-1
```

## API Endpoints

### 1. User Management

#### 1.1 Register New User
```http
POST https://talksy-media-bucket.s3.amazonaws.com/users/register
Content-Type: application/json

{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "profilePicture": "https://talksy-media-bucket.s3.amazonaws.com/uploads/profile/user-123/profile.jpg",
    "bio": "Hello, I'm John!",
    "age": 25,
    "gender": "male",
    "status": "Available"
}
```

Response:
```json
{
    "status": "success",
    "data": {
        "user": {
            "uid": "user-123",
            "displayName": "John Doe",
            "email": "john@example.com",
            "photoUrl": "https://talksy-media-bucket.s3.amazonaws.com/uploads/profile/user-123/profile.jpg",
            "bio": "Hello, I'm John!",
            "age": 25,
            "gender": "male",
            "status": "Available",
            "isOnline": false,
            "lastSeen": "2024-03-20T10:30:00Z",
            "notificationSettings": {
                "pushEnabled": true,
                "emailEnabled": true,
                "soundEnabled": true
            },
            "createdAt": "2024-03-20T10:30:00Z",
            "updatedAt": "2024-03-20T10:30:00Z",
            "deviceTokens": []
        },
        "token": "jwt_token_here"
    }
}
```

#### 1.2 Login User
```http
POST /api/users/login
Content-Type: application/json

{
    "phone": "+1234567890",
    "password": "your_password"
}
```

Response:
```json
{
    "status": "success",
    "data": {
        "user": {
            "uid": "user-123",
            "displayName": "John Doe",
            "email": "john@example.com",
            "photoUrl": "https://example.com/photo.jpg",
            "bio": "Hello, I'm John!",
            "age": 25,
            "gender": "male",
            "status": "Available",
            "isOnline": true,
            "lastSeen": "2024-03-20T10:30:00Z"
        },
        "token": "jwt_token_here"
    }
}
```

#### 1.3 Get User Profile
```http
GET /api/users/profile
Authorization: Bearer jwt_token_here
```

Response:
```json
{
    "status": "success",
    "data": {
        "uid": "user-123",
        "displayName": "John Doe",
        "email": "john@example.com",
        "photoUrl": "https://example.com/photo.jpg",
        "bio": "Hello, I'm John!",
        "age": 25,
        "gender": "male",
        "status": "Available",
        "isOnline": true,
        "lastSeen": "2024-03-20T10:30:00Z"
    }
}
```

#### 1.4 Update User Profile
```http
PUT /api/users/profile
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
    "displayName": "John Updated",
    "bio": "Updated bio",
    "status": "Busy"
}
```

Response:
```json
{
    "status": "success",
    "data": {
        "uid": "user-123",
        "displayName": "John Updated",
        "bio": "Updated bio",
        "status": "Busy",
        "updatedAt": "2024-03-20T11:30:00Z"
    }
}
```

#### 1.5 Update Profile Picture
```http
PUT /api/users/profile/picture
Authorization: Bearer jwt_token_here
Content-Type: multipart/form-data

photo: [binary file]
```

Response:
```json
{
    "status": "success",
    "data": {
        "uid": "user-123",
        "photoUrl": "https://talksy-media-bucket.s3.amazonaws.com/uploads/profile/user-123/profile.jpg",
        "updatedAt": "2024-03-20T11:30:00Z"
    }
}
```

#### 1.6 Update Online Status
```http
PUT /api/users/online-status
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
    "isOnline": true
}
```

Response:
```json
{
    "status": "success",
    "data": {
        "uid": "user-123",
        "isOnline": true,
        "lastSeen": "2024-03-20T11:30:00Z"
    }
}
```

#### 1.7 Update Notification Settings
```http
PUT /api/users/notification-settings
Authorization: Bearer jwt_token_here
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
        "uid": "user-123",
        "notificationSettings": {
            "pushEnabled": true,
            "emailEnabled": false,
            "soundEnabled": true
        }
    }
}
```

### 2. Conversations

#### 2.1 Create Conversation
```http
POST /conversations
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
    "participants": ["user-123", "user-456"]
}
```

Response:
```json
{
    "status": "success",
    "data": {
        "conversationId": "conv-123",
        "participants": ["user-123", "user-456"],
        "type": "direct",
        "createdAt": "2024-03-20T11:30:00Z",
        "updatedAt": "2024-03-20T11:30:00Z"
    }
}
```

#### 2.2 Get User Conversations
```http
GET /api/conversations
Authorization: Bearer jwt_token_here
```

Response:
```json
{
    "status": "success",
    "data": [
        {
            "conversationId": "conv-123",
            "participants": ["user-123", "user-456"],
            "type": "direct",
            "lastMessage": {
                "messageId": "msg-123",
                "content": "Hello!",
                "timestamp": "2024-03-20T11:30:00Z",
                "senderId": "user-123"
            },
            "updatedAt": "2024-03-20T11:30:00Z"
        }
    ]
}
```

### 3. Messages

#### 3.1 Send Message
```http
POST /api/messages
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
    "conversationId": "conv-123",
    "content": "Hello!",
    "type": "text"
}
```

Response:
```json
{
    "status": "success",
    "data": {
        "messageId": "msg-123",
        "conversationId": "conv-123",
        "senderId": "user-123",
        "content": "Hello!",
        "type": "text",
        "timestamp": "2024-03-20T11:30:00Z",
        "isRead": false,
        "isDelivered": true
    }
}
```

#### 3.2 Get Conversation Messages
```http
GET /api/messages/:conversationId
Authorization: Bearer jwt_token_here

Query Parameters:
- limit: Number of messages (default: 50)
- lastEvaluatedKey: For pagination
```

Response:
```json
{
    "status": "success",
    "data": {
        "messages": [
            {
                "messageId": "msg-123",
                "conversationId": "conv-123",
                "senderId": "user-123",
                "content": "Hello!",
                "type": "text",
                "timestamp": "2024-03-20T11:30:00Z",
                "isRead": false,
                "isDelivered": true
            }
        ],
        "lastEvaluatedKey": "msg-123"
    }
}
```

### 4. Status

#### 4.1 Create Status
```http
POST /api/status
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
    "type": "text",
    "content": "Having a great day!",
    "expiresAt": "2024-03-21T11:30:00Z"
}
```

Response:
```json
{
    "status": "success",
    "data": {
        "statusId": "status-123",
        "userId": "user-123",
        "type": "text",
        "content": "Having a great day!",
        "views": 0,
        "viewers": [],
        "createdAt": "2024-03-20T11:30:00Z",
        "expiresAt": "2024-03-21T11:30:00Z",
        "isPrivate": false
    }
}
```

#### 4.2 Get User Statuses
```http
GET /api/status
Authorization: Bearer jwt_token_here
```

Response:
```json
{
    "status": "success",
    "data": [
        {
            "statusId": "status-123",
            "userId": "user-123",
            "type": "text",
            "content": "Having a great day!",
            "views": 5,
            "viewers": ["user-456", "user-789"],
            "createdAt": "2024-03-20T11:30:00Z",
            "expiresAt": "2024-03-21T11:30:00Z",
            "isPrivate": false
        }
    ]
}
```

### 5. Media Upload

#### 5.1 Get Pre-signed URL from AWS S3
```http
GET /media/presigned-url
Authorization: Bearer jwt_token_here

Query Parameters:
- type: profile|message|status
- fileName: string
- contentType: string (e.g., image/jpeg, image/png)
```

Response:
```json
{
    "status": "success",
    "data": {
        "url": "https://talksy-media-bucket.s3.amazonaws.com/uploads/profile/user-123/profile.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
        "key": "uploads/profile/user-123/profile.jpg",
        "expiresIn": 300
    }
}
```

#### 5.2 Upload to S3 using Pre-signed URL
```http
PUT {presigned_url}
Content-Type: {contentType}

[binary file data]
```

Response:
```
HTTP 200 OK
```

## S3 File Structure
```
talksy-media-bucket/
├── uploads/
│   ├── profile/
│   │   └── {userId}/
│   │       └── profile.jpg
│   ├── messages/
│   │   └── {conversationId}/
│   │       └── {messageId}.{extension}
│   └── status/
│       └── {userId}/
│           └── {statusId}.{extension}
```

## S3 URL Format
```
Base URL: https://talksy-media-bucket.s3.amazonaws.com

Profile Pictures:
https://talksy-media-bucket.s3.amazonaws.com/uploads/profile/{userId}/profile.jpg

Message Media:
https://talksy-media-bucket.s3.amazonaws.com/uploads/messages/{conversationId}/{messageId}.{extension}

Status Media:
https://talksy-media-bucket.s3.amazonaws.com/uploads/status/{userId}/{statusId}.{extension}
```

## Media Upload Flow
1. Get pre-signed URL from AWS S3
2. Upload file directly to S3 using the pre-signed URL
3. Use the returned key to construct the permanent URL

Example Usage:
```javascript
// 1. Get pre-signed URL from AWS S3
const response = await fetch('https://talksy-media-bucket.s3.amazonaws.com/media/presigned-url?type=profile&fileName=profile.jpg&contentType=image/jpeg');
const { url, key } = await response.json();

// 2. Upload to S3 using the pre-signed URL
await fetch(url, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': 'image/jpeg'
  }
});

// 3. Use the key to construct permanent URL
const permanentUrl = `https://talksy-media-bucket.s3.amazonaws.com/${key}`;
```

## Authentication Flow
1. JWT token is required to get the pre-signed URL from your backend
2. Backend uses AWS credentials to generate the pre-signed URL
3. Pre-signed URL contains AWS authentication for direct S3 upload
4. No JWT token needed for the actual S3 upload

## S3 Authentication
- Uses AWS credentials in pre-signed URLs
- No JWT or other authentication needed
- Pre-signed URLs are temporary and secure

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
    "status": "error",
    "message": "Authentication token required"
}
```

### 403 Forbidden
```json
{
    "status": "error",
    "message": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
    "status": "error",
    "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
    "status": "error",
    "message": "Something went wrong!"
}
```

## WebSocket Events

### Connection
```javascript
socket.on('connection', (socket) => {
    console.log('User connected:', socket.id);
});
```

### Join Room
```javascript
socket.emit('join', userId);
```