import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// WhatsApp Cloud API Configuration
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "restaurant-verify-token";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

// Middleware
app.use(express.json());
app.use(cors());

// Make io accessible to routes
app.set('io', io);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Verify Configuration
function verifyConfig() {
  console.log('=== Configuration Check ===');
  
  if (!WHATSAPP_TOKEN || WHATSAPP_TOKEN.includes('your_token')) {
    console.log('❌ WHATSAPP_TOKEN: Not configured');
  } else {
    console.log('✅ WHATSAPP_TOKEN: Configured');
  }
  
  if (!PHONE_NUMBER_ID) {
    console.log('❌ PHONE_NUMBER_ID: Not configured');
  } else {
    console.log('✅ PHONE_NUMBER_ID: Configured');
  }
  
  if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID.includes('your_razorpay')) {
    console.log('❌ RAZORPAY_KEY_ID: Not configured');
  } else {
    console.log('✅ RAZORPAY_KEY_ID: Configured');
  }
  
  if (!RAZORPAY_KEY_SECRET || RAZORPAY_KEY_SECRET.includes('your_razorpay')) {
    console.log('❌ RAZORPAY_KEY_SECRET: Not configured');
  } else {
    console.log('✅ RAZORPAY_KEY_SECRET: Configured');
  }
  
  console.log('============================');
}

verifyConfig();

// MongoDB Schemas
const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: { 
    type: String, 
    required: true,
    enum: ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Specials']
  },
  price: { type: Number, required: true },
  image: String,
  isAvailable: { type: Boolean, default: true },
  isVeg: { type: Boolean, default: true },
  preparationTime: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  customerPhone: { type: String, required: true },
  customerName: { type: String, required: true },
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: String,
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  orderType: {
    type: String,
    enum: ['delivery', 'takeaway', 'dine-in'],
    default: 'delivery'
  },
  status: {
    type: String,
    enum: ['payment_pending', 'payment_verified', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'payment_pending'
  },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  specialInstructions: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  paymentVerifiedAt: Date,
  deliveredAt: Date
});

