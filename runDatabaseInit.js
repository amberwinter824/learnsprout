// runDatabaseInit.js
const { initializeDatabase } = require('./utilities/firebaseInit');

// Add more detailed error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log("Starting database initialization script...");

(async () => {
  try {
    console.log("Calling initializeDatabase function...");
    const success = await initializeDatabase();
    
    if (success) {
      console.log("Database initialization completed successfully!");
    } else {
      console.error("Database initialization failed!");
      process.exit(1);
    }
    
    // Give Firebase time to finish any background operations
    console.log("Waiting for Firebase operations to complete...");
    setTimeout(() => {
      console.log("Exiting process");
      process.exit(0);
    }, 15000); // Increased to 15 seconds to ensure completion
    
  } catch (error) {
    console.error("Unhandled error during initialization:", error);
    process.exit(1);
  }
})();