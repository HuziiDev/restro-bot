import { Conversation } from '../models/MenuItem.js';
import { MenuItem, Order, Reservation, Customer } from '../models/MenuItem.js';
import { sendTextMessage, sendButtons, sendList } from './whatsappService.js';
import { createPaymentLink } from './paymentService.js';

export const handleIncomingMessage = async (message, client, io) => {
  const from = message.from;
  const messageBody = message.body.trim().toLowerCase();

  console.log(`📱 Message from ${from}: ${messageBody}`);

  // Get or create conversation
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
  await conversation.save();

  // Handle different conversation states
  await routeMessage(from, messageBody, conversation, client, io);
};

const routeMessage = async (from, messageBody, conversation, client, io) => {
  const state = conversation.state;

  // Global commands
  if (['hi', 'hello', 'start', 'menu'].includes(messageBody)) {
    return await showMainMenu(from, conversation, client);
  }

  if (messageBody === 'help') {
    return await showHelp(from, client);
  }

  // State-based routing
  switch (state) {
    case 'welcome':
    case 'main_menu':
      await handleMainMenu(from, messageBody, conversation, client);
      break;

    case 'browsing_menu':
      await handleMenuBrowsing(from, messageBody, conversation, client);
      break;

    case 'viewing_item':
      await handleItemViewing(from, messageBody, conversation, client);
      break;

    case 'cart_management':
      await handleCartManagement(from, messageBody, conversation, client);
      break;

    case 'awaiting_name':
      await handleNameCollection(from, messageBody, conversation, client);
      break;

    case 'awaiting_order_type':
      await handleOrderTypeSelection(from, messageBody, conversation, client);
      break;

    case 'awaiting_address':
      await handleAddressCollection(from, messageBody, conversation, client);
      break;

    case 'awaiting_city':
      await handleCityCollection(from, messageBody, conversation, client);
      break;

    case 'awaiting_state':
      await handleStateCollection(from, messageBody, conversation, client);
      break;

    case 'awaiting_pincode':
      await handlePincodeCollection(from, messageBody, conversation, client, io);
      break;

    case 'reservation_date':
      await handleReservationDate(from, messageBody, conversation, client);
      break;

    case 'reservation_time':
      await handleReservationTime(from, messageBody, conversation, client);
      break;

    case 'reservation_party_size':
      await handleReservationPartySize(from, messageBody, conversation, client);
      break;

    case 'reservation_special_requests':
      await handleReservationSpecialRequests(from, messageBody, conversation, client, io);
      break;

    default:
      await showMainMenu(from, conversation, client);
  }
};

const showMainMenu = async (from, conversation, client) => {
  conversation.state = 'main_menu';
  await conversation.save();

  const welcomeText = `🍽️ *Welcome to Our Restaurant!*\n\nWhat would you like to do today?`;

  await sendButtons(from, welcomeText, [
    { buttonId: 'browse_menu', buttonText: { displayText: '🍕 Browse Menu' } },
    { buttonId: 'view_cart', buttonText: { displayText: '🛒 View Cart' } },
    { buttonId: 'my_orders', buttonText: { displayText: '📦 My Orders' } },
    { buttonId: 'reservation', buttonText: { displayText: '🪑 Make Reservation' } }
  ], client);
};

const handleMainMenu = async (from, messageBody, conversation, client) => {
  if (messageBody === 'browse_menu' || messageBody.includes('menu') || messageBody.includes('food')) {
    await showCategoryMenu(from, conversation, client);
  } else if (messageBody === 'view_cart' || messageBody.includes('cart')) {
    await showCart(from, conversation, client);
  } else if (messageBody === 'my_orders' || messageBody.includes('order')) {
    await showMyOrders(from, conversation, client);
  } else if (messageBody === 'reservation' || messageBody.includes('reserv')) {
    await startReservation(from, conversation, client);
  } else {
    await sendTextMessage(from, 'Please select an option from the menu.', client);
  }
};

