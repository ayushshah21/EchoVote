import { Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const requireSpotifyAuth: RequestHandler = async (req, res, next): Promise<void> => {
    try {
        const userId = req.user.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { spotifyToken: true }
        });

        if (!user?.spotifyToken) {
            res.status(403).json({
                error: 'Spotify authentication required',
                spotifyAuthUrl: '/api/auth/spotify'
            });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({ error: 'Failed to verify Spotify authentication' });
    }
};
