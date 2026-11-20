const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname) || 
                window.location.hostname.startsWith('192.168.') || 
                window.location.hostname.startsWith('10.') || 
                window.location.hostname.endsWith('.local');
const API_BASE = window.location.port === '5000' 
    ? '' 
    : (isLocal ? `http://${window.location.hostname}:5000` : '');
const API_URL = `${API_BASE}/api`;

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('adminToken')) {
        showDashboard();
    } else {
        showLogin();
    }
});

function showLogin() { loginSection.style.display = 'block'; dashboardSection.style.display = 'none'; }
function showDashboard() { 
    loginSection.style.display = 'none'; 
    dashboardSection.style.display = 'block'; 
    loadAll();
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const res = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('adminToken', data.token);
            loginError.classList.add('d-none');
            loginForm.reset();
            showDashboard();
        } else {
            loginError.textContent = data.error; loginError.classList.remove('d-none');
        }
    } catch (err) {
        loginError.textContent = 'Server connection failed'; loginError.classList.remove('d-none');
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.removeItem('adminToken'); showLogin(); });

async function loadAll() {
    await loadCategories();
    await loadProducts();
    await loadGallery();
}

// --- CATEGORIES LOGIC ---
let mainCategories = [];
let subCategories = [];

async function loadCategories() {
    const mainRes = await fetch(`${API_URL}/categories/main`);
    mainCategories = await mainRes.json();
    const subRes = await fetch(`${API_URL}/categories/sub`);
    subCategories = await subRes.json();

    renderCategories();
}

function renderCategories() {
    // 1. Populate Main Categories List
    const mainList = document.getElementById('mainCategoryList');
    mainList.innerHTML = mainCategories.map(c => `
        <div class="cat-item" data-id="${c.id}" style="cursor: grab;">
            <span><i class="fas fa-grip-vertical text-muted me-2"></i>${c.name}</span>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteMainCat(${c.id})"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');

    if (window.Sortable) {
        Sortable.create(mainList, {
            animation: 150,
            onEnd: async function () {
                const order = Array.from(mainList.children).map((child, index) => ({
                    id: parseInt(child.getAttribute('data-id')),
                    order_index: index
                }));
                try {
                    await fetch(`${API_URL}/categories/main/reorder`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
                        body: JSON.stringify({ order })
                    });
                } catch(err) { console.error('Error reordering main categories:', err); }
            }
        });
    }

    // 2. Populate Dropdowns for adding sub category
    const parentSel = document.getElementById('parentMainCat');
    parentSel.innerHTML = '<option value="">Select Main Category</option>' + mainCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    // 3. Populate Sub Categories List
    const subList = document.getElementById('subCategoryList');
    subList.innerHTML = '';
    
    mainCategories.forEach(mainCat => {
        const subsForMain = subCategories.filter(s => s.main_category_id === mainCat.id);
        if (subsForMain.length === 0) return;
        
        const groupHeader = document.createElement('div');
        groupHeader.innerHTML = `<strong>${mainCat.name}</strong>`;
        groupHeader.style.padding = '15px 0 5px 0';
        groupHeader.style.borderBottom = '2px solid #eee';
        groupHeader.style.marginBottom = '8px';
        subList.appendChild(groupHeader);
        
        const groupContainer = document.createElement('div');
        groupContainer.className = 'sub-sort-group';
        groupContainer.innerHTML = subsForMain.map(s => `
            <div class="cat-item" data-id="${s.id}" style="cursor: grab;">
                <span><i class="fas fa-grip-vertical text-muted me-2"></i>${s.name}</span>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteSubCat(${s.id})"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
        subList.appendChild(groupContainer);
        
        if (window.Sortable) {
            Sortable.create(groupContainer, {
                animation: 150,
                onEnd: async function () {
                    const order = Array.from(groupContainer.children).map((child, index) => ({
                        id: parseInt(child.getAttribute('data-id')),
                        order_index: index
                    }));
                    try {
                        await fetch(`${API_URL}/categories/sub/reorder`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
                            body: JSON.stringify({ order })
                        });
                    } catch(err) { console.error('Error reordering sub categories:', err); }
                }
            });
        }
    });

    // 4. Populate Product Add Form Dropdowns
    const prodMain = document.getElementById('prodMainCategory');
    prodMain.innerHTML = '<option value="">Select Main Category</option>' + mainCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    updateProdSubCategory(); // Initial reset
}

