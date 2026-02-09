const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../database/db-mongodb');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(isAuthenticated);
router.use(isAdmin);

// GET /api/admin/stats - Get platform statistics
router.get('/stats', async (req, res) => {
    try {
        const db = getDb();

        const [usersCount, tracksCount, playlistsCount] = await Promise.all([
            db.collection('users').countDocuments(),
            db.collection('tracks').countDocuments(),
            db.collection('playlists').countDocuments()
        ]);

        res.json({
            users: usersCount,
            tracks: tracksCount,
            playlists: playlistsCount
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/admin/users - Get all users
router.get('/users', async (req, res) => {
    try {
        const db = getDb();
        const users = await db.collection('users')
            .find({}, { projection: { password: 0 } }) // Exclude password
            .sort({ createdAt: -1 })
            .toArray();

        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/admin/users/:id/role - Update user role
router.patch('/users/:id/role', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const { role } = req.body;

        if (!role || !['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin".' });
        }

        const db = getDb();

        // Prevent self-demotion
        if (req.params.id === req.session.userId && role !== 'admin') {
            return res.status(400).json({ error: 'Cannot demote yourself from admin' });
        }

        // Protect super admin (admin@tynda.kz) from role changes
        const targetUser = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
        if (targetUser && targetUser.email === 'admin@tynda.kz' && role !== 'admin') {
            return res.status(403).json({ error: 'Cannot modify the super admin account' });
        }

        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { role, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: `User role updated to ${role}` });
    } catch (err) {
        console.error('Error updating user role:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/admin/users/:id - Delete a user
router.delete('/users/:id', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Prevent self-deletion
        if (req.params.id === req.session.userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const db = getDb();

        const result = await db.collection('users').deleteOne({
            _id: new ObjectId(req.params.id)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/admin/playlists - Get all playlists with owner info
router.get('/playlists', async (req, res) => {
    try {
        const db = getDb();
        const playlists = await db.collection('playlists')
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
                        tracks: 1,
                        createdAt: 1,
                        'owner.username': 1,
                        'owner.email': 1
                    }
                },
                { $sort: { createdAt: -1 } }
            ])
            .toArray();

        res.json(playlists);
    } catch (err) {
        console.error('Error fetching playlists:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
