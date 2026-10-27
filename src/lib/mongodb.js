import mongoose from 'mongoose';
import dns from 'dns';

// Only configure custom DNS resolvers on Windows where local loopback (127.0.0.1)
// fails to resolve MongoDB SRV records. On Linux (Vercel/AWS Lambda), use standard VPC DNS.
if (process.platform === 'win32') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // Ignore in environments where setting DNS servers is restricted
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hammo_task_manager';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, isConnected: false, error: null };
}

export async function connectToDatabase() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return { conn: cached.conn, isConnected: true, error: null };
  }

  if (!cached.promise) {
    if (process.platform === 'win32') {
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
      } catch (e) {
        console.warn('Could not set custom DNS servers:', e.message);
      }
    }

    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        cached.isConnected = true;
        cached.error = null;
        console.log('✅ Connected to MongoDB Atlas:', mongooseInstance.connection.name);
        return mongooseInstance;
      })
      .catch((err) => {
        cached.promise = null;
        cached.isConnected = false;
        cached.error = err.message;
        console.warn('⚠️ MongoDB connection could not be established:', err.message);
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
    const isConn = Boolean(cached.conn && mongoose.connection.readyState === 1);
    return { 
      conn: cached.conn, 
      isConnected: isConn,
      error: isConn ? null : cached.error
    };
  } catch (e) {
    cached.promise = null;
    cached.isConnected = false;
    cached.error = e.message;
    return { conn: null, isConnected: false, error: e.message };
  }
}

export default connectToDatabase;
