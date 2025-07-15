const admin = require('firebase-admin');

// Get raw JSON string from environment
const jsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!jsonString) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing');
}

// Parse directly to object without preprocessing
let serviceAccount;
try {
  serviceAccount = JSON.parse(jsonString);
} catch (err) {
  throw new Error('Invalid JSON in FIREBASE_SERVICE_ACCOUNT_JSON');
}

// Validate and normalize private key
if (serviceAccount.private_key) {
  const key = serviceAccount.private_key;
  
  // Critical fix: Handle all possible newline representations
  const normalizedKey = key
    // Preserve existing actual newlines
    .replace(/([^\n])\n([^\n])/g, '$1$2') // Remove internal newlines
    // Handle escaped sequences
    .replace(/\\r\\n/g, '\n')     // Windows-style
    .replace(/\\r/g, '\n')         // Old Mac-style
    .replace(/\\n/g, '\n')         // Linux-style
    // Standardize PEM markers
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .trim()
    // Rebuild with proper PEM formatting
    .replace(/\s+/g, '')           // Remove all whitespace
    .replace(/(.{64})/g, '$1\n');  // Reformat to 64-char lines

  serviceAccount.private_key = 
    "-----BEGIN PRIVATE KEY-----\n" +
    normalizedKey +
    "\n-----END PRIVATE KEY-----\n";
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;