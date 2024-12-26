import { Router } from 'express';
import { playNextSong, getCurrentlyPlaying, controlPlayback, skipCurrentSong, setVolume } from '../controllers/player.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/rooms/:roomId/play-next', authMiddleware, playNextSong);
router.get('/rooms/:roomId/now-playing', authMiddleware, getCurrentlyPlaying);
router.post('/rooms/:roomId/playback', authMiddleware, controlPlayback);
router.post('/rooms/:roomId/skip', authMiddleware, skipCurrentSong);
router.post('/rooms/:roomId/volume', authMiddleware, setVolume);

export default router;