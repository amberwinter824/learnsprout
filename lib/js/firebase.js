"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.db = exports.auth = exports.app = exports.firebaseStorage = exports.firebaseDb = exports.firebaseAuth = exports.firebaseApp = void 0;
// lib/firebase.ts
var app_1 = require("firebase/app");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var storage_1 = require("firebase/storage");
// Firebase configuration from environment variables
var firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};
// Initialize Firebase only if it hasn't been initialized
var app;
var auth;
var db;
var storage;
try {
    if (!(0, app_1.getApps)().length) {
        exports.app = app = (0, app_1.initializeApp)(firebaseConfig);
    }
    else {
        exports.app = app = (0, app_1.getApps)()[0];
    }
    // Initialize Firebase services
    exports.auth = auth = (0, auth_1.getAuth)(app);
    exports.db = db = (0, firestore_1.getFirestore)(app);
    exports.storage = storage = (0, storage_1.getStorage)(app);
    // Connect to emulators in development if enabled
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
        (0, auth_1.connectAuthEmulator)(auth, 'http://localhost:9099');
        (0, firestore_1.connectFirestoreEmulator)(db, 'localhost', 8080);
        (0, storage_1.connectStorageEmulator)(storage, 'localhost', 9199);
    }
    // Log initialization (optional - you can remove in production)
    console.log("Firebase initialized:", !!app);
    console.log("Auth initialized:", !!auth);
    console.log("DB initialized:", !!db);
}
catch (error) {
    console.error("Error initializing Firebase:", error);
    throw error;
}
// Export with explicit type annotations
exports.firebaseApp = app;
exports.firebaseAuth = auth;
exports.firebaseDb = db;
exports.firebaseStorage = storage;
