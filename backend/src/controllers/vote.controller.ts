import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const voteSong: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { songId } = req.params;
        const userId = req.user.userId;
        const { value } = req.body; // 1 for upvote, -1 for downvote

        // Check if user already voted
        const existingVote = await prisma.vote.findFirst({
            where: {
                songId,
                userId
            }
        });

        if (existingVote) {
            res.status(400).json({ error: 'Already voted for this song' });
            return;
        }

        // Create vote and update song's total votes in a transaction
        const [vote, song] = await prisma.$transaction([
            prisma.vote.create({
                data: {
                    songId,
                    userId,
                    value
                }
            }),
            prisma.song.update({
                where: { id: songId },
                data: {
                    totalVotes: {
                        increment: value
                    }
                },
                include: {
                    votes: true
                }
            })
        ]);

        res.json(song);
    } catch (error) {
        res.status(500).json({ error: 'Failed to vote for song' });
    }
};