document.getElementById('prodMainCategory').addEventListener('change', updateProdSubCategory);
function updateProdSubCategory() {
    const mainId = parseInt(document.getElementById('prodMainCategory').value);
    const prodSub = document.getElementById('prodSubCategory');
    if (!mainId) {
        prodSub.innerHTML = '<option value="">Select Sub Category</option>';
        return;
    }
    const filteredSubs = subCategories.filter(s => s.main_category_id === mainId);
    prodSub.innerHTML = '<option value="">Select Sub Category</option>' + filteredSubs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

document.getElementById('addMainCatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newMainCat').value.trim().toUpperCase();
    await fetch(`${API_URL}/categories/main`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
        body: JSON.stringify({ name })
    });
    document.getElementById('newMainCat').value = '';
    loadAll();
});

document.getElementById('addSubCatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newSubCat').value.trim().toUpperCase();
    const main_category_id = document.getElementById('parentMainCat').value;
    if(!main_category_id) return alert('Select a parent category');
    await fetch(`${API_URL}/categories/sub`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
        body: JSON.stringify({ name, main_category_id })
    });
    document.getElementById('newSubCat').value = '';
    loadAll();
});

async function deleteMainCat(id) {
    if(!confirm('Delete this main category? Products will become uncategorized. All its sub-categories will be deleted!')) return;
    await fetch(`${API_URL}/categories/main/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` } });
    loadAll();
}
async function deleteSubCat(id) {
    if(!confirm('Delete this sub category? Products will become uncategorized.')) return;
    await fetch(`${API_URL}/categories/sub/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` } });
    loadAll();
}

// --- PRODUCTS LOGIC ---
let editingProductId = null;
let allProducts = [];
let cropper = null;
let croppedImageBlob = null;

let specCount = 0;

