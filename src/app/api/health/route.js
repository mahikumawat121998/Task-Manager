import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const { isConnected, error } = await connectToDatabase();
    
    return NextResponse.json({
      status: isConnected ? 'healthy' : 'degraded',
      database: {
        type: 'MongoDB',
        connected: isConnected,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host || 'none',
        name: mongoose.connection.name || 'none',
        uriProvided: Boolean(process.env.MONGODB_URI),
        error: error || null,
      },
      fallbackActive: !isConnected,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      connected: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
