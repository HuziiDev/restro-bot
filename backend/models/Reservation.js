import mongoose from 'mongoose'

const reservationSchema = new mongoose.Schema({
  customerPhone: { type: String, required: true },
  customerName: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
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

export const Reservation = mongoose.model('Reservation', reservationSchema);