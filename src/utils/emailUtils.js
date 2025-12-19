/**
 * Email utility functions for handling multiple recipients
 */

/**
 * Validates a single email address
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Parses multiple email addresses from various input formats
 * Supports:
 * - Comma-separated string: "email1@example.com, email2@example.com"
 * - Array: ["email1@example.com", "email2@example.com"]
 * - Single email: "email1@example.com"
 * - Bracket notation: "[email1@example.com, email2@example.com]"
 * 
 * @param {string|string[]} input - Email input (string or array)
 * @returns {string[]} - Array of valid email addresses
 */
export const parseEmailRecipients = (input) => {
  if (!input) return [];
  
  let emails = [];
  
  // Handle array input
  if (Array.isArray(input)) {
    emails = input.map(email => typeof email === 'string' ? email.trim() : String(email).trim());
  } 
  // Handle string input
  else if (typeof input === 'string') {
    // Remove brackets if present: [email1, email2] -> email1, email2
    let cleaned = input.trim();
    if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    
    // Split by comma and trim each email
    emails = cleaned.split(',').map(email => email.trim()).filter(email => email.length > 0);
  }
  
  // Filter out empty strings and return
  return emails.filter(email => email.length > 0);
};

/**
 * Validates multiple email addresses
 * @param {string|string[]} input - Email input (string or array)
 * @returns {{valid: boolean, emails: string[], invalidEmails: string[]}} - Validation result
 */
export const validateEmailRecipients = (input) => {
  const emails = parseEmailRecipients(input);
  const validEmails = [];
  const invalidEmails = [];
  
  emails.forEach(email => {
    if (isValidEmail(email)) {
      validEmails.push(email);
    } else {
      invalidEmails.push(email);
    }
  });
  
  return {
    valid: invalidEmails.length === 0 && validEmails.length > 0,
    emails: validEmails,
    invalidEmails: invalidEmails,
    count: validEmails.length
  };
};

/**
 * Formats email recipients for API submission
 * Returns comma-separated string for form-data or array for JSON
 * @param {string|string[]} input - Email input
 * @param {boolean} asArray - If true, returns array; if false, returns comma-separated string
 * @returns {string|string[]} - Formatted recipients
 */
export const formatEmailRecipients = (input, asArray = false) => {
  const emails = parseEmailRecipients(input);
  const validEmails = emails.filter(email => isValidEmail(email));
  
  if (asArray) {
    return validEmails;
  }
  
  // Return comma-separated string (API handles parsing)
  return validEmails.join(', ');
};

/**
 * Gets recipient count from input
 * @param {string|string[]} input - Email input
 * @returns {number} - Number of recipients
 */
export const getRecipientCount = (input) => {
  const emails = parseEmailRecipients(input);
  return emails.filter(email => isValidEmail(email)).length;
};

