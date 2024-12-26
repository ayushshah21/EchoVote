import { Router } from 'express';
import { addSong, getQueue, searchSongs } from '../controllers/song.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireSpotifyAuth } from '../middleware/spotify.middleware';

const router = Router();

router.post('/rooms/:roomId/songs', authMiddleware, addSong);
router.get('/rooms/:roomId/queue', authMiddleware, getQueue);
router.get('/search', authMiddleware, requireSpotifyAuth, searchSongs);

export default router;