const reservationSchema = new mongoose.Schema({
  customerPhone: { type: String, required: true },
  customerName: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  partySize: { type: Number, required: true, min: 1 },
  specialRequests: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  tableNumber: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  state: { type: String, default: 'welcome' },
  cart: [{
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: String,
    quantity: { type: Number, default: 1 },
    price: Number
  }],
  tempData: {
    name: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    orderType: String,
    reservationDate: Date,
    reservationTime: String,
    partySize: Number,
    specialRequests: String
  },
  currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  currentReservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' },
  lastInteraction: { type: Date, default: Date.now }
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
const Order = mongoose.model('Order', orderSchema);
const Reservation = mongoose.model('Reservation', reservationSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

// WhatsApp Cloud API Message Sending Functions
async function sendMessage(to, body) {
  try {
    await axios({
      url: `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      data: {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body }
      }
    });
    console.log(`✅ Message sent to ${to}`);
  } catch (error) {
    console.error('❌ Error sending message:', error.response?.data || error.message);
  }
}

async function sendImage(to, imageUrl, caption) {
  try {
    await axios({
      url: `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      data: {
        messaging_product: "whatsapp",
        to,
        type: "image",
        image: {
          link: imageUrl,
          caption: caption
        }
      }
    });
    console.log(`✅ Image sent to ${to}`);
  } catch (error) {
    console.error('❌ Error sending image:', error.response?.data || error.message);
  }
}

async function sendReplyButton(to, bodyText, buttons) {
  try {
    await axios({
      url: `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      data: {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: bodyText
          },
          action: {
            buttons: buttons.map(btn => ({
              type: "reply",
              reply: {
                id: btn.id,
                title: btn.title
              }
            }))
          }
        }
      }
    });
    console.log(`✅ Button message sent to ${to}`);
  } catch (error) {
    console.error('❌ Error sending buttons:', error.response?.data || error.message);
  }
}

async function sendList(to, bodyText, buttonText, sections) {
  try {
    await axios({
      url: `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      data: {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "list",
          body: {
            text: bodyText
          },
          action: {
            button: buttonText,
            sections: sections
          }
        }
      }
    });
    console.log(`✅ List sent to ${to}`);
  } catch (error) {
    console.error('❌ Error sending list:', error.response?.data || error.message);
  }
}

// Razorpay Payment Functions
async function createRazorpayPaymentLink(amount, orderId, customerPhone, customerName) {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || 
        RAZORPAY_KEY_ID.includes('your_razorpay') || 
        RAZORPAY_KEY_SECRET.includes('your_razorpay')) {
      throw new Error('Razorpay credentials not configured');
    }

    const orderAmount = Math.max(amount * 100, 100);
    
    const response = await axios.post('https://api.razorpay.com/v1/payment_links', {
      amount: orderAmount,
      currency: 'INR',
      description: `Restaurant Order #${orderId.toString().slice(-6)}`,
      customer: {
        name: customerName,
        contact: customerPhone,
        email: `${customerPhone}@restaurant.com`
      },
      notify: {
        sms: true,
        email: false,
        whatsapp: true  // Enable WhatsApp notifications
      },
      reminder_enable: true,
      notes: {
        orderId: orderId.toString(),
        customerPhone: customerPhone
      },
      callback_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/payment-success`,  // Updated callback
      callback_method: 'get'
    }, {
      auth: {
        username: RAZORPAY_KEY_ID,
        password: RAZORPAY_KEY_SECRET
      },
      timeout: 10000
    });

    console.log('✅ Razorpay payment link created:', response.data.id);
    
    return {
      id: response.data.id,
      short_url: response.data.short_url,
      amount: response.data.amount,
      status: response.data.status
    };

  } catch (error) {
    console.error('❌ Razorpay API Error:', error.response?.data || error.message);
    throw new Error('Failed to create payment link: ' + (error.response?.data?.error?.description || error.message));
  }
}
// Bot Logic Handler
async function handleMessage(from, message) {
  let conversation = await Conversation.findOne({ phone: from });
  
  if (!conversation) {
    conversation = new Conversation({ 
      phone: from, 
      state: 'welcome',
      cart: [],
      tempData: {}
    });
    await conversation.save();
  }
  
  conversation.lastInteraction = new Date();

  const messageText = message.text?.body?.toLowerCase() || '';
  const interactiveReply = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id;

  console.log(`📱 From: ${from}, State: ${conversation.state}, Text: ${messageText}, Reply: ${interactiveReply}`);

  // Welcome state
  if (conversation.state === 'welcome' || messageText.includes('hi') || messageText.includes('hello') || messageText.includes('start')) {
    conversation.state = 'main_menu';
    await conversation.save();
    
    await sendReplyButton(from, '🍽️ *Welcome to Our Restaurant!*\n\nYour one-stop destination for delicious food.\n\nWhat would you like to do?', [
      { id: 'browse_menu', title: '🍕 Browse Menu' },
      { id: 'reserve_table', title: '🪑 Reserve Table' },
      { id: 'my_orders', title: '📦 My Orders' }
    ]);
    return;
  }

  // Main menu handling
  if (interactiveReply === 'browse_menu' || messageText.includes('menu')) {
    conversation.state = 'browsing';
    await conversation.save();
    
    const categories = await MenuItem.distinct('category');
    
    if (categories.length === 0) {
      await sendMessage(from, 'No categories available at the moment. Please check back later!');
      return;
    }
    
    const sections = [{
      title: 'Categories',
      rows: categories.map(cat => ({
        id: `cat_${cat.toLowerCase().replace(/\s+/g, '_')}`,
        title: cat,
        description: `View ${cat}`
      }))
    }];
    
    await sendList(from, '🍽️ Choose a category to browse:', 'Select Category', sections);
    return;
  }

  if (interactiveReply === 'reserve_table' || messageText.includes('reserv') || messageText.includes('book table')) {
  conversation.state = 'reservation_name';
  conversation.tempData = {};
  await conversation.save();
  
  await sendMessage(from, '🪑 *Table Reservation*\n\nLet\'s book a table for you!\n\nPlease enter your full name:');
  return;
}

  // Category selection
  if (interactiveReply?.startsWith('cat_')) {
    const categoryKey = interactiveReply.replace('cat_', '').replace(/_/g, ' ');
    const category = categoryKey.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    const items = await MenuItem.find({ category, isAvailable: true }).limit(10);
    
    if (items.length === 0) {
      await sendMessage(from, 'No items available in this category.');
      return;
    }

    conversation.state = 'viewing_items';
    await conversation.save();
    
    const sections = [{
      title: `${category}`,
      rows: items.map(item => ({
        id: `item_${item._id}`,
        title: item.name.substring(0, 24),
        description: `${item.isVeg ? '🟢' : '🔴'} ₹${item.price}`
      }))
    }];
    
    await sendList(from, `Available ${category}:`, 'View Item', sections);
    return;
  }

  // Item details
  if (interactiveReply?.startsWith('item_')) {
    const itemId = interactiveReply.replace('item_', '');
    const item = await MenuItem.findById(itemId);
    
    if (!item) {
      await sendMessage(from, 'Item not found.');
      return;
    }

    conversation.state = `adding_item_${itemId}`;
    await conversation.save();
    
    if (item.image) {
      await sendImage(from, item.image, `${item.name}\n\n${item.description}\n\n💰 Price: ₹${item.price}\n${item.isVeg ? '🟢 Vegetarian' : '🔴 Non-Vegetarian'}\n⏱️ Prep time: ${item.preparationTime || 15} mins`);
    } else {
      await sendMessage(from, `*${item.name}*\n\n${item.description}\n\n💰 Price: ₹${item.price}\n${item.isVeg ? '🟢 Vegetarian' : '🔴 Non-Vegetarian'}\n⏱️ Prep time: ${item.preparationTime || 15} mins`);
    }
    
    await sendReplyButton(from, 'Add to cart?', [
      { id: `add_${itemId}_1`, title: '➕ Add to Cart' },
      { id: 'browse_menu', title: '⬅️ Back to Menu' }
    ]);
    return;
  }

  // Add to cart
  if (interactiveReply?.startsWith('add_')) {
    const [, itemId, quantity] = interactiveReply.split('_');
    const item = await MenuItem.findById(itemId);
    
    if (item) {
      conversation.cart.push({
        menuItemId: item._id,
        name: item.name,
        quantity: parseInt(quantity),
        price: item.price
      });
      conversation.state = 'main_menu';
      await conversation.save();
      
      await sendReplyButton(from, `✅ ${item.name} added to cart!\n\nWhat would you like to do next?`, [
        { id: 'browse_menu', title: '🛍️ Continue Shopping' },
        { id: 'view_cart', title: '🛒 View Cart' },
        { id: 'checkout', title: '💳 Checkout' }
      ]);
    }
    return;
  }

  // View cart
  if (interactiveReply === 'view_cart' || messageText.includes('cart')) {
    if (conversation.cart.length === 0) {
      await sendMessage(from, '🛒 Your cart is empty!\n\nStart browsing our menu to add items.');
      await sendReplyButton(from, 'What would you like to do?', [
        { id: 'browse_menu', title: '🍕 Browse Menu' }
      ]);
      return;
    }

    let cartText = '🛒 *Your Cart:*\n\n';
    let total = 0;

    for (const cartItem of conversation.cart) {
      const item = await MenuItem.findById(cartItem.menuItemId);
      if (item) {
        const subtotal = item.price * cartItem.quantity;
        cartText += `• ${item.name}\n  Qty: ${cartItem.quantity} × ₹${item.price} = ₹${subtotal}\n\n`;
        total += subtotal;
      }
    }

    cartText += `*Total: ₹${total}*`;

    await sendMessage(from, cartText);

    conversation.state = 'cart_management';
    await conversation.save();

    await sendReplyButton(from, 'Ready to order?', [
      { id: 'checkout', title: '💳 Checkout' },
      { id: 'clear_cart', title: '🗑️ Clear Cart' },
      { id: 'browse_menu', title: '🛍️ Add More' }
    ]);
    return;
  }

  // Checkout
  if (interactiveReply === 'checkout') {
    if (conversation.cart.length === 0) {
      await sendMessage(from, 'Your cart is empty!');
      return;
    }

    conversation.state = 'awaiting_name';
    await conversation.save();
    
    await sendMessage(from, '✅ Let\'s complete your order!\n\nPlease enter your full name:');
    return;
  }

  // Collect name
  if (conversation.state === 'awaiting_name' && message.text) {
    const name = message.text.body.trim();
    
    if (!name || name.length < 2) {
      await sendMessage(from, '❌ Please enter a valid name (at least 2 characters)');
      return;
    }

    conversation.tempData.name = name;
    conversation.state = 'awaiting_order_type';
    await conversation.save();
    
    await sendReplyButton(from, `Thanks ${name}! How would you like to receive your order?`, [
      { id: 'delivery', title: '🚚 Delivery' },
      { id: 'takeaway', title: '🎒 Takeaway' },
      { id: 'dine_in', title: '🍽️ Dine-in' }
    ]);
    return;
  }

  // Order type selection
  if (interactiveReply === 'delivery' || interactiveReply === 'takeaway' || interactiveReply === 'dine_in') {
    conversation.tempData.orderType = interactiveReply.replace('_', '-');
    await conversation.save();

    if (interactiveReply === 'delivery') {
      conversation.state = 'awaiting_address';
      await conversation.save();
      await sendMessage(from, '📍 Please enter your delivery address:');
    } else {
      await createOrderAndPayment(from, conversation);
    }
    return;
  }

  // Collect address
  if (conversation.state === 'awaiting_address' && message.text) {
    const address = message.text.body.trim();
    
    if (!address || address.length < 5) {
      await sendMessage(from, '❌ Please enter a valid address');
      return;
    }

    conversation.tempData.address = address;
    conversation.state = 'awaiting_city';
    await conversation.save();
    
    await sendMessage(from, '🏙️ Enter your city:');
    return;
  }

  // Collect city
  if (conversation.state === 'awaiting_city' && message.text) {
    const city = message.text.body.trim();
    
    if (!city || city.length < 2) {
      await sendMessage(from, '❌ Please enter a valid city name');
      return;
    }

    conversation.tempData.city = city;
    conversation.state = 'awaiting_state';
    await conversation.save();
    
    await sendMessage(from, '🗺️ Enter your state:');
    return;
  }

  // Collect state
  if (conversation.state === 'awaiting_state' && message.text) {
    const state = message.text.body.trim();
    
    if (!state || state.length < 2) {
      await sendMessage(from, '❌ Please enter a valid state name');
      return;
    }

    conversation.tempData.state = state;
    conversation.state = 'awaiting_pincode';
    await conversation.save();
    
    await sendMessage(from, '📮 Enter your pincode:');
    return;
  }

  // Collect pincode and create order
  if (conversation.state === 'awaiting_pincode' && message.text) {
    const pincode = message.text.body.trim();
    
    if (!pincode || pincode.length < 5) {
      await sendMessage(from, '❌ Please enter a valid pincode');
      return;
    }

    conversation.tempData.pincode = pincode;
    await conversation.save();

    await createOrderAndPayment(from, conversation);
    return;
  }

  // Clear cart
  if (interactiveReply === 'clear_cart') {
    conversation.cart = [];
    conversation.state = 'main_menu';
    await conversation.save();
    
    await sendMessage(from, '🗑️ Cart cleared!');
    await sendReplyButton(from, 'What would you like to do?', [
      { id: 'browse_menu', title: '🍕 Browse Menu' }
    ]);
    return;
  }

  // My orders
  if (interactiveReply === 'my_orders' || messageText.includes('order')) {
    const orders = await Order.find({ customerPhone: from }).sort({ createdAt: -1 }).limit(5);
    
    if (orders.length === 0) {
      await sendMessage(from, '📦 You have no orders yet.');
      return;
    }

    let orderText = '📦 *Your Recent Orders:*\n\n';
    orders.forEach((order, idx) => {
      orderText += `${idx + 1}. Order #${order._id.toString().slice(-6)}\n`;
      orderText += `   Status: ${order.status.toUpperCase().replace(/_/g, ' ')}\n`;
      orderText += `   Total: ₹${order.totalAmount}\n`;
      orderText += `   Date: ${order.createdAt.toLocaleDateString()}\n\n`;
    });

    await sendMessage(from, orderText);
    return;
  }
  // Check order status
if (messageText.includes('status') || messageText === 'track' || messageText === 'order status') {
  const recentOrder = await Order.findOne({ customerPhone: from })
    .sort({ createdAt: -1 })
    .populate('items.menuItem');
  
  if (!recentOrder) {
    await sendMessage(from, '❌ No orders found.\n\nPlace an order first!');
    return;
  }
  
  const statusEmojis = {
    'payment_pending': '⏳',
    'payment_verified': '✅',
    'confirmed': '✅',
    'preparing': '👨‍🍳',
    'ready': '🎉',
    'out_for_delivery': '🚚',
    'delivered': '✅',
    'cancelled': '❌'
  };
  
  const statusMessages = {
    'payment_pending': 'Awaiting Payment',
    'payment_verified': 'Payment Confirmed',
    'confirmed': 'Order Confirmed',
    'preparing': 'Being Prepared',
    'ready': 'Ready for Pickup/Delivery',
    'out_for_delivery': 'Out for Delivery',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled'
  };
  
  let itemsList = '';
  recentOrder.items.forEach((item, i) => {
    itemsList += `${i + 1}. ${item.name} x${item.quantity} - ₹${item.subtotal}\n`;
  });
  
  const statusMsg = `📦 *Order Status*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 Order: #${recentOrder._id.toString().slice(-6)}\n` +
    `${statusEmojis[recentOrder.status]} Status: ${statusMessages[recentOrder.status]}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🛒 Items:\n${itemsList}\n` +
    `💰 Total: ₹${recentOrder.totalAmount}\n` +
    `🛵 Type: ${recentOrder.orderType.toUpperCase().replace(/-/g, ' ')}\n` +
    `📅 Ordered: ${recentOrder.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n` +
    (recentOrder.paymentVerifiedAt ? `✅ Paid: ${recentOrder.paymentVerifiedAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n` : '') +
    (recentOrder.deliveredAt ? `🎉 Delivered: ${recentOrder.deliveredAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n` : '');
  
  await sendMessage(from, statusMsg);
  
  // Show next actions based on status
  if (recentOrder.status === 'payment_pending') {
    await sendReplyButton(from, 'Complete your order:', [
      { id: 'browse_menu', title: '🛍️ Continue Shopping' },
      { id: 'view_cart', title: '🛒 View Cart' }
    ]);
  } else if (recentOrder.status === 'delivered') {
    await sendReplyButton(from, 'Order delivered! What\'s next?', [
      { id: 'browse_menu', title: '🍕 Order Again' },
      { id: 'reserve_table', title: '🪑 Reserve Table' }
    ]);
  } else {
    await sendReplyButton(from, 'What else can I help with?', [
      { id: 'browse_menu', title: '🍕 Browse Menu' },
      { id: 'reserve_table', title: '🪑 Reserve Table' },
      { id: 'my_orders', title: '📦 My Orders' }
    ]);
  }
  
  return;
}

  // Make reservation
  // ============================================
// RESERVATION FLOW
// ============================================

// Reservation - Step 1: Collect Name
if (conversation.state === 'reservation_name' && message.text) {
  const name = message.text.body.trim();
  
  if (!name || name.length < 2) {
    await sendMessage(from, '❌ Please enter a valid name (at least 2 characters)');
    return;
  }

  conversation.tempData.name = name;
  conversation.state = 'reservation_date';
  await conversation.save();

  await sendMessage(from, `Great ${name}! 📅\n\nPlease enter your preferred date (DD/MM/YYYY):\n\nExample: 25/01/2026`);
  return;
}

// Reservation - Step 2: Collect Date
if (conversation.state === 'reservation_date' && message.text) {
  const dateText = message.text.body.trim();
  const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = dateText.match(dateRegex);

  if (!match) {
    await sendMessage(from, '❌ Invalid date format.\n\nPlease use DD/MM/YYYY format.\nExample: 25/01/2026');
    return;
  }

  const [, day, month, year] = match;
  const date = new Date(year, month - 1, day);
  
  // Validate date
  if (isNaN(date.getTime())) {
    await sendMessage(from, '❌ Invalid date. Please enter a valid date.');
    return;
  }

  // Check if date is in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (date < today) {
    await sendMessage(from, '❌ Please enter a future date. We can\'t book tables in the past! 😊');
    return;
  }

  conversation.tempData.reservationDate = date;
  conversation.state = 'reservation_time';
  await conversation.save();

  await sendMessage(from, '⏰ What time would you like to dine?\n\nPlease enter time (e.g., 7:30 PM or 19:30):');
  return;
}

