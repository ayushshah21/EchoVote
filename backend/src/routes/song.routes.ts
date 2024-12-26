import { Router } from 'express';
import { addSong, getQueue, searchSongs } from '../controllers/song.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireSpotifyAuth } from '../middleware/spotify.middleware';

const router = Router();

// Any authenticated user can search songs in a room
router.get('/rooms/:roomId/search', authMiddleware, searchSongs);
router.post('/rooms/:roomId/songs', authMiddleware, addSong);
router.get('/rooms/:roomId/queue', authMiddleware, getQueue);
router.get('/search', authMiddleware, requireSpotifyAuth, searchSongs);

export default router;