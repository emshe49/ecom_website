import { Server } from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './database/mongoose.js';
import { logger } from './shared/utils/logger.js';
import { setupEmailEventHandlers } from './modules/email/email.events.js';

let server: Server | null = null;
let isShuttingDown = false;

const startServer = async (): Promise<void> => {
  try {
    logger.info(`Starting server in ${env.NODE_ENV} mode...`, 'Bootstrap');

    // Connect to database
    await connectDB();

    // Setup event handlers
    setupEmailEventHandlers();

    // Create Express application
    const app = createApp();

    // Start HTTP listener
    server = app.listen(env.PORT, () => {
      logger.info(`Server is running on http://localhost:${env.PORT}`, 'Bootstrap', {
        port: env.PORT,
        environment: env.NODE_ENV,
        clientUrl: env.CLIENT_URL,
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown startup error';
    logger.error(`Fatal startup failure: ${message}`, 'Bootstrap', {
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
};

const handleShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    logger.warn(`Shutdown already in progress, ignoring duplicate ${signal} signal.`, 'Shutdown');
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}. Initiating graceful shutdown...`, 'Shutdown');

  // Set timeout to force close if graceful shutdown hangs
  const forceExitTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s, forcing exit.', 'Shutdown');
    process.exit(1);
  }, 10000);

  try {
    // Stop accepting new HTTP requests
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => {
          if (err) return reject(err);
          logger.info('HTTP server closed.', 'Shutdown');
          resolve();
        });
      });
    }

    // Disconnect database
    await disconnectDB();

    clearTimeout(forceExitTimeout);
    logger.info('Graceful shutdown completed successfully.', 'Shutdown');
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExitTimeout);
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error during graceful shutdown: ${message}`, 'Shutdown');
    process.exit(1);
  }
};

// Process event listeners for graceful shutdown
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Uncaught exceptions & unhandled rejections
process.on('uncaughtException', (error: Error) => {
  logger.error(`Uncaught Exception: ${error.message}`, 'Process', { stack: error.stack });
  handleShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.error(`Unhandled Rejection: ${message}`, 'Process', {
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  handleShutdown('unhandledRejection');
});

// Launch server
startServer();
