const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./db');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = 'bellmatch_super_secret_key_2026';

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Universal Admin Redirects (Fix for malformed URL typing) - MUST be before static
app.get(['/admin', '/products.html/admin', '/index.html/admin', '/products/admin'], (req, res) => {
    res.redirect('/admin.html');
});

// Serve the frontend statically with clean URLs (auto-resolves .html)
app.use(express.static(path.join(__dirname, '..'), { extensions: ['html'] }));

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
const galleryUpload = multer({
    storage: storage,
    limits: { fileSize: 6 * 1024 * 1024 }
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        console.log('Auth failed: No token provided');
        return res.status(401).json({ error: 'Access denied' });
    }
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            console.log('Auth failed: Invalid or expired token');
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Login API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) return res.status(500).json({ error: 'Server error' });
            if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
            
            const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
            res.json({ token, message: 'Logged in successfully' });
        });
    });
});

// --- CATEGORIES API ---

// Get all main categories
app.get('/api/categories/main', (req, res) => {
    db.all(`SELECT * FROM main_categories ORDER BY order_index ASC, name ASC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add main category
app.post('/api/categories/main', authenticateToken, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    db.run(`INSERT INTO main_categories (name) VALUES (?)`, [name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, message: 'Main category added' });
    });
});

// Reorder main categories
app.post('/api/categories/main/reorder', authenticateToken, (req, res) => {
    const { order } = req.body;
    console.log('Main category reorder request:', order);
    if (!order || !Array.isArray(order)) return res.status(400).json({ error: 'Invalid order data' });
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        order.forEach(item => {
            db.run(`UPDATE main_categories SET order_index = ? WHERE id = ?`, [item.order_index, item.id], (err) => {
                if (err) console.error('Error updating main_category:', err);
            });
        });
        db.run('COMMIT', (err) => {
            if (err) {
                console.error('Commit error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Main categories reordered successfully' });
        });
    });
});

// Delete main category
app.delete('/api/categories/main/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    // Set products to uncategorized
    db.run(`UPDATE products SET main_category_id = NULL, sub_category_id = NULL WHERE main_category_id = ?`, [id], (err) => {
        // Delete all its subcategories
        db.run(`DELETE FROM sub_categories WHERE main_category_id = ?`, [id], (err) => {
            // Delete the main category
            db.run(`DELETE FROM main_categories WHERE id = ?`, [id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Main category deleted' });
            });
        });
    });
});

// Get all sub categories (optionally filter by main_id)
app.get('/api/categories/sub', (req, res) => {
    const mainId = req.query.main_id;
    let query = `SELECT * FROM sub_categories ORDER BY order_index ASC, name ASC`;
    let params = [];
    
    if (mainId) {
        query = `SELECT * FROM sub_categories WHERE main_category_id = ? ORDER BY order_index ASC, name ASC`;
        params = [mainId];
    }
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Reorder sub categories
app.post('/api/categories/sub/reorder', authenticateToken, (req, res) => {
    const { order } = req.body; // order is array of { id, order_index }
    console.log('Subcategory reorder request:', order);
    if (!order || !Array.isArray(order)) return res.status(400).json({ error: 'Invalid order data' });
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        order.forEach(item => {
            db.run(`UPDATE sub_categories SET order_index = ? WHERE id = ?`, [item.order_index, item.id], (err) => {
                if (err) console.error('Error updating sub_category:', err);
            });
        });
        db.run('COMMIT', (err) => {
            if (err) {
                console.error('Commit error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Sub categories reordered successfully' });
        });
    });
});

// Add sub category
app.post('/api/categories/sub', authenticateToken, (req, res) => {
    const { main_category_id, name } = req.body;
    if (!main_category_id || !name) return res.status(400).json({ error: 'Main Category ID and Name required' });
    
    db.run(`INSERT INTO sub_categories (main_category_id, name) VALUES (?, ?)`, [main_category_id, name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, main_category_id, name, message: 'Sub-category added' });
    });
});

// Delete sub category
app.delete('/api/categories/sub/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    db.run(`UPDATE products SET sub_category_id = NULL WHERE sub_category_id = ?`, [id], (err) => {
        db.run(`DELETE FROM sub_categories WHERE id = ?`, [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Sub-category deleted' });
        });
    });
});

// --- PRODUCTS API ---

// Get all products (with category names)
app.get('/api/products', (req, res) => {
    const query = `
        SELECT p.*, 
               m.name as main_category_name, 
               s.name as sub_category_name 
        FROM products p 
        LEFT JOIN main_categories m ON p.main_category_id = m.id 
        LEFT JOIN sub_categories s ON p.sub_category_id = s.id 
        ORDER BY 
            CASE WHEN p.id <= 57 THEN 1 ELSE 0 END ASC, 
            CASE WHEN p.id <= 57 THEN p.id ELSE -p.id END ASC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add a product
app.post('/api/products', authenticateToken, upload.single('image'), (req, res) => {
    const { main_category_id, sub_category_id, product_code, box_size, no_of_sticks, stick_length, no_of_boxes_carton, image_style, specifications } = req.body;
    
    if (!req.file) return res.status(400).json({ error: 'Image is required' });
    
    const imageUrl = '/uploads/' + req.file.filename;
    const m_id = main_category_id ? main_category_id : null;
    const s_id = sub_category_id ? sub_category_id : null;
    const style = image_style || 'contain';
    const specs = specifications || '[]';
    
    db.run(
        `INSERT INTO products (product_code, box_size, no_of_sticks, stick_length, no_of_boxes_carton, specifications, image_url, image_style, main_category_id, sub_category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [product_code, box_size, no_of_sticks, stick_length, no_of_boxes_carton, specs, imageUrl, style, m_id, s_id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Product added successfully' });
        }
    );
});

// Edit a product
app.put('/api/products/:id', authenticateToken, upload.single('image'), (req, res) => {
    const id = req.params.id;
    const { main_category_id, sub_category_id, product_code, box_size, no_of_sticks, stick_length, no_of_boxes_carton, image_style, specifications } = req.body;
    
    const m_id = main_category_id ? main_category_id : null;
    const s_id = sub_category_id ? sub_category_id : null;
    const style = image_style || 'contain';
    const specs = specifications || '[]';
    
    if (req.file) {
        const imageUrl = '/uploads/' + req.file.filename;
        
        // Fetch old image to delete it
        db.get(`SELECT image_url FROM products WHERE id = ?`, [id], (err, row) => {
            if (row && row.image_url) {
                const filename = path.basename(row.image_url);
                const filepath = path.join(uploadDir, filename);
                fs.unlink(filepath, (err) => {
                    if (err) console.error('Error deleting old image file:', err);
                });
            }
            
            db.run(
                `UPDATE products SET product_code=?, box_size=?, no_of_sticks=?, stick_length=?, no_of_boxes_carton=?, specifications=?, image_url=?, image_style=?, main_category_id=?, sub_category_id=? WHERE id=?`,
                [product_code, box_size, no_of_sticks, stick_length, no_of_boxes_carton, specs, imageUrl, style, m_id, s_id, id],
                function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Product updated successfully' });
                }
            );
        });
    } else {
        db.run(
            `UPDATE products SET product_code=?, box_size=?, no_of_sticks=?, stick_length=?, no_of_boxes_carton=?, specifications=?, image_style=?, main_category_id=?, sub_category_id=? WHERE id=?`,
            [product_code, box_size, no_of_sticks, stick_length, no_of_boxes_carton, specs, style, m_id, s_id, id],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Product updated successfully' });
            }
        );
    }
});

// Delete a product
app.delete('/api/products/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    
    db.get(`SELECT image_url FROM products WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Product not found' });
        
        db.run(`DELETE FROM products WHERE id = ?`, [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            if (row.image_url) {
                const filename = path.basename(row.image_url);
                const filepath = path.join(uploadDir, filename);
                fs.unlink(filepath, (err) => {
                    if (err) console.error('Error deleting image file:', err);
                });
            }
            
            res.json({ message: 'Product deleted successfully' });
        });
    });
});

// --- GALLERY API ---

// Helper function to extract YouTube ID
function getYoutubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// --- GALLERY CATEGORIES API (Single-level, no sub-categories) ---

// Get all gallery categories
app.get('/api/gallery-categories', (req, res) => {
    db.all(`SELECT * FROM gallery_categories ORDER BY id ASC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Add new gallery category
app.post('/api/gallery-categories', authenticateToken, (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });

    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;

    db.get(`SELECT id FROM gallery_categories WHERE LOWER(name) = LOWER(?) OR slug = ?`, [trimmedName, slug], (checkErr, existing) => {
        if (checkErr) return res.status(500).json({ error: checkErr.message });
        if (existing) return res.status(400).json({ error: 'A category with this name already exists' });

        db.run(
            `INSERT INTO gallery_categories (name, slug) VALUES (?, ?)`,
            [trimmedName, slug],
            function (insertErr) {
                if (insertErr) return res.status(500).json({ error: insertErr.message });
                res.json({ id: this.lastID, name: trimmedName, slug, message: 'Gallery category added successfully' });
            }
        );
    });
});

// Delete gallery category
app.delete('/api/gallery-categories/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM gallery_categories WHERE id = ?`, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Gallery category deleted successfully' });
    });
});

// --- GALLERY API ---

// Get all gallery items
app.get('/api/gallery', (req, res) => {
    db.all(`SELECT * FROM gallery_items ORDER BY order_index ASC, id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Add gallery item (Image or Video) - Max 6MB
app.post('/api/gallery', authenticateToken, (req, res) => {
    galleryUpload.single('image')(req, res, function (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Image size exceeds 6 MB limit.' });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        const { title, category, media_type, video_url } = req.body;
        const type = media_type || 'image';
        const cat = category || 'production';
        let mediaUrl = '';

        if (req.file) {
            if (req.file.size > 6 * 1024 * 1024) {
                fs.unlink(req.file.path, () => {});
                return res.status(400).json({ error: 'Image must be under 6 MB.' });
            }
            mediaUrl = '/uploads/' + req.file.filename;
        } else if (type === 'video' && video_url) {
            const ytId = getYoutubeId(video_url);
            if (ytId) {
                mediaUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
            } else {
                return res.status(400).json({ error: 'Please upload a thumbnail/poster image for this video.' });
            }
        } else {
            return res.status(400).json({ error: 'Image file is required.' });
        }

        db.run(
            `INSERT INTO gallery_items (title, category, media_type, media_url, video_url) VALUES (?, ?, ?, ?, ?)`,
            [title || '', cat, type, mediaUrl, video_url || null],
            function (insertErr) {
                if (insertErr) return res.status(500).json({ error: insertErr.message });
                res.json({ id: this.lastID, message: 'Gallery item added successfully', media_url: mediaUrl });
            }
        );
    });
});

// Edit gallery item
app.put('/api/gallery/:id', authenticateToken, (req, res) => {
    galleryUpload.single('image')(req, res, function (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Image size exceeds 6 MB limit.' });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        const id = req.params.id;
        const { title, category, media_type, video_url } = req.body;
        const type = media_type || 'image';
        const cat = category || 'production';

        if (req.file) {
            if (req.file.size > 6 * 1024 * 1024) {
                fs.unlink(req.file.path, () => {});
                return res.status(400).json({ error: 'Image must be under 6 MB.' });
            }
            const mediaUrl = '/uploads/' + req.file.filename;

            db.get(`SELECT media_url FROM gallery_items WHERE id = ?`, [id], (err, row) => {
                if (row && row.media_url && row.media_url.startsWith('/uploads/')) {
                    const filename = path.basename(row.media_url);
                    const filepath = path.join(uploadDir, filename);
                    fs.unlink(filepath, () => {});
                }

                db.run(
                    `UPDATE gallery_items SET title=?, category=?, media_type=?, media_url=?, video_url=? WHERE id=?`,
                    [title || '', cat, type, mediaUrl, video_url || null, id],
                    function (updateErr) {
                        if (updateErr) return res.status(500).json({ error: updateErr.message });
                        res.json({ message: 'Gallery item updated successfully' });
                    }
                );
            });
        } else {
            const ytId = (type === 'video' && video_url) ? getYoutubeId(video_url) : null;
            if (ytId) {
                db.run(
                    `UPDATE gallery_items SET title=?, category=?, media_type=?, media_url=?, video_url=? WHERE id=?`,
                    [title || '', cat, type, `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`, video_url, id],
                    function (updateErr) {
                        if (updateErr) return res.status(500).json({ error: updateErr.message });
                        res.json({ message: 'Gallery item updated successfully' });
                    }
                );
            } else {
                db.run(
                    `UPDATE gallery_items SET title=?, category=?, media_type=?, video_url=? WHERE id=?`,
                    [title || '', cat, type, video_url || null, id],
                    function (updateErr) {
                        if (updateErr) return res.status(500).json({ error: updateErr.message });
                        res.json({ message: 'Gallery item updated successfully' });
                    }
                );
            }
        }
    });
});

// Delete gallery item
app.delete('/api/gallery/:id', authenticateToken, (req, res) => {
    const id = req.params.id;

    db.get(`SELECT media_url FROM gallery_items WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Gallery item not found' });

        db.run(`DELETE FROM gallery_items WHERE id = ?`, [id], function (delErr) {
            if (delErr) return res.status(500).json({ error: delErr.message });

            if (row.media_url && row.media_url.startsWith('/uploads/')) {
                const filename = path.basename(row.media_url);
                const filepath = path.join(uploadDir, filename);
                fs.unlink(filepath, () => {});
            }

            res.json({ message: 'Gallery item deleted successfully' });
        });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});

if (String(PORT) !== '5500') {
    app.listen(5500, '0.0.0.0', () => {
        console.log(`Backend server is also running on http://localhost:5500`);
    });
}