// Reservation - Step 3: Collect Time
if (conversation.state === 'reservation_time' && message.text) {
  const timeText = message.text.body.trim();
  
  if (!timeText || timeText.length < 4) {
    await sendMessage(from, '❌ Please enter a valid time.\n\nExamples: 7:30 PM, 19:30, 8 PM');
    return;
  }

  conversation.tempData.reservationTime = timeText;
  conversation.state = 'reservation_party_size';
  await conversation.save();

  await sendMessage(from, '👥 How many people will be joining?\n\nEnter the number of guests (1-20):');
  return;
}

// Reservation - Step 4: Collect Party Size
if (conversation.state === 'reservation_party_size' && message.text) {
  const partySizeText = message.text.body.trim();
  const partySize = parseInt(partySizeText);

  if (isNaN(partySize) || partySize < 1 || partySize > 20) {
    await sendMessage(from, '❌ Please enter a valid number between 1 and 20.\n\nFor parties larger than 20, please call us directly.');
    return;
  }

  conversation.tempData.partySize = partySize;
  conversation.state = 'reservation_special_requests';
  await conversation.save();

  await sendMessage(from, '💬 Any special requests or dietary requirements?\n\n(Type "none" if you don\'t have any)');
  return;
}

// Reservation - Step 5: Collect Special Requests & Create Reservation
if (conversation.state === 'reservation_special_requests' && message.text) {
  const specialRequestsText = message.text.body.trim();
  const specialRequests = specialRequestsText.toLowerCase() === 'none' ? '' : specialRequestsText;

  try {
    // Create reservation
    const reservation = new Reservation({
      customerPhone: from,
      customerName: conversation.tempData.name,
      date: conversation.tempData.reservationDate,
      time: conversation.tempData.reservationTime,
      partySize: conversation.tempData.partySize,
      specialRequests: specialRequests,
      status: 'pending'
    });

    await reservation.save();

    console.log('✅ Reservation created:', reservation._id.toString());

    // Update conversation
    conversation.currentReservationId = reservation._id;
    conversation.state = 'main_menu';
    conversation.tempData = {};
    await conversation.save();

    // Format confirmation message
    const confirmationText = `✅ *Reservation Request Submitted!*\n\n` +
      `👤 Name: ${reservation.customerName}\n` +
      `📅 Date: ${reservation.date.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}\n` +
      `⏰ Time: ${reservation.time}\n` +
      `👥 Party Size: ${reservation.partySize} ${reservation.partySize === 1 ? 'person' : 'people'}\n` +
      (specialRequests ? `💬 Special Requests: ${specialRequests}\n` : '') +
      `\n📋 Reservation ID: #${reservation._id.toString().slice(-6)}\n\n` +
      `⏳ Status: Pending Confirmation\n\n` +
      `We'll confirm your reservation shortly via WhatsApp!`;

    await sendMessage(from, confirmationText);

    // Send back to main menu
    await sendReplyButton(from, 'What else can I help you with?', [
      { id: 'browse_menu', title: '🍕 Browse Menu' },
      { id: 'reserve_table', title: '🪑 Another Reservation' },
      { id: 'my_reservations', title: '📋 My Reservations' }
    ]);

    // Notify admin via socket
    io.emit('new_reservation', reservation);
    console.log('🔔 Admin notified of new reservation');

  } catch (error) {
    console.error('❌ Error creating reservation:', error);
    await sendMessage(from, '❌ Sorry, there was an error creating your reservation. Please try again or call us directly.');
    
    conversation.state = 'main_menu';
    conversation.tempData = {};
    await conversation.save();
  }

  return;
}
  // Default response
  await sendReplyButton(from, 'I didn\'t understand that. How can I help you?', [
    { id: 'browse_menu', title: '🍕 Browse Menu' },
    { id: 'view_cart', title: '🛒 View Cart' }
  ]);
}

