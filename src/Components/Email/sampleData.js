export const sampleEmails = [
  {
    id: 1,
    from: 'john.doe@logistics.com',
    fromName: 'John Doe',
    to: 'user@example.com',
    subject: 'Shipment Update - LD0331',
    body: 'Your shipment LD0331 has been successfully delivered to the destination. Please find the delivery confirmation attached.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isRead: false,
    isStarred: false,
    folder: 'inbox',
    priority: 'high',
    attachments: ['delivery_confirmation.pdf']
  },
  {
    id: 2,
    from: 'support@vpower.com',
    fromName: 'V Power Support',
    to: 'user@example.com',
    subject: 'Welcome to V Power Logistics Platform',
    body: 'Thank you for joining V Power Logistics. We are excited to have you on board. Your account has been successfully created.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    isRead: true,
    isStarred: true,
    folder: 'inbox',
    priority: 'normal',
    attachments: []
  },
  {
    id: 3,
    from: 'user@example.com',
    fromName: 'You',
    to: 'billing@logistics.com',
    subject: 'Invoice Query - March 2024',
    body: 'I have a question regarding the invoice for March 2024. Could you please clarify the charges?',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    isRead: true,
    isStarred: false,
    folder: 'sent',
    priority: 'normal',
    attachments: []
  },
];