window.addDynamicSpec = function(key = '', val = '') {
    const container = document.getElementById('dynamicSpecsContainer');
    const id = specCount++;
    const html = `
        <div class="row mb-2 spec-row" id="specRow_${id}">
            <div class="col-5">
                <input type="text" class="form-control spec-key" placeholder="e.g. Size" value="${key.replace(/"/g, '&quot;')}" oninput="updateLivePreview()">
            </div>
            <div class="col-6">
                <input type="text" class="form-control spec-val" placeholder="e.g. 50mm" value="${val.replace(/"/g, '&quot;')}" oninput="updateLivePreview()">
            </div>
            <div class="col-1 d-flex align-items-center">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="document.getElementById('specRow_${id}').remove(); updateLivePreview();"><i class="fas fa-times"></i></button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    updateLivePreview();
}

function getDynamicSpecs() {
    const specs = [];
    document.querySelectorAll('.spec-row').forEach(row => {
        const key = row.querySelector('.spec-key').value.trim();
        const val = row.querySelector('.spec-val').value.trim();
        if (key || val) {
            specs.push({ key, val });
        }
    });
    return specs;
}

window.toggleSpecTemplate = function() {
    const isCustom = document.getElementById('useCustomSpecsBtn').checked;
    document.getElementById('staticSpecsTemplate').style.display = isCustom ? 'none' : 'block';
    document.getElementById('dynamicSpecsTemplate').style.display = isCustom ? 'block' : 'none';
    updateLivePreview();
}

// Live Preview Logic
function updateLivePreview() {
    const isCustom = document.getElementById('useCustomSpecsBtn').checked;
    
    // Sync product code fields and enforce uppercase
    const activeCodeId = isCustom ? 'prodCodeDyn' : 'prodCode';
    const inactiveCodeId = isCustom ? 'prodCode' : 'prodCodeDyn';
    const codeVal = document.getElementById(activeCodeId).value.toUpperCase();
    document.getElementById(activeCodeId).value = codeVal;
    document.getElementById(inactiveCodeId).value = codeVal;
    
    document.getElementById('prevCode').textContent = codeVal ? codeVal : '-';
    
    const specsList = document.getElementById('prevDynamicSpecsList');
    
    if (isCustom) {
        const specs = getDynamicSpecs();
        specsList.innerHTML = specs.map(s => `
            <li style="display: flex; margin-bottom: 10px;"><span style="width: 160px; font-weight: bold; color: #1f2937; flex-shrink: 0;">${s.key || '-'}</span><span style="margin-right: 15px;">-</span><span>${s.val || '-'}</span></li>
        `).join('');
    } else {
        const fields = [
            { label: 'Box Size', val: document.getElementById('prodBoxSize').value },
            { label: 'No.of sticks', val: document.getElementById('prodNoSticks').value },
            { label: 'Stick Length', val: document.getElementById('prodStickLength').value },
            { label: 'No.of Boxes/Carton', val: document.getElementById('prodNoCarton').value }
        ];
        specsList.innerHTML = fields.map(f => `
            <li style="display: flex; margin-bottom: 10px;"><span style="width: 160px; font-weight: bold; color: #1f2937; flex-shrink: 0;">${f.label}</span><span style="margin-right: 15px;">-</span><span>${f.val || '-'}</span></li>
        `).join('');
    }
}

['prodCode', 'prodCodeDyn', 'prodBoxSize', 'prodNoSticks', 'prodStickLength', 'prodNoCarton'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateLivePreview);
});

// Cropper Logic
document.getElementById('prodImage').addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            document.getElementById('cropperImage').src = evt.target.result;
            const cropModal = new bootstrap.Modal(document.getElementById('cropperModal'));
            cropModal.show();
            
            document.getElementById('cropperModal').addEventListener('shown.bs.modal', function () {
                if (cropper) cropper.destroy();
                cropper = new Cropper(document.getElementById('cropperImage'), {
                    viewMode: 0,
                    autoCropArea: 0.9,
                });
            }, { once: true });
        }
        reader.readAsDataURL(this.files[0]);
    } else if (!editingProductId) {
        document.getElementById('previewImg').src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22250%22%20viewBox%3D%220%200%20400%20250%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23eeeeee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%20fill%3D%22%23999999%22%3EUpload%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';
        croppedImageBlob = null;
    }
});

document.getElementById('cropRotateLeft').addEventListener('click', function() {
    if (cropper) cropper.rotate(-90);
});

document.getElementById('cropRotateRight').addEventListener('click', function() {
    if (cropper) cropper.rotate(90);
});

document.getElementById('cropZoomIn').addEventListener('click', function() {
    if (cropper) cropper.zoom(0.1);
});

document.getElementById('cropZoomOut').addEventListener('click', function() {
    if (cropper) cropper.zoom(-0.1);
});

document.getElementById('cropApplyBtn').addEventListener('click', function() {
    if (!cropper) return;
    
    // Get cropped canvas and scale it down to ensure file size stays under 1MB
    const canvas = cropper.getCroppedCanvas({
        maxWidth: 1000,
        maxHeight: 1000
    });
    const dataUrl = canvas.toDataURL('image/png');
    
    // Update live preview
    const pImg = document.getElementById('previewImg');
    pImg.onload = function() {
        this.style.objectFit = (this.naturalHeight > this.naturalWidth) ? 'contain' : 'cover';
    };
    pImg.src = dataUrl;
    
    
    // Store as Blob for uploading
    canvas.toBlob(function(blob) {
        croppedImageBlob = blob;
    }, 'image/png');
    
    bootstrap.Modal.getInstance(document.getElementById('cropperModal')).hide();
});

async function loadProducts() {
    try {
        const res = await fetch(API_URL + '/products');
        allProducts = await res.json();
        renderProductsTable();
    } catch(err) {
        console.error(err);
    }
}

function renderProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    const searchEl = document.getElementById('adminProductSearch');
    const term = (searchEl ? searchEl.value : '').toLowerCase().trim();
    const filtered = term ? allProducts.filter(p => {
        const code = (p.product_code || '').toLowerCase();
        const cat = ((p.main_category_name || '') + ' ' + (p.sub_category_name || '')).toLowerCase();
        return code.includes(term) || cat.includes(term);
    }) : allProducts;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No matching products found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const catText = (p.main_category_name || 'Uncategorized') + (p.sub_category_name ? ` > ${p.sub_category_name}` : '');
        return `
        <tr>
            <td><img src="${API_BASE}${p.image_url}" alt="Product" style="width: 50px; height: 50px; object-fit: contain; background: #eee; border-radius: 4px;"></td>
            <td>${p.product_code || '-'}</td>
            <td><span class="badge bg-secondary">${catText}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-2" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `}).join('');
}