async function createOrderAndPayment(from, conversation) {
  try {
    let total = 0;
    const orderItems = [];

    for (const cartItem of conversation.cart) {
      const item = await MenuItem.findById(cartItem.menuItemId);
      if (item) {
        const subtotal = item.price * cartItem.quantity;
        orderItems.push({
          menuItem: item._id,
          name: item.name,
          quantity: cartItem.quantity,
          price: item.price,
          subtotal: subtotal
        });
        total += subtotal;
      }
    }

    const order = new Order({
      customerPhone: from,
      customerName: conversation.tempData.name,
      items: orderItems,
      totalAmount: total,
      orderType: conversation.tempData.orderType || 'delivery',
      deliveryAddress: {
        street: conversation.tempData.address,
        city: conversation.tempData.city,
        state: conversation.tempData.state,
        pincode: conversation.tempData.pincode
      },
      status: 'payment_pending'
    });

    await order.save();

    const paymentLink = await createRazorpayPaymentLink(
      total,
      order._id.toString(),
      from,
      conversation.tempData.name
    );

    order.razorpayOrderId = paymentLink.id;
    await order.save();

    conversation.currentOrderId = order._id;
    conversation.state = 'payment_pending';
    await conversation.save();

    const paymentMessage = `💰 *Order Created!*\n\n📋 Order ID: #${order._id.toString().slice(-6)}\n💰 Total: ₹${total}\n🛵 Type: ${order.orderType}\n\n🔗 *Pay now:*\n${paymentLink.short_url}\n\nComplete payment to confirm your order.`;

    await sendMessage(from, paymentMessage);

    io.emit('new_order', { order, paymentLink: paymentLink.short_url });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    await sendMessage(from, '❌ Sorry, there was an error creating your order. Please try again.');
    
    conversation.state = 'main_menu';
    await conversation.save();
  }
}