const showCategoryMenu = async (from, conversation, client) => {
  conversation.state = 'browsing_menu';
  await conversation.save();

  const categories = await MenuItem.distinct('category');
  
  const rows = categories.map(cat => ({
    title: cat,
    description: `View ${cat}`,
    rowId: `cat_${cat.toLowerCase().replace(/\s+/g, '_')}`
  }));

  await sendList(from, '🍽️ Select a category:', 'View Categories', [
    {
      title: 'Menu Categories',
      rows: rows
    }
  ], client);
};

const handleMenuBrowsing = async (from, messageBody, conversation, client) => {
  if (messageBody.startsWith('cat_')) {
    const category = messageBody.replace('cat_', '').replace(/_/g, ' ');
    const categoryFormatted = category.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    const items = await MenuItem.find({ 
      category: categoryFormatted,
      isAvailable: true 
    }).limit(10);

    if (items.length === 0) {
      await sendTextMessage(from, 'No items available in this category.', client);
      return await showCategoryMenu(from, conversation, client);
    }

    const rows = items.map(item => ({
      title: item.name.substring(0, 24),
      description: `${item.isVeg ? '🟢' : '🔴'} ₹${item.price}`,
      rowId: `item_${item._id}`
    }));

    await sendList(from, `${categoryFormatted} Menu:`, 'Select Item', [
      {
        title: categoryFormatted,
        rows: rows
      }
    ], client);
  }
};

const showCart = async (from, conversation, client) => {
  if (conversation.cart.length === 0) {
    await sendTextMessage(from, '🛒 Your cart is empty!\n\nStart browsing our menu to add items.', client);
    return await showMainMenu(from, conversation, client);
  }

  let cartText = '🛒 *Your Cart:*\n\n';
  let total = 0;

  for (const item of conversation.cart) {
    const menuItem = await MenuItem.findById(item.menuItemId);
    if (menuItem) {
      const subtotal = menuItem.price * item.quantity;
      cartText += `${menuItem.name}\n`;
      cartText += `  Qty: ${item.quantity} × ₹${menuItem.price} = ₹${subtotal}\n\n`;
      total += subtotal;
    }
  }

  cartText += `*Total: ₹${total}*`;

  await sendTextMessage(from, cartText, client);

  conversation.state = 'cart_management';
  await conversation.save();

  await sendButtons(from, 'What would you like to do?', [
    { buttonId: 'checkout', buttonText: { displayText: '💳 Checkout' } },
    { buttonId: 'continue_shopping', buttonText: { displayText: '🛍️ Continue Shopping' } },
    { buttonId: 'clear_cart', buttonText: { displayText: '🗑️ Clear Cart' } }
  ], client);
};

const handleCartManagement = async (from, messageBody, conversation, client) => {
  if (messageBody === 'checkout') {
    conversation.state = 'awaiting_name';
    await conversation.save();
    await sendTextMessage(from, '✅ Let\'s complete your order!\n\nPlease enter your full name:', client);
  } else if (messageBody === 'continue_shopping') {
    await showCategoryMenu(from, conversation, client);
  } else if (messageBody === 'clear_cart') {
    conversation.cart = [];
    conversation.state = 'main_menu';
    await conversation.save();
    await sendTextMessage(from, '🗑️ Cart cleared!', client);
    await showMainMenu(from, conversation, client);
  }
};

const handleNameCollection = async (from, messageBody, conversation, client) => {
  if (!messageBody || messageBody.length < 2) {
    return await sendTextMessage(from, '❌ Please enter a valid name (at least 2 characters)', client);
  }

  conversation.tempData.name = messageBody;
  conversation.state = 'awaiting_order_type';
  await conversation.save();

  await sendButtons(from, `Thanks ${messageBody}! How would you like to receive your order?`, [
    { buttonId: 'delivery', buttonText: { displayText: '🚚 Delivery' } },
    { buttonId: 'takeaway', buttonText: { displayText: '🎒 Takeaway' } },
    { buttonId: 'dine_in', buttonText: { displayText: '🍽️ Dine-in' } }
  ], client);
};

