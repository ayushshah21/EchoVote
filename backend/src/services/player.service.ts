import { PrismaClient } from '@prisma/client';
import SpotifyWebApi from 'spotify-web-api-node';
import { socketService } from '../index';

const prisma = new PrismaClient();
const POLLING_INTERVAL = 3000; // Check every 3 seconds

class PlayerService {
    private rooms: Map<string, NodeJS.Timeout> = new Map();
    private spotify: SpotifyWebApi;

    constructor() {
        this.spotify = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            redirectUri: process.env.SPOTIFY_REDIRECT_URI
        });
    }

    async startTracking(roomId: string, hostToken: string): Promise<void> {
        if (this.rooms.has(roomId)) return;

        const interval = setInterval(async () => {
            try {
                this.spotify.setAccessToken(hostToken);
                const playback = await this.spotify.getMyCurrentPlaybackState();

                if (!playback.body.is_playing && playback.body.progress_ms === 0) {
                    // Song ended, play next
                    await this.playNextSong(roomId, hostToken);
                }
            } catch (error) {
                console.error('Playback tracking error:', error);
            }
        }, POLLING_INTERVAL);

        this.rooms.set(roomId, interval);
    }

    stopTracking(roomId: string): void {
        const interval = this.rooms.get(roomId);
        if (interval) {
            clearInterval(interval);
            this.rooms.delete(roomId);
        }
    }

    private async playNextSong(roomId: string, hostToken: string): Promise<void> {
        try {
            const nextSong = await prisma.song.findFirst({
                where: {
                    roomId,
                    lastPlayed: null
                },
                orderBy: {
                    totalVotes: 'desc'
                }
            });

            if (!nextSong) return;

            this.spotify.setAccessToken(hostToken);
            const devices = await this.spotify.getMyDevices();
            const activeDevice = devices.body.devices.find(device => device.is_active);

            if (!activeDevice) return;

            await this.spotify.play({
                device_id: activeDevice.id!,
                uris: [nextSong.spotifyUri]
            });

            await prisma.song.update({
                where: { id: nextSong.id },
                data: { lastPlayed: new Date() }
            });

            socketService.broadcastToRoom(roomId, {
                type: 'now_playing',
                song: nextSong
            });
        } catch (error) {
            console.error('Auto-play next song error:', error);
        }
    }
}

export const playerService = new PlayerService();
