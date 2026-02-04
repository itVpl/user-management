/**
 * Thread utilities for grouping emails into conversation threads
 * Similar to Gmail's threading behavior
 */

/**
 * Generate a thread ID from email headers
 * Uses Message-ID, In-Reply-To, and References to group emails
 */
export const getThreadId = (email) => {
  // If email already has a threadId, use it
  if (email.threadId) {
    return email.threadId;
  }

  // Use normalized subject as base thread ID (remove "Re:", "Fwd:", etc.)
  const normalizedSubject = (email.subject || '')
    .replace(/^(re|fwd|fwd:)\s*:?\s*/i, '')
    .trim()
    .toLowerCase();

  // Priority 1: Use References header (most reliable - contains entire thread chain)
  if (email.references) {
    // Extract first Message-ID from References header (original message)
    const refs = String(email.references).split(/\s+/).filter(ref => ref.trim());
    if (refs.length > 0) {
      const firstRefMatch = refs[0].match(/<([^>]+)>/);
      const firstRef = firstRefMatch ? firstRefMatch[1] : refs[0];
      const cleanRef = String(firstRef).replace(/[<>]/g, '').trim();
      if (cleanRef) {
        return `thread-${normalizedSubject}-${cleanRef}`;
      }
    }
  }

  // Priority 2: Use In-Reply-To header (points to parent message)
  if (email.inReplyTo) {
    // Extract Message-ID from In-Reply-To header
    const inReplyToStr = String(email.inReplyTo);
    const inReplyToMatch = inReplyToStr.match(/<([^>]+)>/);
    const parentMessageId = inReplyToMatch ? inReplyToMatch[1] : inReplyToStr;
    const cleanParentId = String(parentMessageId).replace(/[<>]/g, '').trim();
    if (cleanParentId) {
      // Use parent's Message-ID to group with parent
      return `thread-${normalizedSubject}-${cleanParentId}`;
    }
  }

  // Priority 3: Use own Message-ID (original message)
  if (email.messageId) {
    const cleanMessageId = String(email.messageId).replace(/[<>]/g, '').trim();
    if (cleanMessageId) {
      return `thread-${normalizedSubject}-${cleanMessageId}`;
    }
  }

  // Fallback: use normalized subject + from email
  const fromEmail = email.from || email.fromName || '';
  return `thread-${normalizedSubject}-${fromEmail}`;
};

/**
 * Group emails into conversation threads
 * Returns an array of thread objects, each containing:
 * - threadId: unique identifier for the thread
 * - messages: array of emails in the thread (sorted by date, oldest first)
 * - subject: thread subject (from first message)
 * - participants: array of unique sender emails
 * - latestMessage: most recent email in thread
 * - messageCount: number of messages in thread
 * - hasAttachments: true if any message has attachments
 * - attachments: combined attachments from all messages
 */