window.editProduct = function(id) {
    editingProductId = id;
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    
    document.getElementById('formTitle').textContent = 'Edit Product';
    document.getElementById('cancelEditBtn').classList.remove('d-none');
    document.getElementById('submitProductBtn').innerHTML = '<i class="fas fa-save me-2"></i> Update Product';
    document.getElementById('editExistingImgBtn').classList.remove('d-none');
    
    document.getElementById('prodCode').value = p.product_code || '';
    document.getElementById('prodCodeDyn').value = p.product_code || '';
    
    // Load dynamic specs
    document.getElementById('dynamicSpecsContainer').innerHTML = '';
    let parsedSpecs = [];
    try { parsedSpecs = JSON.parse(p.specifications || '[]'); } catch(e) {}
    
    if (parsedSpecs.length > 0) {
        document.getElementById('useCustomSpecsBtn').checked = true;
        parsedSpecs.forEach(s => addDynamicSpec(s.key, s.val));
        document.getElementById('prodBoxSize').value = '';
        document.getElementById('prodNoSticks').value = '';
        document.getElementById('prodStickLength').value = '';
        document.getElementById('prodNoCarton').value = '';
    } else {
        document.getElementById('useCustomSpecsBtn').checked = false;
        document.getElementById('prodBoxSize').value = p.box_size || '';
        document.getElementById('prodNoSticks').value = p.no_of_sticks || '';
        document.getElementById('prodStickLength').value = p.stick_length || '';
        document.getElementById('prodNoCarton').value = p.no_of_boxes_carton || '';
    }
    toggleSpecTemplate(); // Sync UI
    
    document.getElementById('prodMainCategory').value = p.main_category_id || '';
    updateProdSubCategory();
    document.getElementById('prodSubCategory').value = p.sub_category_id || '';
    
    // Set preview image
    const imgUrl = (p.image_url.startsWith('http') ? p.image_url : (API_BASE + p.image_url));
    const eImg = document.getElementById('previewImg');
    eImg.onload = function() { this.style.objectFit = (this.naturalHeight > this.naturalWidth) ? 'contain' : 'cover'; };
    eImg.src = imgUrl;
    
    updateLivePreview();
    
    document.getElementById('addProductForm').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('cancelEditBtn').addEventListener('click', () => {
    editingProductId = null;
    document.getElementById('formTitle').textContent = 'Add New Product';
    document.getElementById('cancelEditBtn').classList.add('d-none');
    document.getElementById('editExistingImgBtn').classList.add('d-none');
    document.getElementById('submitProductBtn').innerHTML = '<i class="fas fa-save me-2"></i> Save Product';
    document.getElementById('addProductForm').reset();
    document.getElementById('dynamicSpecsContainer').innerHTML = '';
    document.getElementById('useCustomSpecsBtn').checked = false;
    toggleSpecTemplate();
    document.getElementById('previewImg').src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22250%22%20viewBox%3D%220%200%20400%20250%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23eeeeee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%20fill%3D%22%23999999%22%3EUpload%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';
    
    croppedImageBlob = null;
    updateLivePreview();
    updateProdSubCategory();
});

document.getElementById('editExistingImgBtn').addEventListener('click', function() {
    const p = allProducts.find(x => x.id === editingProductId);
    if (!p) return;
    document.getElementById('cropperImage').src = (p.image_url.startsWith('http') ? p.image_url : (API_BASE + p.image_url));
    const cropModal = new bootstrap.Modal(document.getElementById('cropperModal'));
    cropModal.show();
    document.getElementById('cropperModal').addEventListener('shown.bs.modal', function () {
        if (cropper) cropper.destroy();
        cropper = new Cropper(document.getElementById('cropperImage'), { viewMode: 0, autoCropArea: 0.9 });
    }, { once: true });
});

document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitProductBtn');
    if (!editingProductId && !croppedImageBlob) return alert('Please select and crop an image for the new product.');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    const formData = new FormData();
    formData.append('main_category_id', document.getElementById('prodMainCategory').value);
    formData.append('sub_category_id', document.getElementById('prodSubCategory').value);
    
    const isCustom = document.getElementById('useCustomSpecsBtn').checked;
    const pCodeVal = document.getElementById(isCustom ? 'prodCodeDyn' : 'prodCode').value.trim().toUpperCase();
    formData.append('product_code', pCodeVal);
    
    if (isCustom) {
        formData.append('specifications', JSON.stringify(getDynamicSpecs()));
        formData.append('box_size', ''); formData.append('no_of_sticks', ''); formData.append('stick_length', ''); formData.append('no_of_boxes_carton', '');
    } else {
        formData.append('specifications', '[]');
        formData.append('box_size', document.getElementById('prodBoxSize').value);
        formData.append('no_of_sticks', document.getElementById('prodNoSticks').value);
        formData.append('stick_length', document.getElementById('prodStickLength').value);
        formData.append('no_of_boxes_carton', document.getElementById('prodNoCarton').value);
    }
    formData.append('image_style', 'contain');
    
    if (croppedImageBlob) formData.append('image', croppedImageBlob, 'product_image.png');
    
    const url = editingProductId ? `${API_URL}/products/${editingProductId}` : `${API_URL}/products`;
    const method = editingProductId ? 'PUT' : 'POST';
    
    const res = await fetch(url, { method: method, headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }, body: formData });
    
    if(res.ok) { 
        const shouldLock = document.getElementById('lockSpecsBtn') && document.getElementById('lockSpecsBtn').checked;
        let savedSpecs = [];
        if (shouldLock && !editingProductId) savedSpecs = getDynamicSpecs();
        
        document.getElementById('cancelEditBtn').click(); // Reset form & state
        
        if (shouldLock && !editingProductId) {
             document.getElementById('useCustomSpecsBtn').checked = true;
             toggleSpecTemplate();
             savedSpecs.forEach(s => addDynamicSpec(s.key, s.val));
             document.getElementById('lockSpecsBtn').checked = true;
        }
        
        loadProducts(); alert(editingProductId ? 'Product updated!' : 'Added successfully!'); 
    } else {
        const data = await res.json(); alert('Error: ' + (data.error || 'Failed to save product'));
    }
    btn.disabled = false;
});

