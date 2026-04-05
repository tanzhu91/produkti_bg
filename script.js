// Данни за фермери с координати (добавете реални координати)
const farmers = [
    {
        id: 1,
        name: "Ферма Зелена Долина",
        owner: "Иван Митев",
        location: "Северна област, 5 км",
        coords: { lat: 42.99761124462213, lng: 27.195096719372046 }, // София примерно
        specialties: ["eggs", "honey"],
        phone: "0888-123-456"
    },
    {
        id: 2,
        name: "Ранчо Слънчев Рид",
        owner: "Мария Петрова",
        location: "Източни хълмове, 8 км",
        coords: { lat: 42.956993676401254, lng: 27.280010745182384 },  // примерни координати
        specialties: ["meat", "eggs"],
        phone: "0888-789-012"
    },
    {
        id: 3,
        name: "Пчелин Златен Кошер",
        owner: "Георги Йорданов",
        location: "Западна долина, 3 км",
        coords: { lat: 42.5103, lng: 23.3230 },
        specialties: ["honey"],
        phone: "0888-345-678"
    },
    {
        id: 4,
        name: "Месокомбинат Традиция",
        owner: "Елена Стоянова",
        location: "Южни полета, 12 км",
        coords: { lat: 42.956993676401254, lng: 27.280010745182384 },
        specialties: ["meat"],
        phone: "0888-901-234"
    }
];

const products = [
    {
        id: 1,
        name: "Био яйца от свободни кокошки",
        category: "eggs",
        farmer: "Ферма Зелена Долина",
        location: "Северна област, 5 км",
        coords: { lat: 42.99761124462213, lng: 27.195096719372046 },
        price: "6.00 ев./десетка",
        emoji: "🥚",
        description: "Кокошки отгледани на паша"
    },
    {
        id: 2,
        name: "Мед от бяла акация",
        category: "honey",
        farmer: "Пчелин Златен Кошер",
        location: "Западна долина, 3 км",
        coords: { lat: 42.956993676401254, lng: 27.280010745182384 },
        price: "12.00 eв./буркан",
        emoji: "🍯",
        description: "Суров, нефилтриран местен мед"
    },
    {
        id: 3,
        name: "Телешко месо от пасищно отглеждане",
        category: "meat",
        farmer: "Месокомбинат Традиция",
        location: "Южни полета, 12 км",
        coords: { lat: 42.956993676401254, lng: 27.280010745182384 },
        price: "15.00 eв./кг",
        emoji: "🥩",
        description: "Премиум телешко от пасищно отглеждане"
    },
    {
        id: 4,
        name: "Пилешко месо от свободно отглеждане",
        category: "meat",
        farmer: "Ранчо Слънчев Рид",
        location: "Източни хълмове, 8 км",
        coords: { lat: 42.956993676401254, lng: 27.280010745182384 },
        price: "12.00 eв./кг",
        emoji: "🍗",
        description: "Без антибиотици, свободно отглеждане"
    },
    {
        id: 5,
        name: "Мед от детелина",
        category: "honey",
        farmer: "Ферма Зелена Долина",
        location: "Северна област, 5 км",
        coords: { lat: 42.956993676401254, lng: 27.280010745182384 },
        price: "10.00 eв./буркан",
        emoji: "🍯",
        description: "Сладък мед от детелинов цвят"
    },
    {
        id: 6,
        name: "Пресни фермерски яйца",
        category: "eggs",
        farmer: "Ранчо Слънчев Рид",
        location: "Източни хълмове, 8 км",
        coords: { lat: 42.956993676401254, lng: 27.280010745182384 },
        price: "5.50 eв./десетка",
        emoji: "🥚",
        description: "Кафяви яйца от местни породи"
    }
];

// Зареждане на страницата
document.addEventListener('DOMContentLoaded', () => {
    renderProducts(products);
    renderFarmers();
});

// Показване на продукти
function renderProducts(productsToRender) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';
    
    productsToRender.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.cursor = 'pointer';
        card.onclick = (e) => {
            // Ако не е кликнат бутона за контакт, отвори картата
            if (!e.target.classList.contains('contact-btn')) {
                openGoogleMaps(product.coords.lat, product.coords.lng, product.farmer);
            }
        };
        
        card.innerHTML = `
            <div class="product-image">${product.emoji}</div>
            <div class="product-info">
                <span class="product-category">${getCategoryName(product.category)}</span>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-farmer">от ${product.farmer}</p>
                <div class="product-location">📍 ${product.location} (кликни за карта)</div>
                <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${product.description}</p>
                <div class="product-price">${product.price}</div>
                <button class="contact-btn" onclick="contactFarmer('${product.farmer}')">Свържи се с фермера</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Показване на фермери
function renderFarmers() {
    const grid = document.getElementById('farmersGrid');
    
    farmers.forEach(farmer => {
        const card = document.createElement('div');
        card.className = 'farmer-card';
        card.style.cursor = 'pointer';
        card.onclick = () => openGoogleMaps(farmer.coords.lat, farmer.coords.lng, farmer.name);
        
        const specialties = farmer.specialties.map(s => 
            s === 'eggs' ? '🥚' : s === 'meat' ? '🥩' : '🍯'
        ).join(' ');
        
        const specialtyNames = farmer.specialties.map(s => 
            s === 'eggs' ? 'яйца' : s === 'meat' ? 'месо' : 'мед'
        ).join(', ');
        
        card.innerHTML = `
            <div class="farmer-avatar">👨‍🌾</div>
            <h3 class="farmer-name">${farmer.name}</h3>
            <p style="color: #666; margin-bottom: 0.5rem;">${farmer.owner}</p>
            <p class="farmer-specialty">${specialties} ${specialtyNames}</p>
            <p style="color: #888; font-size: 0.9rem; margin-top: 0.5rem;">📍 ${farmer.location}</p>
            <p style="color: #2d5016; font-size: 0.85rem; margin-top: 0.5rem; font-weight: 500;">(Кликни за място на картата)</p>
        `;
        grid.appendChild(card);
    });
}

// Помощна функция за превод на категории
function getCategoryName(category) {
    const names = {
        'eggs': 'яйца',
        'meat': 'месо',
        'honey': 'мед'
    };
    return names[category] || category;
}

// Филтриране по категория
function filterCategory(category) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (category === 'all') {
        renderProducts(products);
    } else {
        const filtered = products.filter(p => p.category === category);
        renderProducts(filtered);
    }
}

// Търсене
function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.farmer.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
    );
    renderProducts(filtered);
}

// Enter за търсене
document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') filterProducts();
});

// ОТВАРЯНЕ НА GOOGLE MAPS - основната нова функция
function openGoogleMaps(lat, lng, label) {
    // URL за Google Maps с координати
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}&ll=${lat},${lng}&z=15`;
    
    // Отваряне в нов таб
    window.open(mapsUrl, '_blank');
}

// Контакт с фермер
function contactFarmer(farmerName) {
    const farmer = farmers.find(f => f.name === farmerName);
    if (farmer) {
        alert(`Свържете се с ${farmer.owner}\nТелефон: ${farmer.phone}\nМестоположение: ${farmer.location}`);
    }
}