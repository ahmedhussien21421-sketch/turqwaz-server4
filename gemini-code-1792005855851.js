const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const store = require('./lib/store');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/menu', (req, res) => {
    try {
        const menu = store.getMenu();
        res.json(menu);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load menu' });
    }
});

app.get('/api/orders', (req, res) => {
    try {
        const orders = store.getOrders();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load orders' });
    }
});

app.post('/api/orders', (req, res) => {
    try {
        const orderData = req.body;
        const newOrder = store.addOrder({
            ...orderData,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        io.emit('new-order', newOrder);
        res.status(201).json({ success: true, order: newOrder });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.post('/api/orders/:id/status', (req, res) => {
    try {
        const orderId = req.params.id;
        const { status, prepTime, adminName } = req.body;
        const updatedOrder = store.updateOrderStatus(orderId, { status, prepTime, adminName });
        
        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        io.emit('order-status-updated', updatedOrder);
        res.json({ success: true, order: updatedOrder });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

io.on('connection', (socket) => {
    console.log('Client/Admin connected:', socket.id);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});