export const groupEmailsByThread = (emails) => {
  if (!emails || emails.length === 0) {
    return [];
  }

  // Map to store threads by threadId
  const threadMap = new Map();

  // First pass: assign thread IDs to all emails
  emails.forEach((email) => {
    const threadId = getThreadId(email);
    
    if (!threadMap.has(threadId)) {
      threadMap.set(threadId, {
        threadId,
        messages: [],
        participants: new Set(),
        attachments: [],
        hasAttachments: false,
        attachmentCount: 0
      });
    }

    const thread = threadMap.get(threadId);
    thread.messages.push(email);
    
    // Add sender to participants (use name, not email)
    const senderName = email.fromName || email.from || '';
    const senderEmail = email.from || '';
    
    // Clean sender name (remove quotes, extract from "Name <email>" format)
    let cleanSenderName = senderName;
    if (senderName.includes('<')) {
      const nameMatch = senderName.match(/^["']?([^"']+)["']?\s*</);
      cleanSenderName = nameMatch ? nameMatch[1].trim() : senderName;
    }
    cleanSenderName = cleanSenderName.replace(/^["']|["']$/g, '').trim();
    
    // Store participant name (prefer name over email)
    if (cleanSenderName && cleanSenderName !== senderEmail) {
      thread.participants.add(cleanSenderName.toLowerCase());
    } else if (senderEmail) {
      // Extract email from "Name <email>" format if needed
      const emailMatch = senderEmail.match(/<([^>]+)>/);
      const cleanEmail = emailMatch ? emailMatch[1] : senderEmail;
      thread.participants.add(cleanEmail.toLowerCase());
    }
    
    // Also track recipient for sent emails
    if (email.folder === 'sent' && email.to) {
      // Extract recipient name/email
      let recipientName = email.toName || email.to || '';
      if (recipientName.includes('<')) {
        const nameMatch = recipientName.match(/^["']?([^"']+)["']?\s*</);
        recipientName = nameMatch ? nameMatch[1].trim() : recipientName;
      }
      recipientName = recipientName.replace(/^["']|["']$/g, '').trim();
      
      if (recipientName && recipientName !== email.to) {
        thread.participants.add(recipientName.toLowerCase());
      } else if (email.to) {
        const emailMatch = email.to.match(/<([^>]+)>/);
        const cleanEmail = emailMatch ? emailMatch[1] : email.to;
        thread.participants.add(cleanEmail.toLowerCase());
      }
    }
    
    // Collect attachments
    if (email.attachments && email.attachments.length > 0) {
      thread.attachments.push(...email.attachments);
      thread.hasAttachments = true;
      thread.attachmentCount += email.attachments.length;
    }
  });

  // Second pass: build thread objects
  const threads = Array.from(threadMap.values()).map((thread) => {
    // Sort messages by date (oldest first)
    thread.messages.sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      
      return dateA.getTime() - dateB.getTime();
    });

    // Get latest message (most recent)
    const latestMessage = thread.messages[thread.messages.length - 1];

    // Get thread subject (from first message, removing "Re:" prefixes)
    const firstMessage = thread.messages[0];
    const threadSubject = (firstMessage.subject || '')
      .replace(/^(re|fwd|fwd:)\s*:?\s*/i, '')
      .trim() || 'No Subject';

    // Convert participants Set to Array and get unique names
    const participantsSet = new Set();
    const participantNames = [];
    
    thread.messages.forEach(msg => {
      const name = msg.fromName || msg.from || '';
      const email = msg.from || '';
      
      // Add sender name
      if (name && name !== email && !participantsSet.has(name.toLowerCase())) {
        participantsSet.add(name.toLowerCase());
        participantNames.push(name);
      } else if (email && !participantsSet.has(email.toLowerCase())) {
        participantsSet.add(email.toLowerCase());
        participantNames.push(email);
      }
      
      // Add recipient for sent emails
      if (msg.folder === 'sent' && msg.to) {
        const recipientName = msg.toName || msg.to || '';
        if (recipientName && recipientName !== msg.to && !participantsSet.has(recipientName.toLowerCase())) {
          participantsSet.add(recipientName.toLowerCase());
          participantNames.push(recipientName);
        } else if (msg.to && !participantsSet.has(msg.to.toLowerCase())) {
          participantsSet.add(msg.to.toLowerCase());
          participantNames.push(msg.to);
        }
      }
    });

    return {
      threadId: thread.threadId,
      subject: threadSubject,
      messages: thread.messages,
      participants: participantNames, // Array of participant names
      participantEmails: Array.from(thread.participants), // Keep for reference
      latestMessage,
      messageCount: thread.messages.length,
      hasAttachments: thread.hasAttachments,
      attachments: thread.attachments,
      attachmentCount: thread.attachmentCount,
      // For backward compatibility, expose latest message properties at thread level
      uid: latestMessage.uid,
      id: latestMessage.id,
      from: latestMessage.from,
      fromName: latestMessage.fromName,
      to: latestMessage.to,
      timestamp: latestMessage.timestamp,
      date: latestMessage.date,
      isRead: latestMessage.isRead,
      isStarred: latestMessage.isStarred,
      folder: latestMessage.folder,
      contentPreview: latestMessage.contentPreview || latestMessage.body?.substring(0, 100) || '',
      // Thread-specific properties
      isThread: true
    };
  });

  // Sort threads by latest message date (newest first)
  threads.sort((a, b) => {
    const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
    const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
    
    if (isNaN(dateA.getTime())) return 1;
    if (isNaN(dateB.getTime())) return -1;
    
    return dateB.getTime() - dateA.getTime();
  });

  return threads;
};

/**
 * Check if two emails belong to the same thread
 */
export const areEmailsInSameThread = (email1, email2) => {
  return getThreadId(email1) === getThreadId(email2);
};
