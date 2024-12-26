import { Router } from 'express';
import { voteSong } from '../controllers/vote.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/songs/:songId/vote', authMiddleware, voteSong);

export default router;
