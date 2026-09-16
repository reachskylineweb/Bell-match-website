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
async function loadProducts() {
    const res = await fetch(`${API_URL}/products`);
    const products = await res.json();
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = products.length === 0 ? '<tr><td colspan="5" class="text-center py-4 text-muted">No products found.</td></tr>' : '';
    products.forEach(p => {
        const catText = (p.main_category_name || 'Uncategorized') + (p.sub_category_name ? ` > ${p.sub_category_name}` : '');
        tbody.innerHTML += `
            <tr>
                <td class="px-4"><img src="http://localhost:5000${p.image_url}" class="product-img-preview"></td>
                <td class="fw-bold">${p.name}</td>
                <td><span class="badge bg-secondary">${catText}</span></td>
                <td class="text-muted small">${p.description}</td>
                <td class="text-end px-4"><button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i> Delete</button></td>
            </tr>`;
    });
}

document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitProductBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
    const formData = new FormData();
    formData.append('name', document.getElementById('prodName').value);
    formData.append('description', document.getElementById('prodDescription').value);
    formData.append('main_category_id', document.getElementById('prodMainCategory').value);
    formData.append('sub_category_id', document.getElementById('prodSubCategory').value);
    formData.append('image', document.getElementById('prodImage').files[0]);
    
    const res = await fetch(`${API_URL}/products`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }, body: formData
    });
    
    if(res.ok) { document.getElementById('addProductForm').reset(); loadAll(); alert('Added successfully!'); }
    else alert('Error adding product');
    
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus me-2"></i> Add Product';
});

async function deleteProduct(id) {
    if(!confirm('Delete this product?')) return;
    await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` } });
    loadAll();
}
