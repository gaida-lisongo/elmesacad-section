import mongoose from "mongoose";

/**
 * Sans ceci, Mongoose met les requêtes en buffer ~10s si la connexion n’aboutit pas
 * (URI incorrecte, Mongo injoignable depuis le conteneur, etc.).
 */
mongoose.set("bufferCommands", false);

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
        const attempt = mongoose
            .connect(uri, {
                bufferCommands: false,
                serverSelectionTimeoutMS: 15_000,
                socketTimeoutMS: 45_000,
                maxPoolSize: 10,
                /** Souvent utile derrière Docker / réseaux où IPv6 pose problème. */
                family: 4,
            })
            .then((m) => {
                cached.conn = m;
                return m;
            })
            .catch((err) => {
                cached.promise = null;
                cached.conn = null;
                const msg = err instanceof Error ? err.message : String(err);
                console.error("[connectDB] MongoDB:", msg);
                throw err;
            });
        cached.promise = attempt;
    }

    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (e) {
        cached.promise = null;
        cached.conn = null;
        throw e;
    }
};
