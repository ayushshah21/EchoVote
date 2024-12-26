import { Request, RequestHandler, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RegisterInput, LoginInput } from '../schemas/auth.schema';
import SpotifyWebApi from 'spotify-web-api-node';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || '';

const spotify = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

export const register: RequestHandler<{}, {}, RegisterInput> = async (req, res): Promise<void> => {
    try {
        const { email, password, name } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name
            }
        });

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const login: RequestHandler<{}, {}, LoginInput> = async (req, res): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Verify password
        const validPassword = await bcrypt.hash(password, user.password);
        if (!validPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const spotifyAuth: RequestHandler = async (req, res): Promise<void> => {
    const scopes = [
        'user-read-playback-state',
        'user-modify-playback-state',
        'streaming',
        'user-read-email',
        'user-read-private'
    ];

    const authorizeURL = spotify.createAuthorizeURL(scopes, 'state');
    res.json({ url: authorizeURL });
};

export const spotifyCallback: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { code } = req.query;

        if (!code) {
            res.status(400).json({ error: 'Authorization code missing' });
            return;
        }

        // Get the data from Spotify
        const data = await spotify.authorizationCodeGrant(code as string);
        const { access_token, refresh_token } = data.body;

        // For testing purposes, let's show the tokens directly
        // In production, you'd redirect to your frontend
        res.json({
            access_token,
            refresh_token,
            message: 'Please save these tokens using the /spotify/save-tokens endpoint'
        });

    } catch (error) {
        console.error('Spotify callback error:', error);
        res.status(500).json({ error: 'Failed to connect Spotify' });
    }
};

// Add new endpoint to save Spotify tokens
export const saveSpotifyTokens: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { access_token, refresh_token } = req.body;
        const userId = req.user.userId;

        await prisma.user.update({
            where: { id: userId },
            data: {
                spotifyToken: access_token,
                spotifyRefreshToken: refresh_token
            }
        });

        res.json({ message: 'Spotify connected successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save Spotify tokens' });
    }
};