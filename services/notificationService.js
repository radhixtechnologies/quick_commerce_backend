const db = require('../config/db');

class NotificationService {
  constructor() {
    this.io = null;
  }

  setSocketIO(io) {
    this.io = io;
  }

  async sendNotification({
    userId = null,
    recipientRole = 'all',
    category = 'General',
    title,
    body,
    data = null
  }) {
    let notifId = Date.now();

    if (db.isConnected()) {
      const res = await db.query(
        'INSERT INTO notifications (user_id, recipient_role, category, title, body, data) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, recipientRole, category, title, body, data ? JSON.stringify(data) : null]
      );
      notifId = res.insertId;
    } else {
      db.memoryStore.notifications.unshift({
        id: notifId,
        user_id: userId,
        recipient_role: recipientRole,
        category,
        title,
        body,
        data,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    if (this.io) {
      const payload = { id: notifId, userId, recipientRole, category, title, body, data, created_at: new Date() };
      if (userId) {
        this.io.to(`user_${userId}`).emit('new_notification', payload);
      } else if (recipientRole !== 'all') {
        this.io.to(`role_${recipientRole}`).emit('new_notification', payload);
      } else {
        this.io.emit('new_notification', payload);
      }
    }

    return { success: true, notifId };
  }
}

module.exports = new NotificationService();
