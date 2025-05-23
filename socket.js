const socketIO = require('socket.io');
const Message = require('./models/message');
const Conversation = require('./models/conversation');
const User = require('./models/user');
const Status = require('./models/status');

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

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Handle user connection
    socket.on('user:connect', async (userId) => {
      onlineUsers.set(userId, socket.id);
      
      // Update user's online status
      await User.findOneAndUpdate(
        { uid: userId },
        { 
          $set: { 
            isOnline: true,
            lastSeen: new Date()
          }
        }
      );

      // Broadcast user's online status
      socket.broadcast.emit('user:status', {
        userId,
        isOnline: true
      });
    });

    // Handle user disconnection
    socket.on('disconnect', async () => {
      let disconnectedUserId;
      
      // Find and remove user from online users
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          onlineUsers.delete(userId);
          break;
        }
      }

      if (disconnectedUserId) {
        // Update user's offline status
        await User.findOneAndUpdate(
          { uid: disconnectedUserId },
          { 
            $set: { 
              isOnline: false,
              lastSeen: new Date()
            }
          }
        );

        // Broadcast user's offline status
        io.emit('user:status', {
          userId: disconnectedUserId,
          isOnline: false
        });
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
  });

  return io;
};

module.exports = { initializeSocket }; 