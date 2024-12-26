import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import roomRoutes from './routes/room.routes';
import songRoutes from './routes/song.routes';
import voteRoutes from './routes/vote.routes';
import SocketService from './services/socket.service';
import playerRoutes from './routes/player.routes';


dotenv.config();
const app = express();
const server = createServer(app);
const socketService = new SocketService(server);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/player', playerRoutes);

const PORT = process.env.PORT || 3000;

// Export socketService for use in controllers
export { socketService };

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});