async function deleteProduct(id) {
    if(!confirm('Delete this product?')) return;
    await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` } });
    loadAll();
}


// Sub Category Filter Logic
document.getElementById('filterSubCatInput').addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    const items = document.querySelectorAll('#subCategoryList .cat-item');
    items.forEach(item => {
        const text = item.querySelector('span').textContent.toLowerCase();
        item.style.display = text.includes(term) ? 'flex' : 'none';
    });
});

// Product Search Filter Logic
const adminProductSearchEl = document.getElementById('adminProductSearch');
if (adminProductSearchEl) {
    adminProductSearchEl.addEventListener('input', renderProductsTable);
}





// ==========================================
// --- GALLERY MANAGEMENT LOGIC ---
// ==========================================
let galleryItems = [];
let galleryCategories = [];
const MAX_GALLERY_FILE_SIZE = 6 * 1024 * 1024; // 6 MB limit

// Load Gallery Categories from API
async function loadGalleryCategories() {
    try {
        const res = await fetch(`${API_URL}/gallery-categories`);
        if (!res.ok) throw new Error('Failed to load gallery categories');
        galleryCategories = await res.json();
        renderGalleryCategories();
    } catch (err) {
        console.error('Error loading gallery categories:', err);
    }
}

// Render Gallery Categories List & Select Options
function renderGalleryCategories() {
    const listEl = document.getElementById('galleryCategoryList');
    const badgeEl = document.getElementById('galleryCatCountBadge');
    const selectEl = document.getElementById('galleryCategory');
    const filterEl = document.getElementById('galleryCategoryFilter');

    if (badgeEl) badgeEl.textContent = galleryCategories.length;

    // 1. Populate Category Manager List
    if (listEl) {
        if (galleryCategories.length === 0) {
            listEl.innerHTML = `<div class="text-muted text-center py-3 small">No categories added yet.</div>`;
        } else {
            listEl.innerHTML = galleryCategories.map(c => `
                <div class="cat-item d-flex justify-content-between align-items-center py-2 px-2 border-bottom">
                    <span class="fw-semibold text-dark"><i class="fas fa-tag text-muted me-2"></i>${c.name}</span>
                    <button type="button" class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteGalleryCat(${c.id})" title="Delete Category"><i class="fas fa-trash small"></i></button>
                </div>
            `).join('');
        }
    }

    // 2. Populate Form Category Dropdown (preserve current selection)
    if (selectEl) {
        const currentVal = selectEl.value;
        selectEl.innerHTML = galleryCategories.map(c => {
            const val = c.slug || c.name;
            return `<option value="${val}">${c.name}</option>`;
        }).join('');
        if (currentVal && Array.from(selectEl.options).some(o => o.value === currentVal)) {
            selectEl.value = currentVal;
        }
    }

    // 3. Populate Filter Dropdown in Table Header (preserve current filter)
    if (filterEl) {
        const currentFilter = filterEl.value;
        let filterHtml = `<option value="all">All Categories</option>`;
        filterHtml += `<option value="video">Videos Only</option>`;
        galleryCategories.forEach(c => {
            const val = c.slug || c.name;
            filterHtml += `<option value="${val}">${c.name}</option>`;
        });
        filterEl.innerHTML = filterHtml;
        if (currentFilter && Array.from(filterEl.options).some(o => o.value === currentFilter)) {
            filterEl.value = currentFilter;
        }
    }
}

// Add Gallery Category Form Submit
const addGalleryCatForm = document.getElementById('addGalleryCatForm');
if (addGalleryCatForm) {
    addGalleryCatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const input = document.getElementById('newGalleryCat');
        const name = (input ? input.value : '').trim();
        if (!name) return;

        try {
            const res = await fetch(`${API_URL}/gallery-categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({ name })
            });
            const data = await res.json();
            if (res.ok) {
                input.value = '';
                await loadGalleryCategories();
            } else {
                alert('Error: ' + (data.error || 'Failed to add category'));
            }
        } catch (err) {
            alert('Server error: Failed to connect.');
        }
    });
}

