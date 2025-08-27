// Mock database for now
const users = new Map();

export const userService = {
    async getUser(userId) {
        return users.get(userId) || null;
    },

    async createUser(userData) {
        const userId = Date.now().toString();
        const user = {
            id: userId,
            ...userData,
            deviceTokens: [],
            notificationSettings: {
                pushEnabled: true,
                emailEnabled: true,
                soundEnabled: true
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
        users.set(userId, user);
        return user;
    },

    async addDeviceToken(userId, token) {
        const user = await this.getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.deviceTokens.includes(token)) {
            user.deviceTokens.push(token);
            user.updatedAt = new Date();
            users.set(userId, user);
        }
        return user;
    },

    async updateNotificationSettings(userId, settings) {
        const user = await this.getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }

        user.notificationSettings = {
            ...user.notificationSettings,
            ...settings
        };
        user.updatedAt = new Date();
        users.set(userId, user);
        return user;
    }
}; 