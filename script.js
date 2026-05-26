// Firebase Configuration - ТУК СЛАГАШ ТВОИТЕ КЛЮЧОВЕ ОТ FIREBASE КОНЗОЛАТА
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);

let currentUser = null;
let currentFarmerData = null;
let currentPage = 1;
const productsPerPage = 6;
let currentFarmersPage = 1;
const farmersPerPage = 4;

let allFarmers = [];

let currentFilteredProducts = []; // IMPORTANT

// Auth State Listener (проверява дали си логнат)
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;

        // 1. Load farmer data
        const doc = await db.collection('farmers').doc(user.uid).get();

        if (!doc.exists) {
            console.error("No farmer data found");
            return;
        }

        currentFarmerData = doc.data();

        // 2. Update UI
        updateUIForLoggedInFarmer();

        // 3. SHOW dashboard FIRST
        navigateTo('dashboard');

        // 4. THEN load products
        await loadMyProducts(user.uid);
        await loadAllProducts();

    } else {
        currentUser = null;
        currentFarmerData = null;
        updateUIForGuest();
        await loadAllProducts(); 
    }
});


// UI Updates
function updateUIForLoggedInFarmer() {
    // Сменяме бутона на "Моят профил"
    document.getElementById('authSection').innerHTML = 
        '<a href="#" onclick="navigateTo(\'dashboard\'); return false;">Моят профил</a>';
    // Обновяваме и футъра
    const footerLoginLink = document.querySelector('.footer-links a[onclick*="showLoginModal"]');
        if (footerLoginLink) {
            footerLoginLink.textContent = 'Моят профил';
            footerLoginLink.setAttribute('onclick', 'navigateTo(\'dashboard\'); return false;');
        }
    // Показваме името
    document.getElementById('farmerName').textContent = currentFarmerData.owner || '';
    // Скролваме нагоре
}


// Guest updates
function updateUIForGuest() {
    document.getElementById('authSection').innerHTML = 
        `<a href="#" onclick="showLoginModal(); return false;">Вход</a> | <a href="#" onclick="showRegisterModal(); return false;">Регистрация</a>`;
    // Връщаме футъра към "Вход за фермери"
    const footerLoginLink = document.querySelector('.footer-links a[onclick="navigateTo(\'dashboard\')]');
        if (footerLoginLink) {
            footerLoginLink.textContent = 'Вход за фермери';
            footerLoginLink.setAttribute('onclick', 'showLoginModal(); return false;');
        }
    
    navigateTo('public');
}

// Modal Functions
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

// Navigation
function navigateTo(view) {
    setView(view);

    if (view === 'dashboard') {
        if (currentUser) {
            loadFarmerOrders(currentUser.uid);
        }
    }

    window.scrollTo(0, 0);
}




