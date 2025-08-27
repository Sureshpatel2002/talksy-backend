// Mock database for now
const conversations = new Map();

export const conversationService = {
    async getConversation(conversationId) {
        return conversations.get(conversationId) || null;
    },

    async createConversation(participants) {
        const conversationId = Date.now().toString();
        const conversation = {
            id: conversationId,
            participants,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        conversations.set(conversationId, conversation);
        return conversation;
    },

    async addMessage(conversationId, message) {
        const conversation = await this.getConversation(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }
        
        if (!conversation.messages) {
            conversation.messages = [];
        }
        
        conversation.messages.push(message);
        conversation.updatedAt = new Date();
        conversations.set(conversationId, conversation);
        return conversation;
    }
}; 