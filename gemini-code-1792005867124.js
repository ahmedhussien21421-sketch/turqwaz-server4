const fs = require('fs');
const path = require('path');

const ORDERS_FILE = path.join(__dirname, '../data_orders.json');
const MENU_FILE = path.join(__dirname, '../menu.json');

function getMenu() {
    if (!fs.existsSync(MENU_FILE)) return [];
    const data = fs.readFileSync(MENU_FILE, 'utf8');
    return JSON.parse(data);
}

function getOrders() {
    if (!fs.existsSync(ORDERS_FILE)) return [];
    try {
        const data = fs.readFileSync(ORDERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function saveOrders(orders) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

function addOrder(order) {
    const orders = getOrders();
    const newOrder = { id: Date.now().toString(), ...order };
    orders.unshift(newOrder);
    saveOrders(orders);
    return newOrder;
}

function updateOrderStatus(id, updateData) {
    const orders = getOrders();
    const order = orders.find(o => o.id === id);
    if (!order) return null;

    order.status = updateData.status;
    if (updateData.prepTime) order.prepTime = updateData.prepTime;
    if (updateData.adminName) order.handledBy = updateData.adminName;
    
    saveOrders(orders);
    return order;
}

module.exports = { getMenu, getOrders, addOrder, updateOrderStatus };