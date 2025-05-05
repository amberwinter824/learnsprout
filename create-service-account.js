// Load environment variables from .env.local
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Create service account JSON structure
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL,
  universe_domain: 'googleapis.com'
};

// Convert to JSON string
const serviceAccountJson = JSON.stringify(serviceAccount, null, 2);

// Convert to Base64
const serviceAccountBase64 = Buffer.from(serviceAccountJson).toString('base64');

// Output the base64 string
console.log('\nFirebase Service Account JSON (Base64-encoded):');
console.log('-----------------------------------------------');
console.log(serviceAccountBase64);
console.log('\nAdd this to your .env.local as:');
console.log('FIREBASE_SERVICE_ACCOUNT_KEY=<the-above-base64-string>'); 