// Sample data for farmers and products
const farmers = [
    {
        id: 1,
        name: "Green Valley Farm",
        owner: "John Mitchell",
        location: "North County, 5 miles",
        specialties: ["eggs", "honey"],
        phone: "555-0123"
    },
    {
        id: 2,
        name: "Sunny Ridge Ranch",
        owner: "Sarah Chen",
        location: "East Hills, 8 miles",
        specialties: ["meat", "eggs"],
        phone: "555-0456"
    },
    {
        id: 3,
        name: "Golden Hive Apiary",
        owner: "Mike Johnson",
        location: "West Valley, 3 miles",
        specialties: ["honey"],
        phone: "555-0789"
    },
    {
        id: 4,
        name: "Heritage Meats",
        owner: "Emma Rodriguez",
        location: "South Fields, 12 miles",
        specialties: ["meat"],
        phone: "555-0321"
    }
];

const products = [
    {
        id: 1,
        name: "Free-Range Organic Eggs",
        category: "eggs",
        farmer: "Green Valley Farm",
        location: "North County, 5 miles",
        price: "$6.00/dozen",
        emoji: "🥚",
        description: "Pasture-raised happy chickens"
    },
    {
        id: 2,
        name: "Wildflower Honey",
        category: "honey",
        farmer: "Golden Hive Apiary",
        location: "West Valley, 3 miles",
        price: "$12.00/jar",
        emoji: "🍯",
        description: "Raw, unfiltered local honey"
    },
    {
        id: 3,
        name: "Grass-Fed Beef",
        category: "meat",
        farmer: "Heritage Meats",
        location: "South Fields, 12 miles",
        price: "$8.00/lb",
        emoji: "🥩",
        description: "Premium cuts from grass-fed cattle"
    },
    {
        id: 4,
        name: "Heritage Chicken",
        category: "meat",
        farmer: "Sunny Ridge Ranch",
        location: "East Hills, 8 miles",
        price: "$5.00/lb",
        emoji: "🍗",
        description: "Free-range, antibiotic-free"
    },
    {
        id: 5,
        name: "Clover Honey",
        category: "honey",
        farmer: "Green Valley Farm",
        location: "North County, 5 miles",
        price: "$10.00/jar",
        emoji: "🍯",
        description: "Sweet clover blossom honey"
    },
    {
        id: 6,
        name: "Farm Fresh Eggs",
        category: "eggs",
        farmer: "Sunny Ridge Ranch",
        location: "East Hills, 8 miles",
        price: "$5.50/dozen",
        emoji: "🥚",
        description: "Brown eggs from heritage breeds"
    }
];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    renderProducts(products);
    renderFarmers();
});

// Render products
function renderProducts(productsToRender) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';
    
    productsToRender.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image">${product.emoji}</div>
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-farmer">by ${product.farmer}</p>
                <div class="product-location">📍 ${product.location}</div>
                <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">${product.description}</p>
                <div class="product-price">${product.price}</div>
                <button class="contact-btn" onclick="contactFarmer('${product.farmer}')">Contact Farmer</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Render farmers
function renderFarmers() {
    const grid = document.getElementById('farmersGrid');
    
    farmers.forEach(farmer => {
        const card = document.createElement('div');
        card.className = 'farmer-card';
        const specialties = farmer.specialties.map(s => 
            s === 'eggs' ? '🥚' : s === 'meat' ? '🥩' : '🍯'
        ).join(' ');
        
        card.innerHTML = `
            <div class="farmer-avatar">👨‍🌾</div>
            <h3 class="farmer-name">${farmer.name}</h3>
            <p style="color: #666; margin-bottom: 0.5rem;">${farmer.owner}</p>
            <p class="farmer-specialty">${specialties} ${farmer.specialties.join(', ')}</p>
            <p style="color: #888; font-size: 0.9rem; margin-top: 0.5rem;">📍 ${farmer.location}</p>
        `;
        grid.appendChild(card);
    });
}

// Filter by category
function filterCategory(category) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter products
    if (category === 'all') {
        renderProducts(products);
    } else {
        const filtered = products.filter(p => p.category === category);
        renderProducts(filtered);
    }
}

// Search functionality
function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.farmer.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
    );
    renderProducts(filtered);
}

// Allow Enter key to search
document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') filterProducts();
});

// Contact farmer alert (replace with actual contact modal/form)
function contactFarmer(farmerName) {
    const farmer = farmers.find(f => f.name === farmerName);
    if (farmer) {
        alert(`Contact ${farmer.owner} at ${farmer.phone}\nOr visit ${farmer.name} (${farmer.location})`);
    }
}