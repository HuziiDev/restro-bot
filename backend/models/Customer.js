import mongoose from 'mongoose'

const customerSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: String,
  email: String,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastOrderAt: Date
});

export const Customer = mongoose.model('Customer', customerSchema);