//Load Orders for Farmer Dashboard
async function loadFarmerOrders(farmerId) {
    const container = document.getElementById('farmerOrders');
    if (!container) {
        console.error("❌ farmerOrders container NOT FOUND");
        return;
    }
    
    container.innerHTML = '<p>Зареждане на поръчки...</p>';
    
    
    try {
        // ПРОСТА ЗАЯВКА - само where, без orderBy
        const snapshot = await db.collection('orders')
            .where('farmerId', '==', farmerId)
            .orderBy('createdAt', 'desc')
            .get();
        
        
        
        if (snapshot.empty) {
            container.innerHTML = '<p>Все още нямате получени поръчки.</p>';
            return;
        }
        


         container.innerHTML = '';
        
        // Събираме поръчките в масив за сортиране
        const orders = [];
        snapshot.forEach(doc => {
            orders.push({ id: doc.id, data: doc.data() });
        });
        
        // Сортираме: new най-отгоре, viewed по средата, completed най-долу
        orders.sort((a, b) => {
            const priority = { 'new': 0, 'viewed': 1, 'completed': 2 };
            const pA = priority[a.data.status] || 0;
            const pB = priority[b.data.status] || 0;
            return pA - pB;
        });
        
        // Показваме сортираните поръчки
        orders.forEach(item => {
            const order = item.data;
            const docId = item.id;
            
            
            
            const orderDate = order.createdAt ? order.createdAt.toDate().toLocaleString('bg-BG') : 'Няма дата';
            const statusClass = order.status || 'new';
            const statusText = {
                'new': 'Нова',
                'viewed': 'Видяна',
                'completed': 'Завършена'
            }[statusClass] || 'Нова';
            
            const card = document.createElement('div');
            card.className = 'order-card ' + statusClass;
            card.innerHTML = `
                <div class="order-header">
                    <span class="order-customer">${order.customerName || 'Без име'}</span>
                    <span class="order-date">${orderDate}</span>
                </div>
                <div class="order-product">📦 Продукт: ${order.productName || 'Неизвестен продукт'}</div>
                <div class="order-phone">📞 ${order.customerPhone || 'Няма телефон'}</div>
                <div class="order-message">"${order.message || 'Без съобщение'}"</div>
                <span class="order-status status-${statusClass}">${statusText}</span>
                <div class="order-actions">
                    ${statusClass === 'new' ? `<button class="btn-small btn-view" onclick="updateOrderStatus('${docId}', 'viewed')">Маркирай като видяна</button>` : ''}
                    ${statusClass !== 'completed' ? `<button class="btn-small btn-complete" onclick="updateOrderStatus('${docId}', 'completed')">Маркирай като завършена</button>` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Грешка при зареждане на поръчки:", error);
        container.innerHTML = '<p style="color: red;">Грешка при зареждане: ' + error.message + '</p>';
    }
}



async function updateOrderStatus(orderId, newStatus) {
    try {
        await db.collection('orders').doc(orderId).update({
            status: newStatus
        });
        // Презареждаме поръчките
        if (currentUser) {
            loadFarmerOrders(currentUser.uid);
        }
    } catch (error) {
        console.error("Грешка:", error);
        alert("Грешка при обновяване на статуса");
    }
}



// Login
async function login(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        closeLoginModal();

        // In login() function after closeLoginModal()
        //document.getElementById('loginForm').reset();

    } catch (error) {
        let message;

        if (error.code === "auth/invalid-email") {
            message = "Невалиден имейл.";
        } else if (error.code === "auth/invalid-credential") {
            message = "Грешен имейл или парола.";
        } else {
            message = "Възникна грешка. Опитайте отново.";
        }

        alert(message);
    }
}

// Logout
async function logout() {
    await auth.signOut();
}

function setView(mode) {
    const dashboard = document.getElementById('farmerDashboard');
    const filters = document.getElementById('mainFilters');
    const products = document.getElementById('products');
    const farmers = document.getElementById('farmers');
    const about = document.getElementById('about');

    if (mode === 'dashboard') {
        dashboard.style.display = 'block';
        filters.style.display = 'none';
        products.style.display = 'none';
        farmers.style.display = 'none';
        about.style.display = 'none';
    } else {
        dashboard.style.display = 'none';
        filters.style.display = 'flex';
        products.style.display = 'block';
        farmers.style.display = 'block';
        about.style.display = 'block';
    }
}



// Add Product
async function addProduct(e) {
    e.preventDefault();
    
    // ВАЛИДАЦИЯ - проверяваме дали полетата са празни
    const name = document.getElementById('prodName').value.trim();
    const price = document.getElementById('prodPrice').value.trim();
    const description = document.getElementById('prodDesc').value.trim();
    const imageFile = document.getElementById('prodImage').files[0];
    
    if (!name || !price || !description) {
        alert("Моля, попълнете всички полета!");
        return;
    }
    
    if (name.length < 2) {
        alert("Името на продукта трябва да е поне 2 символа!");
        return;
    }
    
    // Проверка за цена (да съдържа поне една цифра)
    if (!/\d/.test(price)) {
        alert("Моля, въведете валидна цена (напр. 6.00 eв.)!");
        return;
    }
    

    // Спира бутона временно
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Запазване...";
    
    if (!currentUser || !currentFarmerData) {
        alert("Трябва да сте влезли!");
        submitBtn.disabled = false;
        submitBtn.textContent = "Добави продукт";
        return;
    }

    let imageBase64 = '';

    if (imageFile && imageFile.size > 800000) {
        
        alert("Снимката е прекалено голяма. Моля, качете по-малка снимка.");
        return;
    }

    if (imageFile) {
        imageBase64 = await toBase64(imageFile);
    }


    try {
        const productData = {
            name: document.getElementById('prodName').value,
            category: document.getElementById('category').value,
            image: imageBase64,
            emoji: getEmojiForCategory(document.getElementById('category').value),
            price: document.getElementById('prodPrice').value,
            description: document.getElementById('prodDesc').value,
            available: document.getElementById('prodAvailable').checked, // НОВО
            farmerId: currentUser.uid,
            farmerName: currentFarmerData.name,
            location: currentFarmerData.location,
            coords: currentFarmerData.coords,
            createdAt: new Date(),
        };
        
        // Запазваме в базата
        await db.collection('products').add(productData);
        
        // Изчистваме формата
        document.getElementById('productForm').reset();
        
        alert("Продуктът е добавен успешно!");
        
        // Презареждаме списъка (това работеше преди)
        await loadMyProducts(currentUser.uid);
        loadAllProducts();
        
    } catch (error) {
        console.error("Грешка:", error);
        alert("Грешка при добавяне: " + error.message);
    } finally {
        // Връщаме бутона
        submitBtn.disabled = false;
        submitBtn.textContent = "Добави продукт";
    }
}

//Convert image text string
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.readAsDataURL(file);

        reader.onload = () => resolve(reader.result);

        reader.onerror = error => reject(error);
    });
}

// Read file input by element id and return base64 or null
async function getFileBase64ById(inputId, sizeLimit = 800000) {
    const input = document.getElementById(inputId);
    if (!input || !input.files || input.files.length === 0) return null;
    const file = input.files[0];
    if (file && file.size > sizeLimit) {
        alert('Снимката е прекалено голяма. Моля, качете по-малка снимка.');
        return null;
    }
    return await toBase64(file);
}

function escapeHtml(text) {
    if (text === undefined || text === null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


function getEmojiForCategory(cat) {
    if (!cat) return '📦';
    const c = cat.toLowerCase().trim();
    
    // Яйца
    if (c.includes('яйца') || c.includes('яйце') || c.includes('egg')) return '🥚';
    
    // Месо
    if (c.includes('месо') || c.includes('пиле') || c.includes('телешко') || c.includes('свинско') || c.includes('агнешко') || c.includes('пилешко') || c.includes('кайма') || c.includes('meat') || c.includes('chicken') || c.includes('beef') || c.includes('pork')) return '🥩';
    
    // Мед
    if (c.includes('мед') || c.includes('пчелен') || c.includes('восък') || c.includes('honey')) return '🍯';
    
    // Млечни
    if (c.includes('сирене') || c.includes('кашкавал') || c.includes('мляко') || c.includes('млечни')|| c.includes('кисело мляко') || c.includes('йогурт') || c.includes('извара') || c.includes('масло') || c.includes('cheese') || c.includes('milk') || c.includes('butter') || c.includes('yogurt')) return '🥛';
    
    // Зеленчуци
    if (c.includes('зеленчук') || c.includes('домат') || c.includes('краставица') || c.includes('чушка') || c.includes('лук') || c.includes('чесън') || c.includes('тиква') || c.includes('морков') || c.includes('зеле') || c.includes('спанак') || c.includes('vegetable') || c.includes('tomato') || c.includes('pepper') || c.includes('cucumber') || c.includes('onion') || c.includes('garlic') || c.includes('carrot') || c.includes('cabbage')) return '🥒';
    
    // Плодове
    if (c.includes('плод') || c.includes('ябълка') || c.includes('круша') || c.includes('слива') || c.includes('праскова') || c.includes('череша') || c.includes('ягода') || c.includes('малина') || c.includes('кайсия') || c.includes('грозде') || c.includes('fruit') || c.includes('apple') || c.includes('pear') || c.includes('plum') || c.includes('peach') || c.includes('cherry') || c.includes('strawberry') || c.includes('raspberry') || c.includes('grape')) return '🍎';
    
    // Хляб
    if (c.includes('хляб') || c.includes('питка') || c.includes('баница') || c.includes('тутманик') || c.includes('мекици') || c.includes('погача') || c.includes('bread') || c.includes('pastry')) return '🍞';
    
    // Билки/подправки
    if (c.includes('билки') || c.includes('чай') || c.includes('подправки') || c.includes('herb') || c.includes('tea') || c.includes('spice')) return '🌿';
    
    // Вино/алкохол
    if (c.includes('вино') || c.includes('алкохол') || c.includes('ракия') || c.includes('бира') || c.includes('wine') || c.includes('beer')) return '🍷';
    
    // Ядки
    if (c.includes('ядки') || c.includes('орех') || c.includes('лешник') || c.includes('бадем') || c.includes('nuts') || c.includes('walnut')) return '🥜';
    
    // Цветя/растения
    if (c.includes('цветя') || c.includes('рози') || c.includes('растения') || c.includes('flower') || c.includes('plant')) return '🌸';
    
    // По подразбиране
    return '📦';
}


// Load My Products (for dashboard)
async function loadMyProducts(farmerId) {


    if (!farmerId) {
        console.error("❌ Missing farmerId in loadMyProducts");
        return;
    }

    const container = document.getElementById('myProducts');

    if (!container) {
        console.error("❌ myProducts container NOT FOUND");
        return;
    }

    container.innerHTML = 'Зареждане...';

    try {
        const snapshot = await db.collection('products')
            .where('farmerId', '==', farmerId)
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<p>Все още нямате добавени продукти.</p>';
            return;
        }

        container.innerHTML = '';

        snapshot.forEach(doc => {
            const product = doc.data();
            const card = createProductCard(doc.id, product, true);
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading products:", error);
        container.innerHTML = '<p style="padding: 1rem; color: red;">Грешка при зареждане на продуктите. Опитайте отново.</p>';
    }
}

// Load Farmers (for public view)
async function loadAllProducts() {
    currentPage = 1;
    const grid = document.getElementById('productsGrid');
    if (grid) grid.innerHTML = 'Зареждане...';
    
    try {
        const snapshot = await db.collection('products')
            .orderBy('createdAt', 'desc')
            .get();
        window.allProducts = []; // Store for filtering
        
        snapshot.forEach(doc => {
            window.allProducts.push({ id: doc.id, ...doc.data() });
        });
        
        const searchValue = document.getElementById('searchInput')?.value.trim();

        if (searchValue) {
            filterProducts(); // re-apply search
        } else {
            renderProducts(window.allProducts);
        }
        
    } catch (error) {
        console.error("Error loading products:", error);
        if (grid) {
            grid.innerHTML = '<p style="padding: 1rem; color: red;">Грешка при зареждане на продуктите. Опитайте отново.</p>';
        }
        window.allProducts = [];
        currentFilteredProducts = [];
        renderPaginationControls(0);
    }
}

// Load Farmers
async function loadFarmers() {
    try {
        const snapshot = await db.collection('farmers').get();

        allFarmers = [];

        snapshot.forEach(doc => {
            allFarmers.push({
                id: doc.id,
                ...doc.data()
            });
        });

        renderFarmers(allFarmers);

    } catch (error) {
        console.error("Error loading farmers:", error);
    }
}

//Render farmers
function renderFarmers(farmersToRender) {
    const grid = document.getElementById('farmersGrid');

    grid.innerHTML = '';

    const start = (currentFarmersPage - 1) * farmersPerPage;
    const end = start + farmersPerPage;

    const paginatedFarmers = farmersToRender.slice(start, end);

    paginatedFarmers.forEach(farmer => {

        const card = document.createElement('div');

        card.className = 'farmer-card';
        card.style.cursor = 'pointer';

        card.onclick = () =>
            openGoogleMaps(farmer.coords, null, farmer.name);

        card.innerHTML = `
            <div class="farmer-avatar">${farmer.photo ? `<img src="${farmer.photo}" alt="${escapeHtml(farmer.owner)}" style="max-width:100%; max-height:100%; border-radius:6px;">` : '👨‍🌾'}</div>

            <h3 class="farmer-name">${escapeHtml(farmer.owner)}</h3>

            <p style="color: #888; font-size: 0.9rem;">
                📍 ${farmer.name}
            </p>

            <button
                class="contact-btn"
                style="margin-top: 1rem; width: 100%;"
                onclick="event.stopPropagation(); showFarmerContact('${farmer.id}')"
            >
                📞 Свържи се с фермера
            </button>
        `;

        grid.appendChild(card);
    });

    renderFarmersPagination(farmersToRender.length);
}



//Farmer pagination
function renderFarmersPagination(totalItems) {

    const totalPages =
        Math.ceil(totalItems / farmersPerPage);

    const paginationHTML = `
        <button
            onclick="changeFarmersPage(-1)"
            ${currentFarmersPage === 1 ? 'disabled' : ''}
        >
            ⬅
        </button>

        <span>
            Страница ${currentFarmersPage} / ${totalPages}
        </span>

        <button
            onclick="changeFarmersPage(1)"
            ${currentFarmersPage === totalPages ? 'disabled' : ''}
        >
            ➡
        </button>
    `;

    const top =
        document.getElementById('farmersPaginationTop');

    const bottom =
        document.getElementById('farmersPaginationBottom');

    if (top) top.innerHTML = paginationHTML;
    if (bottom) bottom.innerHTML = paginationHTML;
}

//Page changer
function changeFarmersPage(direction) {

    currentFarmersPage += direction;

    if (currentFarmersPage < 1)
        currentFarmersPage = 1;

    const maxPages =
        Math.ceil(allFarmers.length / farmersPerPage);

    if (currentFarmersPage > maxPages)
        currentFarmersPage = maxPages;

    renderFarmers(allFarmers);

}


// Create Product Card
function createProductCard(id, product, isOwner = false) {
    const card = document.createElement('div');
    card.className = isOwner ? 'product-card my-product' : 'product-card';

    const safeName = escapeHtml(product.name);
    const safeFarmerName = escapeHtml(product.farmerName);
    const safeCategory = escapeHtml(getCategoryName(product.category));
    const safeDescription = escapeHtml(product.description);
    const safeLocation = escapeHtml(product.location);
    const safePrice = escapeHtml(product.price);
    const safeId = escapeHtml(id);
    const safeProductId = escapeHtml(id);
    const safeProductName = escapeHtml(product.name);
    const safeFarmerId = escapeHtml(product.farmerId);

    if (!isOwner) {
        card.style.cursor = 'pointer';
        card.onclick = (e) => {
            if (!e.target.closest('.product-actions')) {
                if (product.coords) {
                    openGoogleMaps(product.coords, null, product.farmerName);
                }
            }
        };
    }

    let orderBtnHtml = '';
    if (!isOwner) {
        if (product.available !== false) {
            orderBtnHtml = `<button class="contact-btn" onclick="event.stopPropagation(); showOrderModal('${safeProductId}', '${safeProductName}', '${safeFarmerName}', '${safeFarmerId}')">Направи поръчка</button>`;
        } else {
            orderBtnHtml = `<button class="contact-btn" style="background: #999; cursor: not-allowed;" disabled>Изчерпано</button>`;
        }
    }

    let actionsHtml = '';
    if (isOwner) {
        actionsHtml = `
            <div class="product-actions">
                <button class="product-edit-btn" onclick="showEditModal('${safeProductId}')">Редактирай</button>
                <button class="product-delete-btn" onclick="deleteProduct('${safeProductId}')">Изтрий</button>
            </div>
        `;
    }

    const availabilityBadge = product.available !== false 
        ? '<span class="available-badge">✅ В наличност</span>' 
        : '<span class="unavailable-badge">❌ Изчерпано</span>';

    card.innerHTML = `
        <div class="product-image">
            ${
                product.image
                ? `<img src="${product.image}" alt="${safeName}">`
                : product.emoji
            }
        </div>
        <div class="product-info">

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
                <span class="product-category">${safeCategory}</span>
                ${availabilityBadge}
            </div>

            <h3 class="product-name">${safeName}</h3>
            <p class="product-farmer">от ${safeFarmerName}</p>
            <div style="margin-bottom: 0.6rem;">
                <div class="product-location">
                    📍 ${safeLocation}
                </div>

                ${!isOwner ? `
                    <div style="color: #2d5016; font-size: 0.8rem; font-weight: 500; margin-top: 0.3rem;">
                    🗺️ Кликни за карта
                </div>
            ` : ''}
            </div>
            
            <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${safeDescription}</p>
            <div class="product-price">${safePrice}</div>
            ${orderBtnHtml}
            ${actionsHtml}
        </div>
    `;

    return card;
}




function getCategoryName(category) {
    const names = { 'eggs': 'яйца', 'meat': 'месо', 'honey': 'мед' };
    return names[category] || category;
}

// Delete Product
async function deleteProduct(productId) {
    if (!confirm('Сигурни ли сте, че искате да изтриете този продукт?')) return;
    
    try {
        await db.collection('products').doc(productId).delete();
        loadMyProducts(currentUser.uid);
        loadAllProducts();
    } catch (error) {
        console.error("Error deleting:", error);
    }
}

// Показва прозореца за редакция и зарежда данните
async function showEditModal(productId) {
    try {
        // Изчистваме файла от предишната сесия
        document.getElementById('editImage').value = '';
        
        // Взимаме продукта от базата
        const doc = await db.collection('products').doc(productId).get();

        if (!doc.exists) {
            alert('Не може да се зареди продуктът. Моля, опитайте по-късно.');
            return;
        }

        const product = doc.data();
        
        // Попълваме формата с текущите стойности
        document.getElementById('editProductId').value = productId;
        document.getElementById('editName').value = product.name;
        document.getElementById('editCategory').value = product.category;
        document.getElementById('editPrice').value = product.price;
        document.getElementById('editDescription').value = product.description;
        document.getElementById('editAvailable').checked = product.available !== false;
        
        // Показваме текущата снимка ако има такава
        const currentImageContainer = document.getElementById('currentImageContainer');
        if (product.image) {
            currentImageContainer.innerHTML = `<p>Текуща снимка:</p><img src="${product.image}" alt="Текуща снимка" style="max-width: 150px; max-height: 120px; border: 1px solid #ddd; border-radius: 4px;">`;
        } else {
            currentImageContainer.innerHTML = '<p>Няма текуща снимка</p>';
        }
        
        // Показваме прозореца
        document.getElementById('editModal').style.display = 'flex';
    } catch (error) {
        console.error("Грешка при зареждане:", error);
        alert("Не може да се зареди продуктът");
    }
}

// Затваря прозореца
function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';

    const form = document.getElementById('editForm');
    if (form) form.reset();

    const imageInput = document.getElementById('editImage');
    if (imageInput) imageInput.value = '';

    const currentImageContainer = document.getElementById('currentImageContainer');
    if (currentImageContainer) currentImageContainer.innerHTML = '';

    const editProductId = document.getElementById('editProductId');
    if (editProductId) editProductId.value = '';
}

function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'flex';
}

function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) modal.style.display = 'none';

    const form = document.getElementById('registerForm');
    if (form) form.reset();

    const preview = document.getElementById('regFarmerPreview');
    if (preview) preview.innerHTML = '';
}


function getLocation() {
    const status = document.getElementById('locationStatus');
    
    if (!navigator.geolocation) {
        status.textContent = 'Геолокацията не се поддържа от този браузър. Моля, въведете координатите ръчно.';
        status.style.color = '#dc3545';
        return;
    }
    
    status.textContent = 'Определяне на местоположение...';
    status.style.color = '#666';
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            document.getElementById('regLat').value = position.coords.latitude.toFixed(6);
            document.getElementById('regLng').value = position.coords.longitude.toFixed(6);
            status.textContent = '✅ Локацията е определена успешно!';
            status.style.color = '#28a745';
        },
        (error) => {
            let msg = 'Грешка при определяне на локацията: ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    msg += 'Нямате разрешение. Моля, разрешете достъп до локацията или въведете координатите ръчно.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    msg += 'Локацията е недостъпна.';
                    break;
                case error.TIMEOUT:
                    msg += 'Времето за изчакване изтече.';
                    break;
                default:
                    msg += 'Неизвестна грешка.';
            }
            status.textContent = msg;
            status.style.color = '#dc3545';
        }
    );
}



async function registerFarmer(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Създаване...";
    
    // Взимаме стойностите
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const farmName = document.getElementById('regFarmName').value.trim();
    const owner = document.getElementById('regOwner').value.trim();
    const location = document.getElementById('regLocation').value.trim();
    const lat = parseFloat(document.getElementById('regLat').value);
    const lng = parseFloat(document.getElementById('regLng').value);
    

    
    // Валидация
    if (!email || !password || !farmName || !owner || !location) {
        alert("Моля, попълнете всички полета правилно!");
        submitBtn.disabled = false;
        submitBtn.textContent = "Създай профил";
        return;
    }
    
    // Валидация на паролата
    if (password.length < 6) {
        alert("Паролата трябва да е поне 6 символа!");
        submitBtn.disabled = false;
        submitBtn.textContent = "Създай профил";
        return;
    }
    
    if (!/\p{Lu}/u.test(password)) {
        alert("Паролата трябва да съдържа поне една главна буква!");
        submitBtn.disabled = false;
        submitBtn.textContent = "Създай профил";
        return;
    }

    if (!/\p{Ll}/u.test(password)) {
        alert("Паролата трябва да съдържа поне една малка буква!");
        submitBtn.disabled = false;
        submitBtn.textContent = "Създай профил";
        return;
    }

    if (!/\d/.test(password)) {
        alert("Паролата трябва да съдържа поне една цифра (0-9)!");
        submitBtn.disabled = false;
        submitBtn.textContent = "Създай профил";
        return;
    }
    
    
    try {
        // Създаваме потребител в Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;
        
        // Handle optional photo
        const regPhoto = await getFileBase64ById('regFarmerImage');

        // Запазваме данните за фермера в Firestore
        await db.collection('farmers').doc(uid).set({
            name: farmName,
            owner: owner,
            location: location,
            phone: document.getElementById('regPhone').value.trim(),
            coords: (!isNaN(lat) && !isNaN(lng)) 
                ? new firebase.firestore.GeoPoint(lat, lng) 
                : null,
            specialties: [],
            email: email,
            photo: regPhoto || null
        });
        
        alert("Регистрацията е успешна! Вече можете да влезете.");
        document.getElementById('registerForm').reset();
        closeRegisterModal();
        
    } catch (error) {
        console.error("Грешка при регистрация:", error);
        let msg = "Грешка при регистрация: ";
        if (error.code === 'auth/email-already-in-use') {
            msg += "Този имейл вече се използва.";
        } else if (error.code === 'auth/invalid-email') {
            msg += "Невалиден имейл.";
        } else {
            msg += error.message;
        }
        alert(msg);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Създай профил";
    }
}


async function showFarmerContact(farmerId) {
    try {
        const doc = await db.collection('farmers').doc(farmerId).get();
        if (!doc.exists) {
            alert('Фермерът не е намерен');
            return;
        }
        const farmer = doc.data();
        
        document.getElementById('contactFarmName').textContent = farmer.name || 'Без име';
        document.getElementById('contactOwner').textContent = farmer.owner || '';
        document.getElementById('contactEmail').textContent = farmer.email || 'Няма имейл';
        document.getElementById('contactPhone').textContent = farmer.phone || 'Не е посочен';
        document.getElementById('contactLocation').textContent = farmer.location || '';
        // show photo in the contact modal if available
        const contactInfo = document.getElementById('farmerContactInfo');
        if (contactInfo) {
            const avatarDiv = contactInfo.querySelector('div');
            if (avatarDiv) {
                if (farmer.photo) {
                    avatarDiv.innerHTML = `<img src="${farmer.photo}" style="width:160px; height:140px; border-radius:50%; object-fit:cover; margin-bottom:1rem;">`;
                } else {
                    avatarDiv.innerHTML = '👨‍🌾';
                }
            }
        }
        
        document.getElementById('farmerContactModal').style.display = 'flex';
    } catch (error) {
        console.error('Грешка при зареждане на контакти:', error);
        alert('Грешка при зареждане на контактите');
    }
}




function closeFarmerContact() {
    document.getElementById('farmerContactModal').style.display = 'none';
}



function showEditFarmerModal() {
    if (!currentFarmerData) return;

    document.getElementById('editFarmName').value = currentFarmerData.name || '';
    document.getElementById('editOwner').value = currentFarmerData.owner || '';
    document.getElementById('editLocation').value = currentFarmerData.location || '';
    document.getElementById('editPhone').value = currentFarmerData.phone || '';

    if (currentFarmerData.coords) {
        document.getElementById('editLat').value = currentFarmerData.coords.latitude;
        document.getElementById('editLng').value = currentFarmerData.coords.longitude;
    }

    // Show current photo in preview if available
    const editPreview = document.getElementById('editFarmerPreview');
    if (editPreview) {
        if (currentFarmerData.photo) {
            editPreview.innerHTML = `<img src="${currentFarmerData.photo}" style="max-width:140px; max-height:120px; border:1px solid #ddd; border-radius:6px;">`;
        } else {
            editPreview.innerHTML = '';
        }
    }

    document.getElementById('editFarmerModal').style.display = 'flex';
}



function closeEditFarmerModal() {
    const modal = document.getElementById('editFarmerModal');
    if (modal) modal.style.display = 'none';

    const preview = document.getElementById('editFarmerPreview');
    if (preview) preview.innerHTML = '';

    const input = document.getElementById('editFarmerImage');
    if (input) input.value = '';
}


function showOrderModal(productId, productName, farmerName, farmerId) {
    document.getElementById('orderProductId').value = productId;
    document.getElementById('orderFarmerId').value = farmerId;
    document.getElementById('orderProductName').value = productName; // НОВО
    document.getElementById('orderProductInfo').textContent = 
        'Продукт: ' + productName + ' от ' + farmerName;
    document.getElementById('orderModal').style.display = 'flex';
}

function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.style.display = 'none';

    const form = document.getElementById('orderForm');
    if (form) form.reset();

    const info = document.getElementById('orderProductInfo');
    if (info) info.textContent = '';

    const hiddenProductName = document.getElementById('orderProductName');
    if (hiddenProductName) hiddenProductName.value = '';

    const hiddenProductId = document.getElementById('orderProductId');
    if (hiddenProductId) hiddenProductId.value = '';

    const hiddenFarmerId = document.getElementById('orderFarmerId');
    if (hiddenFarmerId) hiddenFarmerId.value = '';
}

async function submitOrder(e) {
    e.preventDefault();
    
    const customerName = document.getElementById('orderName').value.trim();
    const customerPhone = document.getElementById('orderPhone').value.trim();
    const message = document.getElementById('orderMessage').value.trim();
    
    if (!customerName || !customerPhone || !message) {
        alert("Моля, попълнете всички полета!");
        return;
    }
    // ✅ PREVENT SELF-ORDER
    const farmerId = document.getElementById('orderFarmerId').value;

    if (currentUser && currentUser.uid === farmerId) {
        alert("Не можете да поръчате собствен продукт.");
        return;
    }

    const orderData = {
        productId: document.getElementById('orderProductId').value,
        farmerId: document.getElementById('orderFarmerId').value,
        productName: document.getElementById('orderProductName').value, // СМЕНЕНО
        customerName: customerName,
        customerPhone: customerPhone,
        message: message,
        status: 'new',
        createdAt: new Date()
    };
    
    try {
        await db.collection('orders').add(orderData);
        alert("Запитването е изпратено успешно! Фермерът ще се свърже с вас.");
        document.getElementById('orderForm').reset();
        closeOrderModal();
    } catch (error) {
        console.error("Грешка при поръчка:", error);
        alert("Грешка при изпращане. Опитайте отново.");
    }
}


// Запазва промените в базата
async function saveEdit(e) {
    e.preventDefault();
    
    const productId = document.getElementById('editProductId').value;
    const imageFile = document.getElementById('editImage').files[0];
    
    // ВАЛИДАЦИЯ - проверяваме дали полетата са празни
    const name = document.getElementById('editName').value.trim();
    const price = document.getElementById('editPrice').value.trim();
    const description = document.getElementById('editDescription').value.trim();
    
    if (!name || !price || !description) {
        alert("Моля, попълнете всички полета!");
        return;
    }
    
    if (name.length < 2) {
        alert("Името на продукта трябва да е поне 2 символа!");
        return;
    }
    
    // Проверка за цена (да съдържа поне една цифра)
    if (!/\d/.test(price)) {
        alert("Моля, въведете валидна цена (напр. 6.00 eв.)!");
        return;
    }
    
    // Спира бутона временно
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Запазване...";
    
    let imageBase64 = null; // Използваме null за да не презаписваме ако няма нова снимка
    
    if (imageFile && imageFile.size > 800000) {
        alert("Снимката е прекалено голяма. Моля, качете по-малка снимка.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Запази промените";
        return;
    }
    
    if (imageFile) {
        imageBase64 = await toBase64(imageFile);
    }
    
    const updatedData = {
        name: document.getElementById('editName').value,
        category: document.getElementById('editCategory').value,
        price: document.getElementById('editPrice').value,
        description: document.getElementById('editDescription').value,
        available: document.getElementById('editAvailable').checked,
        emoji: getEmojiForCategory(document.getElementById('editCategory').value)
    };
    
    // Добавяме снимката само ако има нова
    if (imageBase64 !== null) {
        updatedData.image = imageBase64;
    }
    
    try {
        await db.collection('products').doc(productId).update(updatedData);
        closeEditModal();
        alert("Продуктът е обновен!");
        await loadMyProducts(currentUser.uid);
        await loadAllProducts(); // НОВО: Презареждаме и публичните продукти
    } catch (error) {
        console.error("Грешка при запис:", error);
        alert("Грешка при запазване на промените");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Запази промените";
    }
}

//Farmer edit
async function saveFarmerEdit(e) {
    e.preventDefault();

    if (!currentUser) return;

    const lat = parseFloat(document.getElementById('editLat').value);
    const lng = parseFloat(document.getElementById('editLng').value);

    const updatedData = {
        name: document.getElementById('editFarmName').value,
        owner: document.getElementById('editOwner').value,
        location: document.getElementById('editLocation').value,
        phone: document.getElementById('editPhone').value,
        coords: (!isNaN(lat) && !isNaN(lng))
            ? new firebase.firestore.GeoPoint(lat, lng)
            : null
    };

    // Optional photo update
    const editPhoto = await getFileBase64ById('editFarmerImage');
    if (editPhoto) {
        updatedData.photo = editPhoto;
    }

    try {
        // ✅ 1. Update farmer profile
        await db.collection('farmers').doc(currentUser.uid).update(updatedData);

        // ✅ 2. UPDATE ALL PRODUCTS (👉 PUT YOUR CODE HERE)
        const productsSnapshot = await db.collection('products')
            .where('farmerId', '==', currentUser.uid)
            .get();

        const batch = db.batch();

        productsSnapshot.forEach(doc => {
            batch.update(doc.ref, {
                farmerName: updatedData.name,
                location: updatedData.location
            });
        });

        await batch.commit();
        await loadAllProducts();
        await loadMyProducts(currentUser.uid);

        // ✅ 3. Update local state
        currentFarmerData = { ...currentFarmerData, ...updatedData };

        // ✅ 4. UI updates
        closeEditFarmerModal();
        updateUIForLoggedInFarmer();
        loadFarmers();

        alert("Профилът е обновен успешно!");

    } catch (error) {
        console.error(error);
        alert("Грешка при обновяване");
    }
}


// Filter Functions
function renderProducts(productsToRender) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    const products = Array.isArray(productsToRender) ? productsToRender : [];
    grid.innerHTML = '';

    // 🔴 store current filtered list (important for pagination)
    currentFilteredProducts = products;

    if (products.length === 0) {
        grid.style.opacity = '0';
        grid.innerHTML = '<p style="padding: 1rem; color: #555;">Няма намерени продукти.</p>';
        renderPaginationControls(0);
        setTimeout(() => {
            grid.style.opacity = '1';
        }, 50);
        return;
    }

    const totalPages = Math.max(1, Math.ceil(products.length / productsPerPage));
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    // 🔢 calculate pagination range
    const start = (currentPage - 1) * productsPerPage;
    const end = start + productsPerPage;

    const paginatedProducts = products.slice(start, end);

    // 🧱 render only current page
    paginatedProducts.forEach(product => {
        const card = createProductCard(product.id, product, false);
        grid.appendChild(card);
    });

    // 📄 update pagination UI
    renderPaginationControls(products.length);
}



function renderPaginationControls(totalItems) {
    const top = document.getElementById('paginationTop');
    const bottom = document.getElementById('paginationBottom');

    if (totalItems === 0) {
        if (top) top.innerHTML = '';
        if (bottom) bottom.innerHTML = '';
        return;
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / productsPerPage));

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const paginationHTML = `
        <button onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>⬅</button>
        <span>Страница ${currentPage} / ${totalPages}</span>
        <button onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>➡</button>
    `;

    // TOP pagination
    if (top) top.innerHTML = paginationHTML;

    // BOTTOM pagination
    if (bottom) bottom.innerHTML = paginationHTML;
}


function changePage(direction) {
    currentPage += direction;

    if (currentPage < 1) currentPage = 1;

    const maxPages = Math.max(1, Math.ceil(currentFilteredProducts.length / productsPerPage));

    if (currentPage > maxPages) currentPage = maxPages;

    renderProducts(currentFilteredProducts);
}


function filterCategory(category, e) {
    currentPage = 1;
    // Активен бутон
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (e) e.target.classList.add('active');
    
    if (category === 'all') {
        renderProducts(window.allProducts);
        return;
    }
    
    // Ключови думи за всяка категория
    const keywords = {
        'eggs': ['яйца', 'яйца'],
        'meat': ['месо', 'пиле', 'телешко', 'свинско', 'агнешко', 'кайма'],
        'honey': ['мед', 'пчелен', 'восък'],
        'dairy': ['млечни','млечни продукти','сирене','кашкавал','мляко','кисело мляко','йогурт','извара','масло','cheese','milk','butter','yogurt','dairy'],
        'vegetables': ['зеленчук', 'домат', 'краставица', 'чушка', 'лук', 'чесън', 'тиква', 'морков', 'зеле', 'спанак'],
        'fruits': ['плод', 'ябълка', 'круша', 'слива', 'праскова', 'череша', 'ягода', 'малина', 'кайсия', 'грозде'],
        'bread': ['хляб', 'питка', 'баница', 'тутманик', 'мекици', 'погача'],
        'other': []
    };
    
    if (category === 'other') {
        // "Други" = всичко, което НЕ е в горните категории
        const allKeywords = Object.values(keywords).flat();
        const filtered = window.allProducts.filter(product => {
            const prodCat = (product.category || '').toLowerCase();
            return !allKeywords.some(word => prodCat.includes(word));
        });
        renderProducts(filtered);
        return;
    }
    
    const searchWords = keywords[category] || [category];
    
    const filtered = window.allProducts.filter(product => {
        const prodCat = (product.category || '').toLowerCase();
        return searchWords.some(word => prodCat.includes(word));
    });
    
    renderProducts(filtered);
}


function filterProducts() {
    currentPage = 1;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

    const filtered = window.allProducts.filter(product => {
        const combined = (
            (product.name || '') + ' ' +
            (product.farmerName || '') + ' ' +
            (product.category || '')
        ).toLowerCase();

        return combined.includes(searchTerm);
    });

    renderProducts(filtered);

    // 🔍 ALSO filter farmers visually
    //filterFarmers(searchTerm);
}

const searchInput = document.getElementById('searchInput');

if (searchInput) {
    searchInput.addEventListener('input', () => {
        const value = searchInput.value.trim();

        // 🔥 If typing → switch to public products view
        if (value !== '') {
            navigateTo('public');
        }

        if (value === '') {
            // Reset filter buttons to "All Products"
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            // Set the first button (All Products) as active
            const firstBtn = document.querySelector('.filter-btn');
            if (firstBtn) firstBtn.classList.add('active');
            
            renderProducts(window.allProducts);
        } else {
            filterProducts();
        }
    });
}

//Filter farmers
function filterFarmers(searchTerm) {
    const cards = document.querySelectorAll('.farmer-card');

    cards.forEach(card => {
        const text = card.innerText.toLowerCase();

        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}



// Google Maps
function openGoogleMaps(lat, lng, label) {
    
    // Ако е GeoPoint обект (от базата), ползваме .latitude/.longitude
    // Ако са отделни параметри, ги ползваме директно
    let latitude, longitude;
    
    if (typeof lat === 'object' && lat !== null) {
        // Формат: {latitude: 42.6977, longitude: 23.3219} (GeoPoint)
        latitude = lat.latitude;
        longitude = lat.longitude;
    } else {
        // Формат: отделни числа или стрингове
        latitude = Number(lat);
        longitude = Number(lng);
    }
    
    // Ако lng е undefined, но lat има и двете стойности (случай с обект)
    //if (lng === undefined && typeof lat === 'object') {
        //longitude = lat.longitude;
    //}
    
    
    if ( isNaN(latitude) || isNaN(longitude)) {
        alert('Невалидни координати за това местоположение');
        return;
    }
    
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}&ll=${latitude},${longitude}&z=15`;
    window.open(mapsUrl, '_blank');
}

function showResetPassword() {
    document.getElementById('resetModal').style.display = 'flex';
}

function closeResetModal() {
    document.getElementById('resetModal').style.display = 'none';
}

async function resetPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    const msg = document.getElementById('resetMessage');

    try {
        await auth.sendPasswordResetEmail(email);
        msg.textContent = "Ако има акаунт с този имейл, ще получите линк за смяна на паролата. Провери имейла и Spam папката!";
        msg.style.color = "green";
    } catch (error) {

        let message;

        if (error.code === "auth/user-not-found") {
            message = "Няма акаунт с този имейл.";
        } else if (error.code === "auth/invalid-email") {
            message = "Невалиден имейл.";
        }

        alert(message);
    }
}



function showInfo(title, text) {
    document.getElementById('infoTitle').textContent = title;
    document.getElementById('infoText').textContent = text;
    document.getElementById('infoModal').style.display = 'flex';
}


function showTerms() {
    showInfo('ОБЩИ УСЛОВИЯ',
          `1. Сайтът е с нестопанска цел за свързване на местни фермери с клиенти.
           2. Не носим отговорност за качеството на продуктите - това е между фермера и клиента.
           3. Личните данни се пазят според GDPR.
           4. За въпроси: mestna-rekolta@protonmail.com`);
}

function showPrivacy() {
    showInfo('ПОЛИТИКА ЗА ПОВЕРИТЕЛНОСТ',
          `1. Събираме само данни, необходими за функционирането на сайта.
           2. Не споделяме лични данни с трети страни.
           3. Фермерите виждат само данни, свързани с техните поръчки.
           4. Можете да поискате изтриване на данните по всяко време.`);

}

function showCookies() {
    showInfo('ПОЛИТИКА ЗА БИСКВИТКИ',
          `1. Използваме само технически необходими бисквитки.
           2. Не използваме бисквитки за проследяване или реклами.
           3. Продължавайки да използвате сайта, приемате тази политика.`);
}





// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.scrollTo(0, 0);
    loadAllProducts();
    loadFarmers();
    // Image preview handlers for farmer forms
    const regInput = document.getElementById('regFarmerImage');
    const regPreview = document.getElementById('regFarmerPreview');
    if (regInput && regPreview) {
        regInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) { regPreview.innerHTML = ''; return; }
            if (file.size > 800000) { alert('Снимката е прекалено голяма. Моля, качете по-малка снимка.'); regInput.value = ''; regPreview.innerHTML = ''; return; }
            const b64 = await toBase64(file);
            regPreview.innerHTML = `<img src="${b64}" style="max-width:140px; max-height:120px; border-radius:6px;">`;
        });
    }

    const editInput = document.getElementById('editFarmerImage');
    const editPreview = document.getElementById('editFarmerPreview');
    if (editInput && editPreview) {
        editInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) { editPreview.innerHTML = ''; return; }
            if (file.size > 800000) { alert('Снимката е прекалено голяма. Моля, качете по-малка снимка.'); editInput.value = ''; editPreview.innerHTML = ''; return; }
            const b64 = await toBase64(file);
            editPreview.innerHTML = `<img src="${b64}" style="max-width:140px; max-height:120px; border-radius:6px;">`;
        });
    }
});