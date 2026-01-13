import mongoose from 'mongoose'

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

export const Conversation = mongoose.model('Conversation', conversationSchema);