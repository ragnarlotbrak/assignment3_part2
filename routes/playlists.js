const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../database/db-mongodb');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// All playlist routes require authentication
router.use(isAuthenticated);

//  Get all playlists for current user (or all for admin)
router.get('/', async (req, res) => {
    try {
        const db = getDb();

        // Check if user is admin
        const user = await db.collection('users').findOne({ _id: new ObjectId(req.session.userId) });
        const isAdmin = user && user.role === 'admin';

        let playlists;

        if (isAdmin) {
            // Admin sees all playlists with owner info
            playlists = await db.collection('playlists')
                .aggregate([
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'userId',
                            foreignField: '_id',
                            as: 'owner'
                        }
                    },
                    { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            name: 1,
                            description: 1,
                            coverUrl: 1,
                            tracks: 1,
                            userId: 1,
                            createdAt: 1,
                            'owner.username': 1,
                            'owner._id': 1
                        }
                    },
                    { $sort: { createdAt: -1 } }
                ])
                .toArray();
        } else {
            // Regular user sees only their playlists
            playlists = await db.collection('playlists')
                .find({ userId: new ObjectId(req.session.userId) })
                .sort({ createdAt: -1 })
                .toArray();
        }

        res.json(playlists);
    } catch (err) {
        console.error('Error fetching playlists:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/playlists/:id
router.get('/:id', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid playlist ID' });
        }

        const db = getDb();

        // Check if user is admin
        const user = await db.collection('users').findOne({ _id: new ObjectId(req.session.userId) });
        const isAdmin = user && user.role === 'admin';

        // Build query - admin can see any playlist, regular user only their own
        const query = { _id: new ObjectId(req.params.id) };
        if (!isAdmin) {
            query.userId = new ObjectId(req.session.userId);
        }

        const playlist = await db.collection('playlists').findOne(query);

        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        // Check if this is the user's own playlist
        playlist.isOwner = playlist.userId.toString() === req.session.userId;

        // Populate tracks
        if (playlist.tracks && playlist.tracks.length > 0) {
            const trackIds = playlist.tracks.map(id => new ObjectId(id));
            const tracks = await db.collection('tracks')
                .find({ _id: { $in: trackIds } })
                .toArray();
            playlist.tracksData = tracks;
        } else {
            playlist.tracksData = [];
        }

        res.json(playlist);
    } catch (err) {
        console.error('Error fetching playlist:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/playlists 
router.post('/', async (req, res) => {
    try {
        const { name, description, coverUrl } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Playlist name is required' });
        }

        if (name.length > 100) {
            return res.status(400).json({ error: 'Name must be 100 characters or less' });
        }

        const db = getDb();

        const newPlaylist = {
            name: name.trim(),
            description: description?.trim() || '',
            coverUrl: coverUrl?.trim() || '',
            userId: new ObjectId(req.session.userId),
            tracks: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection('playlists').insertOne(newPlaylist);
        res.status(201).json({ _id: result.insertedId, ...newPlaylist });
    } catch (err) {
        console.error('Error creating playlist:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/playlists/:id
router.put('/:id', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid playlist ID' });
        }

        const { name, description, coverUrl } = req.body;
        const updateData = { updatedAt: new Date() };

        if (name !== undefined) {
            if (name.trim().length === 0) {
                return res.status(400).json({ error: 'Playlist name cannot be empty' });
            }
            updateData.name = name.trim();
        }
        if (description !== undefined) {
            updateData.description = description.trim();
        }
        if (coverUrl !== undefined) {
            updateData.coverUrl = coverUrl.trim();
        }

        const db = getDb();
        const result = await db.collection('playlists').updateOne(
            {
                _id: new ObjectId(req.params.id),
                userId: new ObjectId(req.session.userId)
            },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        res.json({ message: 'Playlist updated successfully' });
    } catch (err) {
        console.error('Error updating playlist:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/playlists/:id/tracks
router.post('/:id/tracks', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid playlist ID' });
        }

        const { trackId } = req.body;

        if (!trackId || !ObjectId.isValid(trackId)) {
            return res.status(400).json({ error: 'Valid track ID is required' });
        }

        const db = getDb();

        // Verify track exists
        const track = await db.collection('tracks').findOne({ _id: new ObjectId(trackId) });
        if (!track) {
            return res.status(404).json({ error: 'Track not found' });
        }

        // Add track to playlist (avoid duplicates)
        const result = await db.collection('playlists').updateOne(
            {
                _id: new ObjectId(req.params.id),
                userId: new ObjectId(req.session.userId)
            },
            {
                $addToSet: { tracks: new ObjectId(trackId) },
                $set: { updatedAt: new Date() }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        res.json({ message: 'Track added to playlist', track });
    } catch (err) {
        console.error('Error adding track to playlist:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/playlists/:id/tracks/:trackId 
router.delete('/:id/tracks/:trackId', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id) || !ObjectId.isValid(req.params.trackId)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        const db = getDb();
        const result = await db.collection('playlists').updateOne(
            {
                _id: new ObjectId(req.params.id),
                userId: new ObjectId(req.session.userId)
            },
            {
                $pull: { tracks: new ObjectId(req.params.trackId) },
                $set: { updatedAt: new Date() }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        res.json({ message: 'Track removed from playlist' });
    } catch (err) {
        console.error('Error removing track from playlist:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/playlists/:id
router.delete('/:id', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid playlist ID' });
        }

        const db = getDb();
        const result = await db.collection('playlists').deleteOne({
            _id: new ObjectId(req.params.id),
            userId: new ObjectId(req.session.userId)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        res.json({ message: 'Playlist deleted successfully' });
    } catch (err) {
        console.error('Error deleting playlist:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