// Delete Gallery Category
async function deleteGalleryCat(id) {
    if (!confirm('Are you sure you want to delete this gallery category?')) return;
    try {
        const res = await fetch(`${API_URL}/gallery-categories/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        const data = await res.json();
        if (res.ok) {
            await loadGalleryCategories();
            renderGalleryTable();
        } else {
            alert('Error: ' + (data.error || 'Failed to delete category'));
        }
    } catch (err) {
        alert('Server error: Failed to connect.');
    }
}

function toggleGalleryMediaType() {
    const isVideo = document.getElementById('mediaTypeVideo').checked;
    const videoGroup = document.getElementById('galleryVideoGroup');
    const imageLabel = document.getElementById('galleryImageLabel');
    const videoUrlInput = document.getElementById('galleryVideoUrl');

    if (isVideo) {
        videoGroup.classList.remove('d-none');
        videoUrlInput.setAttribute('required', 'required');
        imageLabel.textContent = 'Upload Custom Video Poster (Optional - Max 6MB)';
    } else {
        videoGroup.classList.add('d-none');
        videoUrlInput.removeAttribute('required');
        videoUrlInput.value = '';
        imageLabel.textContent = 'Upload Image / Photo (Max 6MB)';
    }
}

// 6 MB Client-Side File Validation & Live Preview
const galleryImageInput = document.getElementById('galleryImageInput');
const galleryPreviewBox = document.getElementById('galleryPreviewBox');
const galleryPreviewImg = document.getElementById('galleryPreviewImg');
const galleryFileSizeDisplay = document.getElementById('galleryFileSizeDisplay');

if (galleryImageInput) {
    galleryImageInput.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) {
            galleryPreviewBox.classList.add('d-none');
            galleryFileSizeDisplay.textContent = 'No file chosen';
            galleryFileSizeDisplay.className = 'badge bg-light text-dark border';
            return;
        }

        // Strict 6 MB Check
        if (file.size > MAX_GALLERY_FILE_SIZE) {
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
            alert(`⚠️ File size exceeds limit!\nSelected file: ${sizeInMB} MB\nMaximum allowed: 6 MB.\n\nPlease choose an image under 6 MB.`);
            this.value = '';
            galleryPreviewBox.classList.add('d-none');
            galleryFileSizeDisplay.textContent = `${sizeInMB} MB (Too large)`;
            galleryFileSizeDisplay.className = 'badge bg-danger';
            return;
        }

        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        galleryFileSizeDisplay.textContent = `${sizeInMB} MB (Valid)`;
        galleryFileSizeDisplay.className = 'badge bg-success';

        const reader = new FileReader();
        reader.onload = (e) => {
            galleryPreviewImg.src = e.target.result;
            galleryPreviewBox.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
    });
}

// Load Gallery Items from API
async function loadGallery() {
    try {
        await loadGalleryCategories();
        const res = await fetch(`${API_URL}/gallery`);
        if (!res.ok) throw new Error('Failed to load gallery');
        galleryItems = await res.json();
        renderGalleryTable();
    } catch (err) {
        console.error('Error loading gallery:', err);
        const tbody = document.getElementById('galleryTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4"><i class="fas fa-exclamation-triangle me-1"></i> Could not connect to gallery API server</td></tr>`;
        }
    }
}

