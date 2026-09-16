const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        db.serialize(() => {
            // Admin Users
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )`);

            // Main Categories
            db.run(`CREATE TABLE IF NOT EXISTS main_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            )`);

            // Sub Categories
            db.run(`CREATE TABLE IF NOT EXISTS sub_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                main_category_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                FOREIGN KEY (main_category_id) REFERENCES main_categories(id)
            )`);

            // Products
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                image_url TEXT NOT NULL,
                main_category_id INTEGER,
                sub_category_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (main_category_id) REFERENCES main_categories(id),
                FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id)
            )`);

            // Create default admin
            const defaultUser = 'admin';
            const defaultPassword = 'password123';
            db.get(`SELECT id FROM users WHERE username = ?`, [defaultUser], (err, row) => {
                if (!row) {
                    bcrypt.hash(defaultPassword, 10, (err, hash) => {
                        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [defaultUser, hash]);
                    });
                }
            });

            // Seed initial categories if none exist
            db.get(`SELECT count(*) as count FROM main_categories`, [], (err, row) => {
                if (row && row.count === 0) {
                    console.log('Seeding initial categories...');
                    
                    // Insert Resale matches
                    db.run(`INSERT INTO main_categories (name) VALUES ('Resale matches')`, function(err) {
                        const resaleId = this.lastID;
                        db.run(`INSERT INTO sub_categories (main_category_id, name) VALUES (?, 'Pocket matches')`, [resaleId]);
                        db.run(`INSERT INTO sub_categories (main_category_id, name) VALUES (?, 'Kitchen matches')`, [resaleId]);
                        db.run(`INSERT INTO sub_categories (main_category_id, name) VALUES (?, 'BBQ matches')`, [resaleId]);
                    });

                    // Insert Advertising matches
                    db.run(`INSERT INTO main_categories (name) VALUES ('Advertising matches')`, function(err) {
                        const advId = this.lastID;
                        db.run(`INSERT INTO sub_categories (main_category_id, name) VALUES (?, 'Boxes')`, [advId]);
                        db.run(`INSERT INTO sub_categories (main_category_id, name) VALUES (?, 'Matchbooks')`, [advId]);
                        db.run(`INSERT INTO sub_categories (main_category_id, name) VALUES (?, 'Specials')`, [advId]);
                    });
                }
            });
        });
    }
});

module.exports = db;
