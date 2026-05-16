import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";

export async function GET() {
  try {
    console.log("Attempting to connect to MongoDB...");
    const db = await connectDB();
    console.log("MongoDB connection successful!");
    
    // Try a simple operation to verify the connection is working
    const collections = await db.connection.db?.listCollections().toArray();
    console.log("Available collections:", collections?.map(c => c.name));
    
    return NextResponse.json({ 
      success: true, 
      message: "MongoDB connection successful",
      collections: collections?.map(c => c.name) || []
    });
  } catch (error) {
    console.error("MongoDB connection test failed:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
}