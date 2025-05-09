import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get the base64 service account key from environment variables
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountBase64) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

try {
  // Decode the base64 string
  const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString();

  // Create config directory if it doesn't exist
  const configDir = path.join(process.cwd(), 'config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
  }

  // Write the service account JSON to a file
  const serviceAccountPath = path.join(configDir, 'service-account.json');
  fs.writeFileSync(serviceAccountPath, serviceAccountJson);

  console.log('Service account file created successfully at:', serviceAccountPath);
} catch (error) {
  console.error('Error creating service account file:', error);
  process.exit(1);
} 