const handleOrderTypeSelection = async (from, messageBody, conversation, client) => {
  if (['delivery', 'takeaway', 'dine_in'].includes(messageBody)) {
    conversation.tempData.orderType = messageBody;
    await conversation.save();

    if (messageBody === 'delivery') {
      conversation.state = 'awaiting_address';
      await conversation.save();
      await sendTextMessage(from, '📍 Please enter your delivery address:', client);
    } else {
      // For takeaway and dine-in, skip address and create order
      await createOrderAndPayment(from, conversation, client);
    }
  }
};

const handleAddressCollection = async (from, messageBody, conversation, client) => {
  if (!messageBody || messageBody.length < 5) {
    return await sendTextMessage(from, '❌ Please enter a valid address', client);
  }

  conversation.tempData.address = messageBody;
  conversation.state = 'awaiting_city';
  await conversation.save();

  await sendTextMessage(from, '🏙️ Enter your city:', client);
};

const handleCityCollection = async (from, messageBody, conversation, client) => {
  if (!messageBody || messageBody.length < 2) {
    return await sendTextMessage(from, '❌ Please enter a valid city name', client);
  }

  conversation.tempData.city = messageBody;
  conversation.state = 'awaiting_state';
  await conversation.save();

  await sendTextMessage(from, '🗺️ Enter your state:', client);
};

const handleStateCollection = async (from, messageBody, conversation, client) => {
  if (!messageBody || messageBody.length < 2) {
    return await sendTextMessage(from, '❌ Please enter a valid state name', client);
  }

  conversation.tempData.state = messageBody;
  conversation.state = 'awaiting_pincode';
  await conversation.save();

  await sendTextMessage(from, '📮 Enter your pincode:', client);
};

const handlePincodeCollection = async (from, messageBody, conversation, client, io) => {
  if (!messageBody || messageBody.length < 5) {
    return await sendTextMessage(from, '❌ Please enter a valid pincode', client);
  }

  conversation.tempData.pincode = messageBody;
  await conversation.save();

  await createOrderAndPayment(from, conversation, client, io);
};

