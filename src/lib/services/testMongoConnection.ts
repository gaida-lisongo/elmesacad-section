import mongoose from "mongoose";

/**
 * Utility function to test MongoDB connection from command line
 * Run with: npx ts-node src/lib/services/testMongoConnection.ts
 */

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error("MONGODB_URI is not configured in environment variables");
    process.exit(1);
  }

  console.log("Testing MongoDB connection...");
  console.log("URI:", uri.replace(/\/\/(.*?):(.*?)@/, "//****:****@")); // Hide credentials

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    
    console.log("✅ MongoDB connection successful!");
    
    // List collections to verify database access
    const collections = await mongoose.connection.db?.listCollections().toArray();
    console.log("📚 Available collections:", collections?.map(c => c.name) || "None found");
    
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ MongoDB connection failed:");
    if (error instanceof Error) {
      console.error("Message:", error.message);
      
      // Provide specific troubleshooting guidance
      if (error.message.includes("ECONNREFUSED")) {
        console.error("\n🔧 Troubleshooting tips:");
        console.error("1. Check if your IP is whitelisted in MongoDB Atlas");
        console.error("2. Verify your network connection");
        console.error("3. Ensure MongoDB Atlas cluster is running");
      } else if (error.message.includes("authentication")) {
        console.error("\n🔧 Troubleshooting tips:");
        console.error("1. Verify your MongoDB username and password");
        console.error("2. Check if the database user has proper permissions");
      }
    }
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testConnection().catch(console.error);
}

export default testConnection;