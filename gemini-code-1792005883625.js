const socket = io();
let orders = [];
let currentAdminName = localStorage.getItem('restaurant_admin_name') || '';

function setAdminIdentity() {
    const select = document.getElementById('admin-role-select').value;
    const custom = document.getElementById('admin-custom-name').value.trim();
    currentAdminName = custom !== '' ? custom : select;
    localStorage.setItem('restaurant_admin_name', currentAdminName);
    document.getElementById('current-admin-display').innerText = currentAdminName;
    document.getElementById('login-modal').style.display = 'none';
}

window.addEventListener('DOMContentLoaded', () => {
    if (currentAdminName) {
        document.getElementById('current-admin-display').innerText = currentAdminName;
        document.getElementById('login-modal').style.display = 'none';
    }
});

let audioCtx = null;
let ringInterval = null;

function playRingTone() {
    if (ringInterval) return;
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    function beep() {
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') { audioCtx.resume(); }
        playTone(440, 0.2, 0);
        playTone(480, 0.2, 0.25);
    }
    function playTone(freq, duration, delay) {
        setTimeout(() => {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        }, delay * 1000);
    }
    beep();
    ringInterval = setInterval(beep, 2000);
}

function stopRingTone() {
    if (ringInterval) {
        clearInterval(ringInterval);
        ringInterval = null;
    }
}

async function fetchOrders() {
    try {
        const res = await fetch('/api/orders');
        orders = await res.json();
        renderOrders();
    } catch (err) {
        console.error('Error fetching orders:', err);
    }
}

function renderOrders() {
    const container = document.getElementById('orders-container');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #777;">لا توجد طلبات جديدة حالياً...</p>';
        return;
    }

    let hasPending = false;
    container.innerHTML = orders.map(order => {
        const isPending = order.status === 'pending';
        if (isPending) hasPending = true;

        let itemsHtml = order.items.map(i => `<li>${i.name} (×${i.quantity}) - ${i.price} د.ع</li>`).join('');

        return `
            <div class="order-card ${order.status}" id="order-${order.id}">
                <div class="order-header">
                    <span>طلب #${order.id.slice(-4)}</span>
                    <span>${new Date(order.createdAt).toLocaleTimeString('ar-IQ')}</span>
                </div>
                <div class="order-body">
                    <p><strong>الزبون:</strong> ${order.customerName || 'بدون اسم'}</p>
                    <p><strong>الهاتف:</strong> <a href="tel:${order.customerPhone}" style="color: #007bff;">📞 ${order.customerPhone}</a></p>
                    <p><strong>العنوان:</strong> 📍 ${order.customerAddress}</p>
                    <p><strong>ملاحظات:</strong> <span style="color: #d9534f;">${order.customerNotes || 'لا توجد'}</span></p>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <p><strong>الأطباق:</strong></p>
                    <ul class="order-items-list">${itemsHtml}</ul>
                    <p><strong>المجموع:</strong> <span class="total-price">${order.totalPrice} د.ع</span></p>
                </div>
                <div class="order-footer">
                    ${isPending ? `
                        <input type="text" id="prep-time-${order.id}" placeholder="وقت التحضير (مثال: 15 دقيقة)" class="prep-input">
                        <div class="btn-group">
                            <button onclick="updateOrderStatus('${order.id}', 'accepted')" class="btn-accept">قبول</button>
                            <button onclick="updateOrderStatus('${order.id}', 'rejected')" class="btn-reject">رفض</button>
                        </div>
                    ` : `
                        <div class="status-badge">
                            ${order.status === 'accepted' ? '✅ تم القبول' : '❌ مرفوض'} 
                            ${order.prepTime ? `<br>وقت التحضير: ${order.prepTime}` : ''}
                            ${order.handledBy ? `<br><small>بواسطة: ${order.handledBy}</small>` : ''}
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');

    if (hasPending) { playRingTone(); } else { stopRingTone(); }
}

async function updateOrderStatus(orderId, status) {
    if (!currentAdminName) {
        alert('الرجاء تحديد اسم المسؤول أولاً!');
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }
    const prepInput = document.getElementById(`prep-time-${orderId}`);
    const prepTime = prepInput ? prepInput.value : '';
    if (status === 'accepted' && !prepTime) {
        alert('يرجى كتابة وقت التحضير!');
        return;
    }
    try {
        await fetch(`/api/orders/${orderId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, prepTime, adminName: currentAdminName })
        });
        stopRingTone();
    } catch (err) {
        console.error('Error updating status:', err);
    }
}

socket.on('new-order', (newOrder) => {
    orders.unshift(newOrder);
    renderOrders();
});

socket.on('order-status-updated', (updatedOrder) => {
    const index = orders.findIndex(o => o.id === updatedOrder.id);
    if (index !== -1) orders[index] = updatedOrder;
    renderOrders();
});

window.onload = () => {
    fetchOrders();
    document.body.addEventListener('click', () => {
        if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }
    }, { once: true });
};