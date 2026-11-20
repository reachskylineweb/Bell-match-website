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
                name TEXT NOT NULL,
                order_index INTEGER DEFAULT 0
            )`);

            // Sub Categories
            db.run(`CREATE TABLE IF NOT EXISTS sub_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                main_category_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                order_index INTEGER DEFAULT 0,
                FOREIGN KEY (main_category_id) REFERENCES main_categories(id)
            )`);

            // Products
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_code TEXT,
                box_size TEXT,
                no_of_sticks TEXT,
                stick_length TEXT,
                no_of_boxes_carton TEXT,
                specifications TEXT DEFAULT '[]',
                image_url TEXT NOT NULL,
                image_style TEXT DEFAULT 'contain',
                main_category_id INTEGER,
                sub_category_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (main_category_id) REFERENCES main_categories(id),
                FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id)
            )`);

            // Gallery Items
            db.run(`CREATE TABLE IF NOT EXISTS gallery_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                category TEXT NOT NULL DEFAULT 'production',
                media_type TEXT NOT NULL DEFAULT 'image',
                media_url TEXT NOT NULL,
                video_url TEXT,
                order_index INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Gallery Categories (Single-level, no sub-categories)
            db.run(`CREATE TABLE IF NOT EXISTS gallery_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                slug TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Seed initial gallery categories if empty
            db.get(`SELECT count(*) as count FROM gallery_categories`, [], (err, row) => {
                if (row && row.count === 0) {
                    console.log('Seeding initial gallery categories...');
                    const initialCats = [
                        { name: 'Production Line', slug: 'production' },
                        { name: 'Packaging Lines', slug: 'packaging' },
                        { name: 'Factory & Campus', slug: 'factory' }
                    ];
                    const stmt = db.prepare(`INSERT INTO gallery_categories (name, slug) VALUES (?, ?)`);
                    initialCats.forEach(c => stmt.run([c.name, c.slug]));
                    stmt.finalize();
                }
            });

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

            // Seed initial gallery items if empty
            db.get(`SELECT count(*) as count FROM gallery_items`, [], (err, row) => {
                if (row && row.count === 0) {
                    console.log('Seeding initial gallery items...');
                    const initialGallery = [
                        { title: 'The Bell Match Corporate Intro', category: 'factory', media_type: 'video', media_url: 'uploads/gallery_assets/bell_match_intro_poster.webp', video_url: 'https://www.youtube.com/watch?v=EGKJSDhPCHs' },
                        { title: 'Bell Match Campus Aerial Drone Tour', category: 'factory', media_type: 'video', media_url: 'uploads/gallery_assets/drone_factory_aerial_tour_poster.webp', video_url: 'https://www.youtube.com/watch?v=CEEtZiInKm0' },
                        { title: 'Chemical Dipping & Match Manufacturing', category: 'production', media_type: 'video', media_url: 'uploads/gallery_assets/035A0086_1_lpnotj_poster.webp', video_url: 'https://www.youtube.com/watch?v=Dn8DTWVG1n4' },
                        { title: 'Bell Match Factory Production Floor View', category: 'production', media_type: 'video', media_url: 'uploads/gallery_assets/DJI_0241_dqz2bj_poster.webp', video_url: 'https://www.youtube.com/watch?v=j9hujnlCoho' },
                        { title: 'Industrial Factory Campus Aerial Panorama', category: 'factory', media_type: 'video', media_url: 'uploads/gallery_assets/industrial_campus_aerial_pan_poster.webp', video_url: 'https://www.youtube.com/watch?v=OzVQWqyHP3Y' },
                        { title: 'Matchstick Hopper Feed Unit', category: 'production', media_type: 'image', media_url: 'uploads/gallery_assets/0N9A0923_hsj6m4.webp', video_url: null },
                        { title: 'Manufacturing Machinery Unit', category: 'production', media_type: 'image', media_url: 'uploads/gallery_assets/0N9A0938_wr4j2h.webp', video_url: null },
                        { title: 'Continuous Production Line', category: 'production', media_type: 'image', media_url: 'uploads/gallery_assets/0N9A0946_z6kmnb.webp', video_url: null },
                        { title: 'Dipping Assembly Machinery', category: 'production', media_type: 'image', media_url: 'uploads/gallery_assets/0N9A0954_flfshf.webp', video_url: null },
                        { title: 'High Speed Processing Unit', category: 'production', media_type: 'image', media_url: 'uploads/gallery_assets/0N9A0947_dbmjmq.webp', video_url: null },
                        { title: 'KD4 Continuous Match Dipping Line', category: 'production', media_type: 'image', media_url: 'uploads/gallery_assets/about_kd4_dipping.webp', video_url: null },
                        { title: 'Continuous Matchhead Dipping & Drying Conveyor', category: 'production', media_type: 'image', media_url: 'uploads/gallery_assets/0N9A0956_jqze5q.webp', video_url: null },
                        { title: 'Chemical Match Head Dipping Section', category: 'production', media_type: 'image', media_url: 'uploads/gallery_assets/about_manual_dipping.webp', video_url: null },
                        { title: 'Automated Safety Match Carton Packaging Line', category: 'packaging', media_type: 'video', media_url: 'uploads/gallery_assets/automated_match_production_poster.webp', video_url: 'https://www.youtube.com/watch?v=EojnvDyGbbo' },
                        { title: 'Matchbox Outer Cover Offset Printing Line', category: 'packaging', media_type: 'video', media_url: 'uploads/gallery_assets/035A0010_1_y9lfmp_poster.webp', video_url: 'https://www.youtube.com/watch?v=TxArzYxf6fc' },
                        { title: 'Offset Matchbox Packaging Printing Press', category: 'packaging', media_type: 'image', media_url: 'uploads/gallery_assets/0N9A1158_uyzcso.webp', video_url: null },
                        { title: '4-Colour Matchbox Packaging Printing Press', category: 'packaging', media_type: 'image', media_url: 'uploads/gallery_assets/about_4_colour_machine.webp', video_url: null },
                        { title: 'Automated Inner Box Filling & Outer Sleeving Line', category: 'packaging', media_type: 'image', media_url: 'uploads/gallery_assets/0N9A1050_a6uqfm.webp', video_url: null },
                        { title: 'Factory Matchbox Packing Hall & Quality Inspection', category: 'packaging', media_type: 'image', media_url: 'uploads/gallery_assets/0N9A1021_jffldv.webp', video_url: null },
                        { title: 'Manual Matchbox Sorting & Tray Packing Section', category: 'packaging', media_type: 'image', media_url: 'uploads/gallery_assets/about_box_filling.webp', video_url: null },
                        { title: 'Export Master Carton Palletizing & Container Loading', category: 'packaging', media_type: 'image', media_url: 'uploads/gallery_assets/about_container_loading.webp', video_url: null },
                        { title: 'Bookmatch Folding & Packaging Line', category: 'packaging', media_type: 'image', media_url: 'uploads/gallery_assets/about_bookmatch_2.webp', video_url: null },
                        { title: 'Finished Bookmatch Packaging & Quality Inspection', category: 'packaging', media_type: 'image', media_url: 'uploads/gallery_assets/about_bookmatch_3.webp', video_url: null },
                        { title: 'Matchbox Packaging Printing Unit', category: 'packaging', media_type: 'image', media_url: 'uploads/gallery_assets/0N9A1119_w9dlva.webp', video_url: null },
                        { title: 'Matchbox Cardboard Guillotine Cutting Line', category: 'packaging', media_type: 'image', media_url: 'uploads/gallery_assets/0N9A1123_f7awvc.webp', video_url: null },
                        { title: 'Automatic Box Die-Cutting & Blanking Machine', category: 'packaging', media_type: 'image', media_url: 'uploads/gallery_assets/0N9A1182_d5p28k.webp', video_url: null },
                        { title: 'Printing Quality Inspection Console', category: 'packaging', media_type: 'image', media_url: 'uploads/gallery_assets/0N9A1172_xvhfem.webp', video_url: null }
                    ];

                    const stmt = db.prepare(`INSERT INTO gallery_items (title, category, media_type, media_url, video_url, order_index) VALUES (?, ?, ?, ?, ?, ?)`);
                    initialGallery.forEach((item, index) => {
                        stmt.run([item.title, item.category, item.media_type, item.media_url, item.video_url, index + 1]);
                    });
                    stmt.finalize();
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
