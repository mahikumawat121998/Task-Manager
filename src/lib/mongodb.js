import mongoose from 'mongoose';
import dns from 'dns';

// Ensure reliable SRV resolution on Windows environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in environments where setting DNS servers is restricted
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hammo_task_manager';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, isConnected: false };
}

export async function connectToDatabase() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return { conn: cached.conn, isConnected: true };
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        cached.isConnected = true;
        console.log('✅ Connected to MongoDB Atlas:', mongooseInstance.connection.name);
        return mongooseInstance;
      })
      .catch((err) => {
        cached.promise = null;
        cached.isConnected = false;
        console.warn('⚠️ MongoDB connection could not be established:', err.message);
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
    const isConn = Boolean(cached.conn && mongoose.connection.readyState === 1);
    return { 
      conn: cached.conn, 
      isConnected: isConn
    };
  } catch (e) {
    cached.promise = null;
    cached.isConnected = false;
    return { conn: null, isConnected: false, error: e.message };
  }
}

export default connectToDatabase;
