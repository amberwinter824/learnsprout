import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('Client Email:', process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
console.log('Private Key:', process.env.FIREBASE_ADMIN_PRIVATE_KEY ? 'Present' : 'Missing'); 