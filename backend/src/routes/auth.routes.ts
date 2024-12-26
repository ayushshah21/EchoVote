import { Router } from 'express';
import { register, login, spotifyAuth, spotifyCallback, saveSpotifyTokens } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/spotify', authMiddleware, spotifyAuth);
router.get('/spotify/callback', spotifyCallback);
router.post('/spotify/save-tokens', authMiddleware, saveSpotifyTokens);

export default router;