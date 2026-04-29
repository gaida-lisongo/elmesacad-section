import mongoose from "mongoose";

type MongooseCache = {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
};

declare global {
    // eslint-disable-next-line no-var
    var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
    conn: null,
    promise: null,
};

global.mongooseCache = cached;

export const connectDB = async (): Promise<typeof mongoose> => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("MONGODB_URI is not configured.");
    }

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(uri, {
            bufferCommands: false,
        });
    }

    cached.conn = await cached.promise;
    return cached.conn;
};