const createOrderAndPayment = async (from, conversation, client, io) => {
  try {
    // Calculate total
    let total = 0;
    const orderItems = [];

    for (const cartItem of conversation.cart) {
      const menuItem = await MenuItem.findById(cartItem.menuItemId);
      if (menuItem) {
        const subtotal = menuItem.price * cartItem.quantity;
        orderItems.push({
          menuItem: menuItem._id,
          name: menuItem.name,
          quantity: cartItem.quantity,
          price: menuItem.price,
          subtotal: subtotal
        });
        total += subtotal;
      }
    }

    // Create order
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

    // Create payment link
    const paymentLink = await createPaymentLink(
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

    await sendTextMessage(from, paymentMessage, client);

    // Notify admin
    if (io) {
      io.emit('new_order', { order, paymentLink: paymentLink.short_url });
    }

  } catch (error) {
    console.error('❌ Error creating order:', error);
    await sendTextMessage(from, '❌ Sorry, there was an error creating your order. Please try again.', client);
    
    conversation.state = 'main_menu';
    await conversation.save();
  }
};

const showMyOrders = async (from, conversation, client) => {
  const orders = await Order.find({ customerPhone: from })
    .sort({ createdAt: -1 })
    .limit(5);

  if (orders.length === 0) {
    await sendTextMessage(from, '📦 You have no orders yet.', client);
    return await showMainMenu(from, conversation, client);
  }

  let orderText = '📦 *Your Recent Orders:*\n\n';
  
  orders.forEach((order, idx) => {
    orderText += `${idx + 1}. Order #${order._id.toString().slice(-6)}\n`;
    orderText += `   Status: ${order.status.toUpperCase().replace(/_/g, ' ')}\n`;
    orderText += `   Total: ₹${order.totalAmount}\n`;
    orderText += `   Date: ${order.createdAt.toLocaleDateString()}\n\n`;
  });

  await sendTextMessage(from, orderText, client);
  await showMainMenu(from, conversation, client);
};

const startReservation = async (from, conversation, client) => {
  conversation.state = 'reservation_date';
  conversation.tempData = {};
  await conversation.save();

  await sendTextMessage(from, '🪑 *Table Reservation*\n\nPlease enter your preferred date (DD/MM/YYYY):', client);
};

const handleReservationDate = async (from, messageBody, conversation, client) => {
  const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = messageBody.match(dateRegex);

  if (!match) {
    return await sendTextMessage(from, '❌ Invalid date format. Please use DD/MM/YYYY (e.g., 25/12/2024)', client);
  }

  const [, day, month, year] = match;
  const date = new Date(year, month - 1, day);

  if (date < new Date()) {
    return await sendTextMessage(from, '❌ Please enter a future date.', client);
  }

  conversation.tempData.reservationDate = date;
  conversation.state = 'reservation_time';
  await conversation.save();

  await sendTextMessage(from, '⏰ Enter your preferred time (e.g., 7:30 PM):', client);
};

const handleReservationTime = async (from, messageBody, conversation, client) => {
  conversation.tempData.reservationTime = messageBody;
  conversation.state = 'reservation_party_size';
  await conversation.save();

  await sendTextMessage(from, '👥 How many people? (Enter party size):', client);
};

const handleReservationPartySize = async (from, messageBody, conversation, client) => {
  const partySize = parseInt(messageBody);

  if (isNaN(partySize) || partySize < 1) {
    return await sendTextMessage(from, '❌ Please enter a valid number of people.', client);
  }

  conversation.tempData.partySize = partySize;
  conversation.state = 'reservation_special_requests';
  await conversation.save();

  await sendTextMessage(from, '📝 Any special requests? (or type "none"):', client);
};

const handleReservationSpecialRequests = async (from, messageBody, conversation, client, io) => {
  const specialRequests = messageBody.toLowerCase() === 'none' ? '' : messageBody;

  // Create reservation
  const reservation = new Reservation({
    customerPhone: from,
    customerName: conversation.tempData.name || 'Guest',
    date: conversation.tempData.reservationDate,
    time: conversation.tempData.reservationTime,
    partySize: conversation.tempData.partySize,
    specialRequests: specialRequests,
    status: 'pending'
  });

  await reservation.save();

  conversation.currentReservationId = reservation._id;
  conversation.state = 'main_menu';
  conversation.tempData = {};
  await conversation.save();

  const confirmationText = `✅ *Reservation Request Received!*\n\n📅 Date: ${reservation.date.toLocaleDateString()}\n⏰ Time: ${reservation.time}\n👥 Party Size: ${reservation.partySize}\n📋 ID: #${reservation._id.toString().slice(-6)}\n\nWe'll confirm your reservation shortly!`;

  await sendTextMessage(from, confirmationText, client);

  // Notify admin
  if (io) {
    io.emit('new_reservation', reservation);
  }

  await showMainMenu(from, conversation, client);
};

const showHelp = async (from, client) => {
  const helpText = `ℹ️ *Help & Commands*\n\n` +
    `• Type "menu" to browse our menu\n` +
    `• Type "cart" to view your cart\n` +
    `• Type "orders" to see your orders\n` +
    `• Type "reservation" to book a table\n` +
    `• Type "help" for this message\n\n` +
    `Need assistance? Contact us at support@restaurant.com`;

  await sendTextMessage(from, helpText, client);
};

export {
  showMainMenu,
  showCart,
  showMyOrders
};