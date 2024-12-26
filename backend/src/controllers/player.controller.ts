import { RequestHandler, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import SpotifyWebApi from 'spotify-web-api-node';
import { socketService } from '../index';

const prisma = new PrismaClient();
const spotify = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

export const playNextSong: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { roomId } = req.params;
        const userId = req.user.userId;

        // Verify user is room host
        const room = await prisma.room.findUnique({
            where: {
                id: roomId,
                hostId: userId
            },
            include: {
                host: {
                    select: { spotifyToken: true }
                }
            }
        });

        if (!room) {
            res.status(403).json({ error: 'Only room host can control playback' });
            return;
        }

        // Get next song from queue
        const nextSong = await prisma.song.findFirst({
            where: {
                roomId,
                lastPlayed: null
            },
            orderBy: {
                totalVotes: 'desc'
            }
        });

        if (!nextSong) {
            res.status(404).json({ error: 'No songs in queue' });
            return;
        }

        // Play the song on Spotify
        spotify.setAccessToken(room.host.spotifyToken!);

        // Get available devices
        const devices = await spotify.getMyDevices();
        console.log('Available devices:', devices.body.devices); // Debug log

        const activeDevice = devices.body.devices.find(device => device.is_active);
        if (!activeDevice) {
            res.status(400).json({ error: 'No active Spotify device found. Please open Spotify app.' });
            return;
        }

        try {
            await spotify.play({
                device_id: activeDevice.id!,
                uris: [nextSong.spotifyUri]
            });
        } catch (error: any) {
            console.error('Spotify play error:', error);
            res.status(500).json({ error: 'Spotify playback failed', details: error.message });
            return;
        }

        // Mark song as played
        await prisma.song.update({
            where: { id: nextSong.id },
            data: { lastPlayed: new Date() }
        });

        // Broadcast now playing update
        socketService.broadcastToRoom(roomId, {
            type: 'now_playing',
            song: nextSong
        });

        res.json({ message: 'Playing next song', song: nextSong });
    } catch (error) {
        console.error('Play next song error:', error); // Debug log
        res.status(500).json({ error: 'Failed to play next song' });
    }
};

export const getCurrentlyPlaying: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { roomId } = req.params;

        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: {
                host: {
                    select: { spotifyToken: true }
                }
            }
        });

        if (!room?.host.spotifyToken) {
            res.status(404).json({ error: 'Room not found or host not connected' });
            return;
        }

        spotify.setAccessToken(room.host.spotifyToken!);
        const playing = await spotify.getMyCurrentPlayingTrack();

        res.json(playing.body);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get currently playing track' });
    }
};

export const controlPlayback: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { roomId } = req.params;
        const { action } = req.body; // 'pause' or 'resume'
        const userId = req.user.userId;

        // Verify user is room host
        const room = await prisma.room.findUnique({
            where: {
                id: roomId,
                hostId: userId
            },
            include: {
                host: {
                    select: { spotifyToken: true }
                }
            }
        });

        if (!room) {
            res.status(403).json({ error: 'Only room host can control playback' });
            return;
        }

        spotify.setAccessToken(room.host.spotifyToken!);

        if (action === 'pause') {
            await spotify.pause();
        } else if (action === 'resume') {
            await spotify.play();
        }

        socketService.broadcastToRoom(roomId, {
            type: 'playback_update',
            status: action
        });

        res.json({ message: `Playback ${action}d` });
    } catch (error) {
        res.status(500).json({ error: 'Failed to control playback' });
    }
};

export const skipCurrentSong: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { roomId } = req.params;
        const userId = req.user.userId;

        // Verify user is room host
        const room = await prisma.room.findUnique({
            where: {
                id: roomId,
                hostId: userId
            },
            include: {
                host: {
                    select: { spotifyToken: true }
                }
            }
        });

        if (!room) {
            res.status(403).json({ error: 'Only room host can skip songs' });
            return;
        }

        spotify.setAccessToken(room.host.spotifyToken!);
        await spotify.skipToNext();

        // Call playNextSong directly with required parameters
        const nextReq = { ...req, params: { roomId } } as unknown as Request;
        const nextRes = res;
        await playNextSong(nextReq, nextRes, () => { });

    } catch (error) {
        console.error('Skip song error:', error);
        res.status(500).json({ error: 'Failed to skip song' });
    }
};

export const setVolume: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { roomId } = req.params;
        const { volume } = req.body; // 0-100
        const userId = req.user.userId;

        if (volume < 0 || volume > 100) {
            res.status(400).json({ error: 'Volume must be between 0 and 100' });
            return;
        }

        // Verify user is room host
        const room = await prisma.room.findUnique({
            where: {
                id: roomId,
                hostId: userId
            },
            include: {
                host: {
                    select: { spotifyToken: true }
                }
            }
        });

        if (!room) {
            res.status(403).json({ error: 'Only room host can control volume' });
            return;
        }

        spotify.setAccessToken(room.host.spotifyToken!);
        await spotify.setVolume(volume);

        socketService.broadcastToRoom(roomId, {
            type: 'volume_changed',
            volume
        });

        res.json({ message: 'Volume updated', volume });
    } catch (error) {
        console.error('Set volume error:', error);
        res.status(500).json({ error: 'Failed to set volume' });
    }
};
