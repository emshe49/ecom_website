import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../shared/utils/logger.js';

let isConnected = false;

export const connectDB = async (): Promise<typeof mongoose> => {
  if (isConnected) {
    logger.info('MongoDB is already connected', 'Database');
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    logger.info(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`, 'Database');

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection runtime error: ${err.message}`, 'Database');
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB disconnected', 'Database');
    });

    return conn;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    logger.error(`MongoDB connection failed: ${message}`, 'Database');
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (!isConnected && mongoose.connection.readyState === 0) {
    return;
  }

  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB connection closed gracefully', 'Database');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    logger.error(`Error closing MongoDB connection: ${message}`, 'Database');
  }
};

export const getDBStatus = (): { isConnected: boolean; state: string } => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const state = states[mongoose.connection.readyState] || 'unknown';
  return {
    isConnected: mongoose.connection.readyState === 1,
    state,
  };
};
