const db = require('../config/db');

async function submitContact(req, res) {
  try {
    const { name, email, phone, subject, message, interest = 'General Inquiry' } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required.'
      });
    }

    const newContact = {
      id: db.memoryStore.contacts.length + 1,
      name,
      email,
      phone: phone || '',
      subject: subject || `Inquiry from ${name}`,
      message,
      interest,
      status: 'new',
      created_at: new Date()
    };

    db.memoryStore.contacts.push(newContact);

    res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been received. Our team will get back to you within 24 hours.',
      contact: newContact
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getContacts(req, res) {
  try {
    res.json({
      success: true,
      count: db.memoryStore.contacts.length,
      contacts: db.memoryStore.contacts
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  submitContact,
  getContacts
};
