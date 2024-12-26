import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import SpotifyWebApi from 'spotify-web-api-node';

const prisma = new PrismaClient();
const spotify = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

export const addSong: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { roomId } = req.params;
        const { spotifyUri, title, artist } = req.body;
        const userId = req.user.userId;

        // Check if song already exists in queue
        const existingSong = await prisma.song.findFirst({
            where: {
                roomId,
                spotifyUri,
                lastPlayed: null // Not played yet
            }
        });

        if (existingSong) {
            res.status(400).json({ error: 'Song already in queue' });
            return;
        }

        const song = await prisma.song.create({
            data: {
                title,
                artist,
                spotifyUri,
                roomId,
                addedBy: userId
            },
            include: {
                votes: true
            }
        });

        res.status(201).json(song);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add song' });
    }
};

export const getQueue: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { roomId } = req.params;

        const songs = await prisma.song.findMany({
            where: {
                roomId,
                lastPlayed: null // Not played yet
            },
            include: {
                _count: {
                    select: {
                        votes: true
                    }
                }
            },
            orderBy: {
                totalVotes: 'desc'
            }
        });

        res.json(songs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch queue' });
    }
};

export const searchSongs: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { query } = req.query;
        const { roomId } = req.params;

        // Get room's host
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: {
                host: {
                    select: {
                        spotifyToken: true
                    }
                }
            }
        });

        if (!room) {
            res.status(404).json({ error: 'Room not found' });
            return;
        }

        if (!room.host.spotifyToken) {
            res.status(403).json({ error: 'Room host not connected to Spotify' });
            return;
        }

        spotify.setAccessToken(room.host.spotifyToken);
        const results = await spotify.searchTracks(query as string);

        const simplifiedTracks = results.body.tracks?.items.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists[0].name,
            album: track.album.name,
            duration: track.duration_ms,
            spotifyUri: track.uri,
            albumArt: track.album.images[0]?.url
        })) || [];

        res.json(simplifiedTracks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to search songs' });
    }
};