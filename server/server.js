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

// Serve the frontend statically with clean URLs (auto-resolves .html)
app.use(express.static(path.join(__dirname, '..'), { extensions: ['html'] }));

// Universal Admin Redirects (Fix for malformed URL typing)
app.get(['/admin', '/products.html/admin'], (req, res) => {
    res.redirect('/admin.html');
});

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

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
