import http from 'http';
import dotenv from 'dotenv';
import { app } from './app';
import { initSocketServer } from './modules/game/game.socket';

// Load environment variables
dotenv.config();

const port = process.env.PORT || 3001;

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.IO engine
initSocketServer(server);

// Start server
server.listen(port, () => {
  console.log(`Quizora Server & Real-time Engine running on port ${port}`);
});
