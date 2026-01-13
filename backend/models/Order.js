import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
  customerPhone: { type: String, required: true },
  customerName: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
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
  razorpaySignature: String,
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

export const Order = mongoose.model('Order', orderSchema);