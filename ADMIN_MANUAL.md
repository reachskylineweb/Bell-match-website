# Bell Match Factory — Admin Dashboard & Product Management Manual
**Official Client Operational Guide & Quick Reference Document**  
*Document Ref: BM-DOC-2026-v2.0 | Publication Date: October 2026*  
*Target Audience: Bell Match Management, Sales Representatives, & Catalog Administrators*

---

## Executive Summary

The **Bell Match Administration Portal** is a web-based Content Management System (CMS) designed for factory managers and sales teams. It enables direct management of product lines, international export specifications, brand categories, and product imagery without any programming knowledge. 

All modifications made in this portal are reflected instantly across the global wholesale website.

---

## 1. Quick Access Credentials & Portal URLs

| Item | Details |
| :--- | :--- |
| **Live Portal URL** | [https://bell-match-website.vercel.app/admin](https://bell-match-website.vercel.app/admin) |
| **Public Catalog URL** | [https://bell-match-website.vercel.app/products](https://bell-match-website.vercel.app/products) |
| **Default Username** | `admin` |
| **Default Password** | `password123` |
| **Supported Devices** | Desktops, Laptops, Tablets, and Smartphones (Chrome, Safari, Edge, Firefox) |
| **Session Security** | Encrypted JWT Authentication (Automatic session preservation) |

---

## 2. Step-by-Step: Logging In

1. Open your browser and navigate to:  
   👉 **`https://bell-match-website.vercel.app/admin`**
2. On the login screen, enter:
   - **Username:** `admin`
   - **Password:** `password123`
3. Click the red **"Login to Dashboard"** button.
4. Upon authentication, you will be taken directly to the main workspace.

> **Note:** For security, your session stays active in your browser. You can log out anytime using the **"Logout"** button located at the top-right corner.

---

## 3. Step-by-Step: Adding a New Product

Scroll to the **"Add New Product"** section on the dashboard:

### Step 3.1: Enter Basic Identification
1. **Product Code:** Enter the unique factory SKU or item code (e.g., `BM-101`, `BX-40`, `DIVA-604`).
2. **Main Category:** Select the appropriate parent category from the dropdown (e.g., `ADVERTISING MATCHES`, `PAPER PRODUCTS`, `RESALE`).
3. **Sub Category:** Select the corresponding sub-category (e.g., `BOX MATCHES`, `MATCH BOOKS`, `CIGAR MATCH BOXES`).

### Step 3.2: Enter Technical Export Specifications
Fill in the standard export specification fields:
* **Box Size:** Outer box dimensions (e.g., `51 x 35 x 12 mm`).
* **No. of Sticks:** Splint count per box (e.g., `40 sticks` or `45/50 nos`).
* **Stick Length:** Splint length (e.g., `40 mm`, `47 mm`, `96 mm`).
* **No. of Boxes / Carton:** Master carton packaging quantity (e.g., `1000 boxes`, `500 boxes`).

### Step 3.3: Adding Custom Specifications (Optional)
If your product requires special export parameters (e.g., wood type, sulfur-free formulation, or striker design):
1. Click the **"+ Add Specification"** button.
2. Enter the **Specification Name** (e.g., `Wood Type`, `Head Color`, `Striker Side`).
3. Enter the **Value** (e.g., `Aspen Wood`, `Black Head`, `Honeycomb Striker`).
4. Repeat for as many custom parameters as needed.

### Step 3.4: Uploading & Cropping Product Images
1. Click **"Browse / Upload Image"** and choose your photo.
2. An interactive **Image Studio Cropper** modal will automatically appear.
3. Drag, reposition, or zoom the image to center the matchbox neatly within the frame.
4. Click **"Crop & Save"**.
5. The **Live Product Preview** card on the right will immediately display your card exactly as buyers see it online.

### Step 3.5: Finalizing the Product
1. Click the green **"Save Product"** button.
2. A success notification will confirm the submission.
3. The product is immediately available in the live catalog.

---

## 4. Step-by-Step: Editing / Altering an Existing Product

To update prices, stick counts, carton sizes, or replace old product images:

1. Scroll to the **"Manage Existing Products"** table at the bottom of the page.
2. **Locate the Product:**
   - Use the **Search bar** to type the product code or name.
   - Or filter by category using the dropdown.
3. Click the blue **"Edit"** button (pencil icon) on the product row.
4. The **Product Form** above will automatically populate with all existing data and the current photo.
5. Modify any desired fields (change stick count, update carton packaging, or upload a newly designed box artwork).
6. Click the blue **"Update Product"** button.
7. The changes take effect live instantly across the entire website.

---

## 5. Step-by-Step: Deleting a Product

If an item is discontinued:
1. Locate the product in the **"Manage Existing Products"** list.
2. Click the red **"Delete"** button (trash can icon).
3. When the browser confirmation prompt appears (*"Are you sure you want to delete this product?"*), click **OK**.
4. The product and its image are permanently removed from the website catalog and database.

---

## 6. Managing Categories (Main & Sub-Categories)

The dashboard allows you to create new catalog divisions dynamically:

### Adding a Main Category
1. Locate the **Main Categories** card on the top left.
2. Type the new category name in the input box (e.g., `HOTEL & RESORT MATCHES`).
3. Click **Add**. It immediately becomes available in website filter buttons.

### Adding a Sub-Category
1. Locate the **Sub Categories** card on the top right.
2. From the dropdown, select the **Main Category** it belongs under.
3. Type the sub-category name (e.g., `BOOKLET STYLE`).
4. Click **Add**.

---

## 7. 24/7 Cloud Uptime & Server Guarantee

The backend infrastructure is equipped with automated health-check monitoring via `cron-job.org`:
* **Keep-Alive Schedule:** Pinged every 5 minutes 24 hours a day, 7 days a week.
* **Guaranteed Responsiveness:** Eliminates free-tier sleep cycles and cold-start latency.
* **Instant Client Demonstrations:** The catalog, category filters, and admin dashboard load with zero boot delay during buyer calls and presentations.

---

## 8. Summary Checklist for Client Demos

| Step | Action | Status |
| :---: | :--- | :---: |
| 1 | Open `https://bell-match-website.vercel.app/products` | ✅ Ready |
| 2 | Verify all 61 products and sub-category filter pills | ✅ Ready |
| 3 | Log in to `https://bell-match-website.vercel.app/admin` (`admin` / `password123`) | ✅ Ready |
| 4 | Demonstrate live photo cropper & instant card preview | ✅ Ready |
| 5 | Showcase mobile responsiveness on phone browser | ✅ Ready |

---
*End of Document — The Bell Match Company Technical Support*
