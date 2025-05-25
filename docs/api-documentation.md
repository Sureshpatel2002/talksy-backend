# Talksy API Documentation

## Base URLs
- Main API: `https://talksy-backend-z1ta.onrender.com/api`
- WebSocket: `wss://talksy-backend-z1ta.onrender.com`

## Authentication
All endpoints require the user's ID to be provided in the request.

## Table of Contents
1. [User Management](#user-management)
2. [Chat System](#chat-system)
3. [Status System](#status-system)
4. [Notifications](#notifications)
5. [Real-time Events](#real-time-events)
6. [Streaming and Builder Patterns](#streaming-and-builder-patterns)

## User Management

### User Profile
- `GET /users/:userId/profile` - Get user profile
- `PUT /users/:userId/contact` - Update contact information
- `PUT /users/:userId/privacy` - Update privacy settings
- `POST /users/:userId/verify-phone` - Verify phone number
- `GET /users/search/phone` - Search users by phone number

### Friend Management
- `POST /users/:userId/friends/:friendId` - Send friend request
- `PUT /users/:userId/friends/:friendId` - Accept friend request
- `DELETE /users/:userId/friends/:friendId` - Remove friend

## Chat System

### Chat Management
- `POST /chat` - Create new chat
  ```json
  {
    "type": "direct|group",
    "participants": ["userId1", "userId2"],
    "name": "Group Name" // Required for group chats
  }
  ```

- `GET /chat/user/:userId` - Get user's chats
- `PUT /chat/:chatId` - Update chat details
- `DELETE /chat/:chatId` - Delete chat

### Messages
- `POST /chat/:chatId/messages` - Send message
  ```json
  {
    "senderId": "userId",
    "content": "Message content",
    "type": "text|image|video|file",
    "metadata": {
      "url": "media_url",
      "size": "file_size",
      "duration": "video_duration"
    }
  }
  ```

- `GET /chat/:chatId/messages` - Get chat messages
  ```
  Query Parameters:
  - limit: number (default: 50)
  - before: timestamp
  - after: timestamp
  ```

- `PUT /chat/:chatId/messages/:messageId` - Edit message
- `DELETE /chat/:chatId/messages/:messageId` - Delete message

### Message Reactions
- `POST /chat/:chatId/messages/:messageId/reactions` - Add reaction
  ```json
  {
    "userId": "userId",
    "emoji": "👍"
  }
  ```

- `DELETE /chat/:chatId/messages/:messageId/reactions` - Remove reaction

### Message Search
- `GET /chat/:chatId/search` - Search messages
  ```
  Query Parameters:
  - query: string
  - limit: number (default: 20)
  - page: number (default: 1)
  ```

## Status System

### Status Management
- `POST /status` - Create status
  ```json
  {
    "userId": "userId",
    "text": "Status text",
    "mediaUrl": "media_url",
    "mediaType": "image|video",
    "expiresAt": "timestamp"
  }
  ```

- `GET /status/user/:userId` - Get user's status
- `PUT /status/:statusId` - Update status
- `DELETE /status/:statusId` - Delete status

### Status Interactions
- `POST /status/:statusId/reactions` - Add reaction
  ```json
  {
    "userId": "userId",
    "type": "like|love|laugh|wow|sad|angry"
  }
  ```

- `POST /status/:statusId/comments` - Add comment
  ```json
  {
    "userId": "userId",
    "text": "Comment text",
    "mentions": ["userId1", "userId2"]
  }
  ```

- `GET /status/:statusId/comments` - Get comments
  ```
  Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 10)
  ```

## Notifications

### Notification Management
- `GET /notifications/user/:userId` - Get user's notifications
  ```
  Query Parameters:
  - type: string (optional)
  - limit: number (default: 20)
  - page: number (default: 1)
  ```

- `PUT /notifications/:notificationId/read` - Mark notification as read
- `PUT /notifications/user/:userId/read-all` - Mark all notifications as read
- `DELETE /notifications/:notificationId` - Delete notification

### Notification Preferences
- `GET /notifications/preferences/:userId` - Get notification preferences
- `PUT /notifications/preferences/:userId` - Update preferences
  ```json
  {
    "email": {
      "enabled": true,
      "types": ["message", "friend_request", "status_view"]
    },
    "push": {
      "enabled": true,
      "types": ["message", "friend_request", "status_view"]
    },
    "inApp": {
      "enabled": true,
      "types": ["message", "friend_request", "status_view"]
    },
    "sound": {
      "enabled": true,
      "volume": 0.7
    },
    "badge": {
      "enabled": true,
      "showCount": true
    }
  }
  ```

## Real-time Events

### Socket.IO Events

#### Connection
```javascript
const socket = io('wss://talksy-backend-z1ta.onrender.com', {
  query: { userId: 'user123' }
});
```

#### User Events
```javascript
// User online/offline
socket.on('user:status', (data) => {
  const { userId, isOnline, lastSeen } = data;
});

// Profile updates
socket.on('user:profile:updated', (data) => {
  const { userId, updates } = data;
});

// New friend request
socket.on('user:friend:request', (data) => {
  const { fromUserId, toUserId } = data;
});
```

#### Chat Events
```javascript
// New message
socket.on('chat:message:new', (data) => {
  const { chatId, message } = data;
});

// Message edited
socket.on('chat:message:edited', (data) => {
  const { chatId, messageId, content } = data;
});

// Message deleted
socket.on('chat:message:deleted', (data) => {
  const { chatId, messageId } = data;
});

// New reaction
socket.on('chat:message:reaction', (data) => {
  const { chatId, messageId, reaction } = data;
});

// Typing indicator
socket.on('chat:typing', (data) => {
  const { chatId, userId, isTyping } = data;
});
```

#### Status Events
```javascript
// New status
socket.on('status:new', (data) => {
  const { userId, status } = data;
});

// Status reaction
socket.on('status:reaction', (data) => {
  const { statusId, reaction } = data;
});

// New comment
socket.on('status:comment', (data) => {
  const { statusId, comment } = data;
});

// Status viewed
socket.on('status:viewed', (data) => {
  const { statusId, userId } = data;
});
```

#### Notification Events
```javascript
// New notification
socket.on('notification:new', (data) => {
  const { notification } = data;
});

// Notification read
socket.on('notification:read', (data) => {
  const { notificationId } = data;
});
```

## Error Codes

### Common Errors
- `USER_NOT_FOUND`: User not found
- `CHAT_NOT_FOUND`: Chat not found
- `STATUS_NOT_FOUND`: Status not found
- `NOTIFICATION_NOT_FOUND`: Notification not found
- `INVALID_REQUEST`: Invalid request parameters
- `UNAUTHORIZED`: Unauthorized access
- `SERVER_ERROR`: Internal server error

### Chat-specific Errors
- `INVALID_CHAT_TYPE`: Invalid chat type
- `INVALID_PARTICIPANTS`: Invalid participants
- `MESSAGE_NOT_FOUND`: Message not found
- `INVALID_REACTION`: Invalid reaction type

### Status-specific Errors
- `INVALID_MEDIA_TYPE`: Invalid media type
- `MEDIA_TOO_LARGE`: Media file too large
- `INVALID_REACTION`: Invalid reaction type
- `COMMENT_NOT_FOUND`: Comment not found

## Rate Limiting

### General Limits
- API requests: 100 requests per minute
- WebSocket connections: 5 connections per user
- File uploads: 10 files per minute

### Feature-specific Limits
- Messages: 60 messages per minute
- Status updates: 10 statuses per hour
- Friend requests: 20 requests per hour
- Phone verification: 3 attempts per hour

## Best Practices

1. **Error Handling**
   - Always implement proper error handling
   - Use appropriate HTTP status codes
   - Handle WebSocket disconnections gracefully

2. **Real-time Updates**
   - Implement reconnection logic
   - Handle offline/online states
   - Cache data for offline access

3. **Media Handling**
   - Compress images before upload
   - Use appropriate file formats
   - Implement proper error handling for failed uploads

4. **Security**
   - Validate all user inputs
   - Implement proper authentication
   - Use HTTPS for all API calls
   - Handle sensitive data appropriately

5. **Performance**
   - Implement pagination for large datasets
   - Use appropriate caching strategies
   - Optimize media loading
   - Implement proper indexing for searches 

## Streaming and Builder Patterns

### Media Streaming
For handling large media files and real-time data, use streaming endpoints:

#### Video/Audio Streaming
- `GET /media/stream/:mediaId` - Stream media content
  ```
  Query Parameters:
  - quality: string (low|medium|high)
  - format: string (mp4|webm|mp3)
  - range: string (bytes=0-1024)
  ```

Example using Node.js:
```javascript
const response = await fetch('/api/media/stream/123?quality=medium');
const reader = response.body.getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // Process chunk
}
```

#### Live Streaming
- `POST /stream/start` - Start live stream
  ```json
  {
    "userId": "userId",
    "title": "Stream Title",
    "type": "video|audio",
    "quality": "low|medium|high"
  }
  ```

- `POST /stream/:streamId/chunk` - Send stream chunk
  ```javascript
  // Using WebSocket for live streaming
  const streamSocket = io('/stream', {
    query: { streamId: 'stream123' }
  });

  // Send video chunks
  mediaRecorder.ondataavailable = (event) => {
    streamSocket.emit('stream:chunk', event.data);
  };
  ```

### Builder Pattern Endpoints
For complex operations that require multiple steps:

#### Chat Builder
```javascript
// Create chat with builder pattern
const chat = await fetch('/api/chat/builder', {
  method: 'POST',
  body: JSON.stringify({
    steps: [
      { type: 'create', data: { type: 'group', name: 'Team Chat' } },
      { type: 'addParticipants', data: { userIds: ['user1', 'user2'] } },
      { type: 'setPermissions', data: { adminId: 'user1' } },
      { type: 'setSettings', data: { notifications: true } }
    ]
  })
});
```

#### Status Builder
```javascript
// Create status with media using builder
const status = await fetch('/api/status/builder', {
  method: 'POST',
  body: JSON.stringify({
    steps: [
      { type: 'create', data: { text: 'My status' } },
      { type: 'addMedia', data: { type: 'image', url: 'image.jpg' } },
      { type: 'setPrivacy', data: { visibility: 'friends' } },
      { type: 'setExpiry', data: { duration: '24h' } }
    ]
  })
});
```

#### Notification Builder
```javascript
// Create complex notification using builder
const notification = await fetch('/api/notifications/builder', {
  method: 'POST',
  body: JSON.stringify({
    steps: [
      { type: 'create', data: { type: 'group_invite' } },
      { type: 'addRecipients', data: { userIds: ['user1', 'user2'] } },
      { type: 'setContent', data: { title: 'Group Invite', body: 'Join our group!' } },
      { type: 'addActions', data: { actions: ['accept', 'decline'] } }
    ]
  })
});
```

### When to Use Streaming
1. **Media Content**
   - Video playback
   - Audio streaming
   - Large file downloads
   - Live streaming

2. **Real-time Data**
   - Live chat messages
   - Status updates
   - Live notifications
   - Real-time analytics

3. **Large Datasets**
   - Message history
   - User lists
   - Search results
   - Analytics data

### When to Use Builder Pattern
1. **Complex Operations**
   - Multi-step processes
   - Conditional operations
   - Transaction-like operations
   - Batch operations

2. **Resource Creation**
   - Complex object creation
   - Nested resource creation
   - Dependent resource creation
   - Validation across steps

3. **Configuration**
   - Complex settings
   - Multi-part configurations
   - Conditional settings
   - Default value handling

### Best Practices for Streaming
1. **Chunk Size**
   - Video: 1-2MB chunks
   - Audio: 256KB chunks
   - Images: 512KB chunks
   - Text: 64KB chunks

2. **Error Handling**
   ```javascript
   try {
     const stream = await fetch('/api/media/stream/123');
     const reader = stream.body.getReader();
     
     while (true) {
       const { done, value } = await reader.read();
       if (done) break;
       // Process chunk
     }
   } catch (error) {
     // Handle stream errors
     console.error('Stream error:', error);
   }
   ```

3. **Progress Tracking**
   ```javascript
   let receivedBytes = 0;
   const totalBytes = response.headers.get('content-length');

   while (true) {
     const { done, value } = await reader.read();
     if (done) break;
     
     receivedBytes += value.length;
     const progress = (receivedBytes / totalBytes) * 100;
     // Update progress UI
   }
   ```

### Best Practices for Builder Pattern
1. **Validation**
   ```javascript
   const builder = new ChatBuilder();
   builder
     .create({ type: 'group', name: 'Team Chat' })
     .validate() // Validate current state
     .addParticipants(['user1', 'user2'])
     .validate() // Validate after each step
     .build();
   ```

2. **Error Recovery**
   ```javascript
   try {
     const result = await builder
       .step1()
       .step2()
       .step3()
       .build();
   } catch (error) {
     // Rollback or recover from error
     await builder.rollback();
   }
   ```

3. **Transaction Support**
   ```javascript
   const transaction = await builder.beginTransaction();
   try {
     await transaction
       .step1()
       .step2()
       .step3()
       .commit();
   } catch (error) {
     await transaction.rollback();
   }
   ``` 