// Render Gallery Table
function renderGalleryTable() {
    const tbody = document.getElementById('galleryTableBody');
    const badge = document.getElementById('galleryCountBadge');
    if (!tbody) return;

    if (badge) badge.textContent = galleryItems.length;

    const filterCat = document.getElementById('galleryCategoryFilter')?.value || 'all';
    const searchTerm = (document.getElementById('gallerySearchInput')?.value || '').toLowerCase().trim();

    const filtered = galleryItems.filter(item => {
        const catObj = galleryCategories.find(c => c.slug === item.category || c.name.toLowerCase() === (item.category || '').toLowerCase());
        const matchesCat = filterCat === 'all' 
            ? true 
            : (filterCat === 'video' ? (item.media_type === 'video' || !!item.video_url) : (item.category === filterCat || (catObj && catObj.slug === filterCat)));
        const matchesSearch = !searchTerm || (item.title && item.title.toLowerCase().includes(searchTerm));
        return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">No gallery items found matching your filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(item => {
        const isVideo = item.media_type === 'video' || !!item.video_url;
        const typeBadge = isVideo 
            ? `<span class="badge bg-danger text-white"><i class="fas fa-play me-1"></i> Video</span>`
            : `<span class="badge bg-secondary text-white"><i class="fas fa-image me-1"></i> Photo</span>`;

        const catObj = galleryCategories.find(c => c.slug === item.category || c.name.toLowerCase() === (item.category || '').toLowerCase());
        const catLabel = catObj ? catObj.name : (item.category || 'General');

        let catBadgeClass = 'bg-primary';
        if (item.category === 'packaging' || catLabel.toLowerCase().includes('pack')) { catBadgeClass = 'bg-warning text-dark'; }
        else if (item.category === 'factory' || catLabel.toLowerCase().includes('fact') || catLabel.toLowerCase().includes('campus')) { catBadgeClass = 'bg-success'; }
        else if (item.category === 'production' || catLabel.toLowerCase().includes('prod')) { catBadgeClass = 'bg-info text-dark'; }
        else { catBadgeClass = 'bg-secondary text-white'; }

        let imgSrc = item.media_url || '';
        if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('//')) {
            imgSrc = imgSrc.startsWith('/') ? `${API_BASE}${imgSrc}` : `${API_BASE}/${imgSrc}`;
        }

        const videoLinkHtml = isVideo && item.video_url 
            ? `<a href="${item.video_url}" target="_blank" class="text-danger small ms-1" title="Open Video Link"><i class="fas fa-external-link-alt"></i></a>` 
            : '';

        return `
            <tr>
                <td class="px-2" style="width: 70px;">
                    <div style="position: relative; width: 56px; height: 46px; overflow: hidden; border-radius: 6px; border: 1px solid #cbd5e1; background: #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <img src="${imgSrc}" alt="" onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2256%22%20height%3D%2246%22%20viewBox%3D%220%200%2056%2046%22%3E%3Crect%20width%3D%2256%22%20height%3D%2246%22%20fill%3D%22%23cbd5e1%22%2F%3E%3Ctext%20x%3D%2228%22%20y%3D%2226%22%20font-size%3D%2214%22%20text-anchor%3D%22middle%22%20fill%3D%22%2364748b%22%3E%F0%9F%96%BC%EF%B8%8F%3C%2Ftext%3E%3C%2Fsvg%3E';" style="width: 100%; height: 100%; object-fit: cover;">
                        ${isVideo ? '<span style="position: absolute; bottom: 2px; right: 2px; background: rgba(0,0,0,0.75); color: #fff; font-size: 8px; padding: 1px 4px; border-radius: 3px;"><i class="fas fa-play"></i></span>' : ''}
                    </div>
                </td>
                <td class="py-2">
                    <div class="fw-bold text-dark mb-1" style="font-size: 0.92rem; line-height: 1.3;">${item.title || 'Untitled Item'} ${videoLinkHtml}</div>
                    <div class="d-flex align-items-center gap-1 flex-wrap">
                        <span class="badge ${catBadgeClass}" style="font-size: 0.72rem;">${catLabel}</span>
                        ${typeBadge}
                        ${isVideo && item.video_url ? `<span class="text-muted small text-truncate d-none d-sm-inline" style="max-width: 180px; font-size: 0.75rem;">${item.video_url}</span>` : ''}
                    </div>
                </td>
                <td class="text-end px-2" style="white-space: nowrap; width: 95px;">
                    <button class="btn btn-sm btn-outline-primary me-1 px-2 py-1" onclick="editGalleryItem(${item.id})" title="Alter / Edit"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn btn-sm btn-outline-danger px-2 py-1" onclick="deleteGalleryItem(${item.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterGalleryItems() {
    renderGalleryTable();
}

// Edit Gallery Item
function editGalleryItem(id) {
    const item = galleryItems.find(x => x.id === id);
    if (!item) return;

    document.getElementById('galleryEditId').value = item.id;
    document.getElementById('galleryTitle').value = item.title || '';
    document.getElementById('galleryCategory').value = item.category || 'production';

    const isVideo = item.media_type === 'video' || !!item.video_url;
    if (isVideo) {
        document.getElementById('mediaTypeVideo').checked = true;
        document.getElementById('galleryVideoUrl').value = item.video_url || '';
    } else {
        document.getElementById('mediaTypeImage').checked = true;
        document.getElementById('galleryVideoUrl').value = '';
    }
    toggleGalleryMediaType();

    // Mode title
    document.getElementById('galleryFormTitle').innerHTML = '<i class="fas fa-edit text-warning me-2"></i>Edit Gallery Item';
    document.getElementById('galleryModeBadge').textContent = 'Editing #' + item.id;
    document.getElementById('galleryModeBadge').className = 'badge bg-warning text-dark';
    document.getElementById('saveGalleryBtn').innerHTML = '<i class="fas fa-save me-1"></i> Update Item';
    document.getElementById('cancelGalleryEditBtn').classList.remove('d-none');

    // Show current image in preview
    if (item.media_url) {
        let imgSrc = item.media_url || '';
        if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('//')) {
            imgSrc = imgSrc.startsWith('/') ? `${API_BASE}${imgSrc}` : `${API_BASE}/${imgSrc}`;
        }
        galleryPreviewImg.src = imgSrc;
        galleryPreviewBox.classList.remove('d-none');
        galleryFileSizeDisplay.textContent = 'Existing Image';
        galleryFileSizeDisplay.className = 'badge bg-info text-dark';
    }

    // Scroll form into view
    document.getElementById('galleryForm').scrollIntoView({ behavior: 'smooth' });
}

// Reset Gallery Form
function resetGalleryForm() {
    document.getElementById('galleryForm').reset();
    document.getElementById('galleryEditId').value = '';
    document.getElementById('mediaTypeImage').checked = true;
    toggleGalleryMediaType();
    document.getElementById('galleryFormTitle').innerHTML = '<i class="fas fa-plus-circle text-primary me-2"></i>Add Gallery Item';
    document.getElementById('galleryModeBadge').textContent = 'New';
    document.getElementById('galleryModeBadge').className = 'badge bg-secondary';
    document.getElementById('saveGalleryBtn').innerHTML = '<i class="fas fa-plus me-1"></i> Save to Gallery';
    document.getElementById('cancelGalleryEditBtn').classList.add('d-none');
    galleryPreviewBox.classList.add('d-none');
    galleryPreviewImg.src = '';
    galleryFileSizeDisplay.textContent = 'No file chosen';
    galleryFileSizeDisplay.className = 'badge bg-light text-dark border';
}

// Gallery Form Submit
const galleryFormEl = document.getElementById('galleryForm');
if (galleryFormEl) {
    galleryFormEl.addEventListener('submit', async function (e) {
        e.preventDefault();

        const editId = document.getElementById('galleryEditId').value;
        const mediaType = document.getElementById('mediaTypeVideo').checked ? 'video' : 'image';
        const title = document.getElementById('galleryTitle').value.trim();
        const category = document.getElementById('galleryCategory').value;
        const videoUrl = document.getElementById('galleryVideoUrl').value.trim();
        const file = galleryImageInput.files[0];

        // Validation for new item
        if (!editId) {
            if (mediaType === 'image' && !file) {
                alert('Please select an image file to upload.');
                return;
            }
            if (mediaType === 'video' && !videoUrl) {
                alert('Please enter a video URL (e.g. YouTube link).');
                return;
            }
        }

        // Strict 6 MB Check
        if (file && file.size > MAX_GALLERY_FILE_SIZE) {
            alert('File size exceeds 6 MB limit! Please choose a smaller image.');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('category', category);
        formData.append('media_type', mediaType);
        if (videoUrl) formData.append('video_url', videoUrl);
        if (file) formData.append('image', file);

        const saveBtn = document.getElementById('saveGalleryBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Saving...';

        try {
            const url = editId ? `${API_URL}/gallery/${editId}` : `${API_URL}/gallery`;
            const method = editId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                alert(editId ? 'Gallery item updated successfully!' : 'Gallery item added successfully!');
                resetGalleryForm();
                await loadGallery();
            } else {
                alert('Error: ' + (data.error || 'Failed to save gallery item'));
            }
        } catch (err) {
            console.error('Gallery save error:', err);
            alert('Server error: Failed to connect to backend server.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = editId ? '<i class="fas fa-save me-1"></i> Update Item' : '<i class="fas fa-plus me-1"></i> Save to Gallery';
        }
    });
}

// Delete Gallery Item
async function deleteGalleryItem(id) {
    if (!confirm('Are you sure you want to delete this gallery item?')) return;

    try {
        const res = await fetch(`${API_URL}/gallery/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });

        const data = await res.json();
        if (res.ok) {
            alert('Gallery item deleted!');
            await loadGallery();
        } else {
            alert('Error: ' + (data.error || 'Failed to delete'));
        }
    } catch (err) {
        alert('Server error: Failed to connect.');
    }
}
