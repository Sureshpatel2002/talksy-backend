const socketIO = require('socket.io');
const Message = require('./models/message');
const Conversation = require('./models/conversation');
const User = require('./models/user');
const Status = require('./models/status');
const Chat = require('./models/chat');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Store online users
  const onlineUsers = new Map();
  const userRooms = new Map();

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Handle user connection
    socket.on('user:connect', async (userId) => {
      try {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        
        // Update user's online status
        const user = await User.findOne({ uid: userId });
        if (user) {
          await user.updateOnlineStatus(true);
          io.emit('user:status', { userId, isOnline: true });
        }
      } catch (error) {
        console.error('Error in user:connect:', error);
      }
    });

    // Handle new user registration
    socket.on('user:new', async (userData) => {
      try {
        // Broadcast new user to all online users
        io.emit('user:new', {
          userId: userData.uid,
          displayName: userData.displayName,
          photoUrl: userData.photoUrl
        });
      } catch (error) {
        console.error('Error broadcasting new user:', error);
      }
    });

    // Handle chat events
    socket.on('chat:join', async ({ userId, chatId }) => {
      try {
        // Join chat room
        socket.join(`chat:${chatId}`);
        userRooms.set(userId, chatId);

        // Get chat history
        const messages = await Message.find({ chatId })
          .sort({ createdAt: -1 })
          .limit(50);

        socket.emit('chat:history', messages);
      } catch (error) {
        console.error('Error joining chat:', error);
      }
    });

    socket.on('chat:message', async (messageData) => {
      try {
        const { chatId, senderId, content, type } = messageData;

        // Save message
        const message = new Message({
          chatId,
          senderId,
          content,
          type,
          timestamp: new Date()
        });
        await message.save();

        // Broadcast to chat room
        io.to(`chat:${chatId}`).emit('chat:message', message);

        // Send notification to offline users
        const chat = await Chat.findById(chatId).populate('participants');
        chat.participants.forEach(participant => {
          if (participant.uid !== senderId && !onlineUsers.has(participant.uid)) {
            io.sendNotification(participant.uid, {
              type: 'message',
              fromUserId: senderId,
              chatId,
              messagePreview: content
            });
          }
        });
      } catch (error) {
        console.error('Error sending chat message:', error);
      }
    });

    // Handle status events
    socket.on('status:new', async (statusData) => {
      try {
        const { userId, content, mediaUrl, mediaType } = statusData;

        // Create new status
        const status = new Status({
          userId,
          content,
          mediaUrl,
          mediaType,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });
        await status.save();

        // Update user's status
        await User.findOneAndUpdate(
          { uid: userId },
          { $set: { status: statusData } }
        );

        // Broadcast new status
        io.emit('status:new', status);

        // Send notifications to friends
        const user = await User.findOne({ uid: userId });
        if (user) {
          const friends = await User.find({ 
            uid: { $in: user.friends || [] } 
          });
          
          friends.forEach(friend => {
            io.sendNotification(friend.uid, {
              type: 'status_new',
              fromUserId: userId,
              statusId: status._id,
              message: `${user.displayName} posted a new status`
            });
          });
        }
      } catch (error) {
        console.error('Error creating new status:', error);
      }
    });

    socket.on('status:update', async (statusData) => {
      try {
        const { userId, statusId, content, mediaUrl, mediaType } = statusData;

        // Update status
        const status = await Status.findByIdAndUpdate(
          statusId,
          { 
            $set: { 
              content,
              mediaUrl,
              mediaType,
              updatedAt: new Date()
            } 
          },
          { new: true }
        );

        // Update user's status
        await User.findOneAndUpdate(
          { uid: userId },
          { $set: { status: statusData } }
        );

        // Broadcast status update
        io.emit('status:update', status);
      } catch (error) {
        console.error('Error updating status:', error);
      }
    });

    socket.on('status:view', async ({ statusId, userId }) => {
      try {
        const status = await Status.findById(statusId);
        if (!status) return;

        // Add viewer if not already viewed
        if (!status.viewers.some(viewer => viewer.userId === userId)) {
          status.viewers.push({
            userId,
            viewedAt: new Date()
          });
          await status.save();

          // Notify status owner
          const ownerSocketId = onlineUsers.get(status.userId);
          if (ownerSocketId) {
            io.to(ownerSocketId).emit('status:viewed', {
              statusId,
              userId
            });

            // Send notification if owner is offline
            if (!onlineUsers.has(status.userId)) {
              io.sendNotification(status.userId, {
                type: 'status_view',
                fromUserId: userId,
                statusId,
                message: 'Someone viewed your status'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error viewing status:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      if (socket.userId) {
        const userId = socket.userId;
        onlineUsers.delete(userId);
        userRooms.delete(userId);

        try {
          const user = await User.findOne({ uid: userId });
          if (user) {
            await user.updateOnlineStatus(false);
            io.emit('user:status', { userId, isOnline: false });
          }
        } catch (error) {
          console.error('Error in disconnect:', error);
        }
      }
    });

    // Handle new message
    socket.on('message:send', async (messageData) => {
      try {
        const { conversationId, senderId, receiverId, content, type, replyTo, metadata } = messageData;

        // Create new message
        const newMessage = new Message({
          conversationId,
          senderId,
          receiverId,
          content,
          type,
          replyTo,
          metadata,
          timestamp: new Date()
        });

        // Save message
        const savedMessage = await newMessage.save();

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: savedMessage._id
        });

        // Get the conversation with populated last message
        const conversation = await Conversation.findById(conversationId)
          .populate({
            path: 'lastMessage',
            populate: {
              path: 'replyTo'
            }
          });

        // Get the other participant's details
        const otherParticipantId = conversation.participants.find(id => id !== senderId);
        const user = await User.findOne({ uid: otherParticipantId });

        // Prepare recent chat data
        const recentChat = {
          user: {
            uid: user.uid,
            name: user.name,
            photoUrl: user.photoUrl,
            email: user.email,
            bio: user.bio,
            age: user.age,
            gender: user.gender,
            status: user.status,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen
          },
          lastMessage: {
            id: savedMessage._id,
            senderId: savedMessage.senderId,
            receiverId: savedMessage.receiverId,
            content: savedMessage.content,
            type: savedMessage.type,
            timestamp: savedMessage.timestamp,
            isEdited: savedMessage.isEdited,
            replyTo: savedMessage.replyTo,
            metadata: savedMessage.metadata,
            isRead: savedMessage.isRead,
            readAt: savedMessage.readAt
          }
        };

        // Emit to sender
        socket.emit('message:sent', savedMessage);
        socket.emit('recent:chat:update', recentChat);

        // Emit to receiver if online
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message:receive', savedMessage);
          io.to(receiverSocketId).emit('recent:chat:update', recentChat);
        }
      } catch (error) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // Handle message read status
    socket.on('message:read', async ({ messageId, conversationId, receiverId }) => {
      try {
        // Update message read status
        const message = await Message.findByIdAndUpdate(
          messageId,
          { 
            $set: { 
              isRead: true,
              readAt: new Date()
            } 
          },
          { new: true }
        );

        // Emit read status to sender
        const senderSocketId = onlineUsers.get(message.senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:read', {
            messageId,
            conversationId,
            readBy: receiverId
          });
        }
      } catch (error) {
        socket.emit('message:error', { error: error.message });
      }
    });

    // Handle typing status
    socket.on('typing:start', ({ conversationId, userId }) => {
      socket.to(conversationId).emit('typing:start', {
        conversationId,
        userId
      });
    });

    socket.on('typing:stop', ({ conversationId, userId }) => {
      socket.to(conversationId).emit('typing:stop', {
        conversationId,
        userId
      });
    });

    // Handle user status update
    socket.on('user:status:update', async ({ userId, status }) => {
      try {
        await User.findOneAndUpdate(
          { uid: userId },
          { $set: { status } }
        );

        // Broadcast status update
        io.emit('user:status:updated', {
          userId,
          status
        });
      } catch (error) {
        socket.emit('user:error', { error: error.message });
      }
    });

    // Handle status events
    socket.on('status:view', async ({ statusId, userId }) => {
      try {
        const status = await Status.findById(statusId);
        if (!status) return;

        // Add viewer if not already viewed
        if (!status.viewers.some(viewer => viewer.userId === userId)) {
          status.viewers.push({
            userId,
            viewedAt: new Date()
          });
          await status.save();

          // Emit view event to status owner
          const ownerSocketId = onlineUsers.get(status.userId);
          if (ownerSocketId) {
            io.to(ownerSocketId).emit('status:viewed', {
              statusId,
              userId
            });
          }
        }
      } catch (error) {
        socket.emit('status:error', { error: error.message });
      }
    });

    socket.on('status:delete', async ({ statusId, userId }) => {
      try {
        const status = await Status.findOneAndDelete({
          _id: statusId,
          userId
        });

        if (status) {
          io.emit('status:deleted', {
            statusId,
            userId
          });
        }
      } catch (error) {
        socket.emit('status:error', { error: error.message });
      }
    });

    // Handle notification events
    socket.on('notification:subscribe', (userId) => {
      socket.join(`notifications:${userId}`);
    });

    socket.on('notification:unsubscribe', (userId) => {
      socket.leave(`notifications:${userId}`);
    });
  });

  // Function to send notification to specific user
  io.sendNotification = async (userId, notification) => {
    try {
      const user = await User.findOne({ uid: userId });
      if (user) {
        await user.addNotification(notification);
        io.to(`notifications:${userId}`).emit('notification:new', notification);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  // Function to send notification to multiple users
  io.sendNotificationToUsers = async (userIds, notification) => {
    try {
      for (const userId of userIds) {
        await io.sendNotification(userId, notification);
      }
    } catch (error) {
      console.error('Error sending notifications to users:', error);
    }
  };

  return io;
};

module.exports = { initializeSocket }; 