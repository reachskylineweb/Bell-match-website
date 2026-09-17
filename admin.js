const API_URL = 'http://localhost:5000/api';

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
        <div class="cat-item">
            <span>${c.name}</span>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteMainCat(${c.id})"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');

    // 2. Populate Dropdowns for adding sub category
    const parentSel = document.getElementById('parentMainCat');
    parentSel.innerHTML = '<option value="">Select Main Category</option>' + mainCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    // 3. Populate Sub Categories List
    const subList = document.getElementById('subCategoryList');
    subList.innerHTML = subCategories.map(s => {
        const parent = mainCategories.find(m => m.id === s.main_category_id);
        const parentName = parent ? parent.name : 'Unknown';
        return `
        <div class="cat-item">
            <span>${s.name} <small class="text-muted">(${parentName})</small></span>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteSubCat(${s.id})"><i class="fas fa-trash"></i></button>
        </div>`
    }).join('');

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
    const name = document.getElementById('newMainCat').value;
    await fetch(`${API_URL}/categories/main`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
        body: JSON.stringify({ name })
    });
    document.getElementById('newMainCat').value = '';
    loadAll();
});

document.getElementById('addSubCatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newSubCat').value;
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
    
    // Sync product code fields
    const activeCodeId = isCustom ? 'prodCodeDyn' : 'prodCode';
    const inactiveCodeId = isCustom ? 'prodCode' : 'prodCodeDyn';
    document.getElementById(inactiveCodeId).value = document.getElementById(activeCodeId).value;
    
    const codeVal = document.getElementById(activeCodeId).value;
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
                    viewMode: 2,
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

document.getElementById('cropApplyBtn').addEventListener('click', function() {
    if (!cropper) return;
    
    // Get cropped canvas and scale it down to ensure file size stays under 1MB
    const canvas = cropper.getCroppedCanvas({
        maxWidth: 1000,
        maxHeight: 1000
    });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Update live preview
    const pImg = document.getElementById('previewImg');
    pImg.onload = function() {
        this.style.objectFit = (this.naturalHeight > this.naturalWidth) ? 'contain' : 'cover';
    };
    pImg.src = dataUrl;
    document.getElementById('previewBlurBg').style.backgroundImage = `url('${dataUrl}')`;
    
    // Store as Blob for uploading
    canvas.toBlob(function(blob) {
        croppedImageBlob = blob;
    }, 'image/jpeg', 0.8);
    
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
    tbody.innerHTML = allProducts.map(p => {
        const catText = (p.main_category_name || 'Uncategorized') + (p.sub_category_name ? ` > ${p.sub_category_name}` : '');
        return `
        <tr>
            <td><img src="http://localhost:5000${p.image_url}" alt="Product" style="width: 50px; height: 50px; object-fit: contain; background: #eee; border-radius: 4px;"></td>
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
    const imgUrl = 'http://localhost:5000' + p.image_url;
    const eImg = document.getElementById('previewImg');
    eImg.onload = function() { this.style.objectFit = (this.naturalHeight > this.naturalWidth) ? 'contain' : 'cover'; };
    eImg.src = imgUrl;
    document.getElementById('previewBlurBg').style.backgroundImage = `url('${imgUrl}')`;
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
    document.getElementById('previewBlurBg').style.backgroundImage = `url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22250%22%20viewBox%3D%220%200%20400%20250%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23eeeeee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%20fill%3D%22%23999999%22%3EUpload%20Image%3C%2Ftext%3E%3C%2Fsvg%3E')`;
    croppedImageBlob = null;
    updateLivePreview();
    updateProdSubCategory();
});

document.getElementById('editExistingImgBtn').addEventListener('click', function() {
    const p = allProducts.find(x => x.id === editingProductId);
    if (!p) return;
    document.getElementById('cropperImage').src = 'http://localhost:5000' + p.image_url;
    const cropModal = new bootstrap.Modal(document.getElementById('cropperModal'));
    cropModal.show();
    document.getElementById('cropperModal').addEventListener('shown.bs.modal', function () {
        if (cropper) cropper.destroy();
        cropper = new Cropper(document.getElementById('cropperImage'), { viewMode: 2, autoCropArea: 0.9 });
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
    formData.append('product_code', document.getElementById(isCustom ? 'prodCodeDyn' : 'prodCode').value);
    
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
    
    if (croppedImageBlob) formData.append('image', croppedImageBlob, 'product_image.jpg');
    
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




