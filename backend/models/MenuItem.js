import mongoose from 'mongoose';

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

export const MenuItem = mongoose.model('MenuItem', menuItemSchema);