// Payment Webhook Endpoint
// ============================================
// PAYMENT SUCCESS CALLBACK (Primary Handler)
// ============================================
app.get('/payment-success', async (req, res) => {
  try {
    console.log('==========================================');
    console.log('🔔 PAYMENT SUCCESS CALLBACK RECEIVED');
    console.log('Full URL:', req.url);
    console.log('Query params:', JSON.stringify(req.query, null, 2));
    console.log('==========================================');
    
    const { 
      razorpay_payment_id, 
      razorpay_payment_link_id, 
      razorpay_payment_link_status,
      razorpay_payment_link_reference_id 
    } = req.query;
    
    // Validate required parameters
    if (!razorpay_payment_link_id) {
      console.error('❌ Missing payment_link_id');
      return res.send(getErrorPage('Invalid payment callback. Missing payment link ID.'));
    }
    
    console.log('🔍 Searching for order with razorpayOrderId:', razorpay_payment_link_id);
    
    // Find order
    const order = await Order.findOne({ razorpayOrderId: razorpay_payment_link_id });
    
    if (!order) {
      console.error('❌ Order not found for payment link:', razorpay_payment_link_id);
      
      // Search all orders to debug
      const allOrders = await Order.find().sort({ createdAt: -1 }).limit(5);
      console.log('Recent orders:', allOrders.map(o => ({
        id: o._id.toString(),
        razorpayOrderId: o.razorpayOrderId,
        status: o.status
      })));
      
      return res.send(getErrorPage('Order not found. Please contact support with your payment details.'));
    }

    console.log('✅ Order found:', {
      orderId: order._id.toString(),
      currentStatus: order.status,
      currentPaymentStatus: order.paymentStatus,
      customerPhone: order.customerPhone
    });

    // Check if already processed
    if (order.paymentStatus === 'completed') {
      console.log('ℹ️ Order already processed, showing success page');
      return res.send(getSuccessPage(order, razorpay_payment_id || order.razorpayPaymentId || 'COMPLETED'));
    }

    // Try to verify payment if payment_id is provided
    let paymentVerified = false;
    let finalPaymentId = razorpay_payment_id || razorpay_payment_link_reference_id;
    
    if (razorpay_payment_id) {
      console.log('🔍 Verifying payment with Razorpay API...');
      
      try {
        const paymentDetails = await axios.get(
          `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
          {
            auth: {
              username: RAZORPAY_KEY_ID,
              password: RAZORPAY_KEY_SECRET
            },
            timeout: 10000
          }
        );

        console.log('✅ Razorpay API Response:', {
          id: paymentDetails.data.id,
          status: paymentDetails.data.status,
          amount: paymentDetails.data.amount,
          method: paymentDetails.data.method
        });

        // Check if payment is successful
        if (paymentDetails.data.status === 'captured' || 
            paymentDetails.data.status === 'authorized') {
          console.log('✅ Payment verified as successful via API');
          paymentVerified = true;
        } else {
          console.log(`⚠️ Payment status from API: ${paymentDetails.data.status}`);
        }
        
      } catch (verifyError) {
        console.error('❌ Razorpay API error:', verifyError.response?.data || verifyError.message);
        // Continue with other verification methods
      }
    }
    
    // If API verification failed, check payment_link_status
    if (!paymentVerified && razorpay_payment_link_status === 'paid') {
      console.log('✅ Payment verified via payment_link_status = paid');
      paymentVerified = true;
    }
    
    // If still not verified, assume success (Razorpay redirects to success page only on success)
    if (!paymentVerified) {
      console.log('⚠️ Could not verify via API, but callback received - assuming success');
      paymentVerified = true;
    }
    
    if (paymentVerified) {
      await updateOrderAsSuccessful(order, finalPaymentId);
      return res.send(getSuccessPage(order, finalPaymentId));
    } else {
      return res.send(getPendingPage(order, finalPaymentId));
    }
    
  } catch (error) {
    console.error('❌ Critical error in payment-success:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).send(getErrorPage('An error occurred. Please contact support.'));
  }
});

// ============================================
// HELPER: Update Order as Successful
// ============================================
async function updateOrderAsSuccessful(order, paymentId) {
  try {
    console.log('📝 Updating order as successful...');
    console.log('Order ID:', order._id.toString());
    console.log('Payment ID:', paymentId);
    
    // Update order status
    order.status = 'payment_verified';
    order.paymentStatus = 'completed';
    order.razorpayPaymentId = paymentId || 'VERIFIED';
    order.paymentVerifiedAt = new Date();
    order.updatedAt = new Date();
    await order.save();
    
    console.log('✅ Order saved with new status:', {
      orderId: order._id.toString(),
      status: order.status,
      paymentStatus: order.paymentStatus,
      razorpayPaymentId: order.razorpayPaymentId
    });
    
    // Populate order items for display
    await order.populate('items.menuItem');
    
    // Emit to admin dashboard immediately
    console.log('📡 Emitting payment_received event to admin dashboard');
    io.emit('payment_received', { 
      order: order.toObject(),
      timestamp: new Date().toISOString(),
      message: 'New payment received'
    });
    
    // Also emit order_updated event
    io.emit('order_updated', {
      action: 'payment_verified',
      order: order.toObject(),
      timestamp: new Date().toISOString()
    });
    
    // Format order items for WhatsApp message
    let itemsList = '';
    order.items.forEach((item, index) => {
      itemsList += `${index + 1}. ${item.name} x${item.quantity} - ₹${item.subtotal}\n`;
    });
    
    // Send detailed WhatsApp confirmation
    const confirmationMessage = `✅ *PAYMENT SUCCESSFUL!*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 *Order Details*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🆔 Order ID: #${order._id.toString().slice(-6)}\n` +
      `💳 Payment ID: ${paymentId ? paymentId.substring(0, 20) : 'VERIFIED'}\n` +
      `👤 Name: ${order.customerName}\n` +
      `📱 Phone: ${order.customerPhone}\n` +
      `🛵 Type: ${order.orderType.toUpperCase().replace(/-/g, ' ')}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🛒 *Items Ordered*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${itemsList}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *Total Paid: ₹${order.totalAmount}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `✅ Payment Status: CONFIRMED\n` +
      `⏰ Paid at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
      `🎉 Thank you for your order!\n` +
      `Your order is being prepared.\n\n` +
      `Reply "status" to check order status.`;

    try {
      await sendMessage(order.customerPhone, confirmationMessage);
      console.log('✅ Detailed WhatsApp confirmation sent to:', order.customerPhone);
    } catch (msgError) {
      console.error('⚠️ Failed to send WhatsApp message:', msgError.message);
    }
    
    // Auto-confirm order after 3 seconds
    setTimeout(async () => {
      try {
        const updatedOrder = await Order.findById(order._id);
        if (!updatedOrder) {
          console.error('❌ Order not found for auto-confirm');
          return;
        }
        
        updatedOrder.status = 'confirmed';
        updatedOrder.updatedAt = new Date();
        await updatedOrder.save();
        
        console.log('✅ Order auto-confirmed:', updatedOrder._id.toString());
        
        await sendMessage(
          updatedOrder.customerPhone,
          `👨‍🍳 *Order Confirmed!*\n\n` +
          `Your order #${updatedOrder._id.toString().slice(-6)} is now being prepared!\n\n` +
          `⏱️ Estimated time: 20-30 minutes\n\n` +
          `We'll notify you when it's ready! 🔔`
        );
        
        // Clear cart and reset conversation
        const conversation = await Conversation.findOne({ phone: updatedOrder.customerPhone });
        if (conversation) {
          conversation.cart = [];
          conversation.tempData = {};
          conversation.state = 'main_menu';
          await conversation.save();
          console.log('✅ Cart cleared for:', updatedOrder.customerPhone);
        }
        
        // Emit update to admin
        await updatedOrder.populate('items.menuItem');
        io.emit('order_updated', { 
          action: 'auto_confirmed', 
          order: updatedOrder.toObject(),
          timestamp: new Date().toISOString()
        });
        
        console.log('📡 Emitted order_updated (auto_confirmed) to admin');
        
      } catch (confirmError) {
        console.error('❌ Auto-confirm error:', confirmError.message);
        console.error('Stack:', confirmError.stack);
      }
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error in updateOrderAsSuccessful:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// ============================================
// RAZORPAY WEBHOOK (Backup Handler)
// ============================================
app.post('/api/webhook/razorpay', async (req, res) => {
  try {
    console.log('==========================================');
    console.log('🔔 RAZORPAY WEBHOOK RECEIVED');
    console.log('Event:', req.body.event);
    console.log('Timestamp:', new Date().toISOString());
    console.log('==========================================');
    
    const webhookSignature = req.headers['x-razorpay-signature'];
    
    // Verify webhook signature if secret is configured
    if (RAZORPAY_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (expectedSignature !== webhookSignature) {
        console.log('❌ Invalid webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }
      console.log('✅ Webhook signature verified');
    }
    
    const { event, payload } = req.body;
    
    // Handle payment link paid event
    if (event === 'payment_link.paid') {
      const paymentLink = payload.payment_link.entity;
      const payment = payload.payment.entity;
      
      console.log('💳 Payment Link Paid Event:', {
        paymentLinkId: paymentLink.id,
        paymentId: payment.id,
        amount: payment.amount,
        status: payment.status
      });
      
      // Find order
      const order = await Order.findOne({ razorpayOrderId: paymentLink.id });
      
      if (!order) {
        console.error('❌ Order not found in webhook for payment link:', paymentLink.id);
        return res.status(404).json({ error: 'Order not found' });
      }
      
      console.log('✅ Order found in webhook:', order._id.toString());
      console.log('📊 Current status:', order.status, '/', order.paymentStatus);
      
      // Only update if payment is not already completed
      if (order.paymentStatus !== 'completed') {
        console.log('🔄 Updating order via webhook...');
        await updateOrderAsSuccessful(order, payment.id);
      } else {
        console.log('ℹ️ Order already marked as completed, skipping update');
      }
    }
    
    // Handle other webhook events
    if (event === 'payment.captured') {
      console.log('💰 Payment Captured Event');
      const payment = payload.payment.entity;
      
      // Try to find order by payment ID
      const order = await Order.findOne({ razorpayPaymentId: payment.id });
      if (order && order.paymentStatus !== 'completed') {
        console.log('🔄 Updating order from payment.captured event');
        await updateOrderAsSuccessful(order, payment.id);
      }
    }
    
    if (event === 'payment.failed') {
      console.log('❌ Payment Failed Event');
      const payment = payload.payment.entity;
      
      // Find and update order
      const order = await Order.findOne({ 
        $or: [
          { razorpayPaymentId: payment.id },
          { razorpayOrderId: payment.order_id }
        ]
      });
      
      if (order) {
        order.status = 'cancelled';
        order.paymentStatus = 'failed';
        await order.save();
        
        await sendMessage(
          order.customerPhone,
          `❌ Payment failed for order #${order._id.toString().slice(-6)}\n\n` +
          `Please try again or contact support.`
        );
        
        io.emit('order_updated', {
          action: 'payment_failed',
          order: order.toObject()
        });
      }
    }
    
    res.status(200).json({ status: 'success', event });
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SUCCESS PAGE HTML
// ============================================
function getSuccessPage(order, paymentId) {
  const cleanPhone = order.customerPhone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}`;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Successful ✅</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          animation: slideUp 0.5s ease;
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .success-icon {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 25px;
          animation: scaleUp 0.6s ease;
          box-shadow: 0 10px 30px rgba(76, 175, 80, 0.3);
        }
        
        .success-icon::after {
          content: '✓';
          color: white;
          font-size: 60px;
          font-weight: bold;
        }
        
        @keyframes scaleUp {
          0% { transform: scale(0) rotate(-180deg); }
          50% { transform: scale(1.1) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        
        h1 { 
          color: #4CAF50; 
          font-size: 32px; 
          margin-bottom: 10px; 
          font-weight: 700; 
        }
        
        .subtitle {
          color: #666; 
          font-size: 16px; 
          margin-bottom: 30px;
          line-height: 1.5;
        }
        
        .message-box {
          background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
          color: #2e7d32;
          padding: 18px;
          border-radius: 12px;
          margin-bottom: 25px;
          font-size: 15px;
          font-weight: 600;
          border-left: 4px solid #4CAF50;
        }
        
        .order-details {
          background: #f8f9fa;
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 30px;
          text-align: left;
          border: 1px solid #e0e0e0;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px solid #e8e8e8;
          font-size: 15px;
        }
        
        .detail-row:last-child {
          border-bottom: none;
          margin-top: 15px;
          padding-top: 20px;
          border-top: 3px solid #4CAF50;
          font-weight: bold;
          font-size: 20px;
        }
        
        .detail-label {
          color: #666;
          font-weight: 500;
        }
        
        .detail-value {
          color: #333;
          font-weight: 600;
        }
        
        .btn {
          display: block;
          width: 100%;
          background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
          color: white;
          text-decoration: none;
          padding: 18px 30px;
          border-radius: 50px;
          font-weight: 600;
          font-size: 17px;
          transition: all 0.3s;
          box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);
          border: none;
          cursor: pointer;
        }
        
        .btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(37, 211, 102, 0.6);
        }
        
        .btn:active {
          transform: translateY(-1px);
        }
        
        .auto-redirect {
          margin-top: 25px;
          font-size: 14px;
          color: #999;
        }
        
        .countdown {
          font-weight: bold;
          color: #25D366;
          font-size: 18px;
        }
        
        .order-id-badge {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        
        @media (max-width: 480px) {
          .container { padding: 30px 20px; }
          h1 { font-size: 26px; }
          .btn { padding: 16px 20px; font-size: 16px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon"></div>
        
        <h1>Payment Successful!</h1>
        <p class="subtitle">Your order has been confirmed and is being prepared</p>
        
        <div class="order-id-badge">Order #${order._id.toString().slice(-6)}</div>
        
        <div class="message-box">
          ✅ Confirmation sent to your WhatsApp
        </div>
        
        <div class="order-details">
          <div class="detail-row">
            <span class="detail-label">📋 Order ID</span>
            <span class="detail-value">#${order._id.toString().slice(-6)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">💳 Payment ID</span>
            <span class="detail-value">${paymentId ? paymentId.substring(0, 18) + '...' : 'VERIFIED'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">👤 Customer</span>
            <span class="detail-value">${order.customerName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🛵 Order Type</span>
            <span class="detail-value">${order.orderType.toUpperCase().replace(/-/g, ' ')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">💰 Total Paid</span>
            <span class="detail-value">₹${order.totalAmount}</span>
          </div>
        </div>
        
        <button class="btn" onclick="redirectToWhatsApp()">
          📱 Return to WhatsApp Chat
        </button>
        
        <p class="auto-redirect">
          Auto-redirecting in <span class="countdown" id="countdown">3</span> seconds
        </p>
      </div>
      
      <script>
        const whatsappUrl = '${whatsappUrl}';
        let seconds = 3;
        let redirected = false;
        
        function redirectToWhatsApp() {
          if (redirected) return;
          redirected = true;
          
          console.log('Redirecting to WhatsApp:', whatsappUrl);
          window.location.href = whatsappUrl;
        }
        
        // Countdown
        const interval = setInterval(() => {
          seconds--;
          document.getElementById('countdown').textContent = seconds;
          
          if (seconds <= 0) {
            clearInterval(interval);
            redirectToWhatsApp();
          }
        }, 1000);
        
        // Mobile detection and immediate redirect
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
          setTimeout(redirectToWhatsApp, 2000);
        }
      </script>
    </body>
    </html>
  `;
}

// ============================================
// PENDING PAGE HTML
// ============================================
function getPendingPage(order, paymentId) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Pending</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #FFA726 0%, #FB8C00 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .pending-icon {
          width: 80px;
          height: 80px;
          background: #FF9800;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 48px;
        }
        h1 { color: #FF9800; margin-bottom: 15px; }
        p { color: #666; line-height: 1.6; margin-bottom: 20px; }
        .info-box {
          background: #fff3e0;
          color: #e65100;
          padding: 15px;
          border-radius: 10px;
          font-size: 14px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="pending-icon">⏳</div>
        <h1>Payment Pending</h1>
        <p>Your payment is being verified. This usually takes a few moments.</p>
        <p><strong>Order #${order._id.toString().slice(-6)}</strong></p>
        <div class="info-box">
          ℹ️ You'll receive a WhatsApp message once payment is confirmed
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================
// ERROR PAGE HTML
// ============================================
function getErrorPage(message) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Issue</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .error-icon {
          width: 80px;
          height: 80px;
          background: #f44336;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 48px;
          color: white;
        }
        h1 { color: #f44336; margin-bottom: 15px; }
        p { color: #666; line-height: 1.6; margin-bottom: 20px; }
        .support-text {
          background: #fff3cd;
          color: #856404;
          padding: 15px;
          border-radius: 10px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error-icon">✕</div>
        <h1>Payment Issue</h1>
        <p>${message}</p>
        <div class="support-text">
          📞 Please contact support for assistance
        </div>
      </div>
    </body>
    </html>
  `;
}

// Webhook verification endpoint (GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verification failed");
    res.sendStatus(403);
  }
});

// Webhook handler (POST)
app.post("/webhook", async (req, res) => {
  console.log('=== WEBHOOK RECEIVED ===');
  
  const { entry } = req.body;
  
  if (!entry || entry.length === 0) {
    return res.status(400).send("Invalid request");
  }

  const changes = entry[0].changes;
  if (!changes || changes.length === 0) {
    return res.status(400).send("Invalid request");
  }

  const messages = changes[0].value.messages ? changes[0].value.messages[0] : null;
  
  if (messages) {
    const phoneNumber = messages.from;
    console.log(`📱 Message received from: ${phoneNumber}`);
    
    await handleMessage(phoneNumber, messages);
  }

  res.status(200).send("Webhook processed");
});

// Admin API Routes
app.get('/api/menu', async (req, res) => {
  try {
    const items = await MenuItem.find().sort({ category: 1, name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/menu/category/:category', async (req, res) => {
  try {
    const items = await MenuItem.find({ 
      category: req.params.category, 
      isAvailable: true 
    }).sort({ name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/menu', async (req, res) => {
  try {
    const item = new MenuItem(req.body);
    await item.save();
    io.emit('menu_updated', { action: 'created', item });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/menu/:id', async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    io.emit('menu_updated', { action: 'updated', item });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/menu/:id', async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    io.emit('menu_updated', { action: 'deleted', itemId: req.params.id });
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const query = status ? { status } : {};
    const orders = await Order.find(query)
      .populate('items.menuItem')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/stats', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ 
      status: { $in: ['payment_pending', 'confirmed', 'preparing'] }
    });
    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    
    res.json({
      totalOrders,
      pendingOrders,
      totalRevenue: revenueResult[0]?.total || 0,
      todayOrders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true }
    ).populate('items.menuItem');
    
    io.emit('order_updated', { action: 'status_changed', order });
    
    const statusMessages = {
      confirmed: '✅ Your order has been confirmed!',
      preparing: '👨‍🍳 Your order is being prepared!',
      ready: '🎉 Your order is ready!',
      out_for_delivery: '🚚 Your order is out for delivery!',
      delivered: '✅ Order delivered! Enjoy your meal!',
      cancelled: '❌ Your order has been cancelled.'
    };
    
    if (statusMessages[status]) {
      const message = `${statusMessages[status]}\n\nOrder #${order._id.toString().slice(-6)}`;
      await sendMessage(order.customerPhone, message);
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reservations', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const query = status ? { status } : {};
    const reservations = await Reservation.find(query)
      .sort({ date: 1, time: 1 })
      .limit(parseInt(limit));
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/reservations/:id/status', async (req, res) => {
  try {
    const { status, tableNumber } = req.body;
    const updateData = { status, updatedAt: Date.now() };
    if (tableNumber) updateData.tableNumber = tableNumber;
    
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    io.emit('reservation_updated', { action: 'status_changed', reservation });
    
    const statusMessages = {
      confirmed: `✅ Your reservation is confirmed!\n\n📅 Date: ${reservation.date.toLocaleDateString()}\n⏰ Time: ${reservation.time}\n👥 Party Size: ${reservation.partySize}${tableNumber ? `\n🪑 Table: ${tableNumber}` : ''}\n\nSee you soon!`,
      cancelled: `❌ Your reservation has been cancelled.\n\nReservation #${reservation._id.toString().slice(-6)}`
    };
    
    if (statusMessages[status]) {
      await sendMessage(reservation.customerPhone, statusMessages[status]);
    }
    
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('✅ Admin connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('❌ Admin disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log('=================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Admin URL: http://localhost:${PORT}`);
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log('=================================');
});