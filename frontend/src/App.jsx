import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  Calendar, 
  Settings,
  Plus,
  Search,
  Filter,
  X,
  Check,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  Edit,
  Trash2,
  Eye,
  Bell,
  Menu as MenuIcon,
  ChevronDown,
  Package,
  Utensils
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    todayOrders: 0
  });
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes, menuRes, reservationsRes] = await Promise.all([
        fetch(`${API_BASE}/orders/stats`),
        fetch(`${API_BASE}/orders?limit=20`),
        fetch(`${API_BASE}/menu`),
        fetch(`${API_BASE}/reservations?limit=20`)
      ]);

      setStats(await statsRes.json());
      setOrders(await ordersRes.json());
      setMenuItems(await menuRes.json());
      setReservations(await reservationsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const TabButton = ({ id, icon: Icon, label }) => (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${
        activeTab === id
          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      {sidebarOpen && <span className="font-medium">{label}</span>}
    </motion.button>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 256 : 80 }}
        className="bg-white border-r border-gray-200 flex flex-col shadow-sm"
      >
        <div className="p-6 flex items-center justify-between border-b border-gray-200">
          {sidebarOpen && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent"
            >
              RestaurantBot
            </motion.h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <TabButton id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <TabButton id="orders" icon={ShoppingBag} label="Orders" />
          <TabButton id="menu" icon={UtensilsCrossed} label="Menu" />
          <TabButton id="reservations" icon={Calendar} label="Reservations" />
          <TabButton id="settings" icon={Settings} label="Settings" />
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold">
              A
            </div>
            {sidebarOpen && (
              <div>
                <p className="font-medium text-sm">Admin</p>
                <p className="text-xs text-gray-500">admin@restaurant.com</p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage your restaurant operations
              </p>
            </div>
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchData}
                className="px-4 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors"
              >
                Refresh
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </motion.button>
            </div>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <Dashboard stats={stats} orders={orders} />}
            {activeTab === 'orders' && <Orders orders={orders} setOrders={setOrders} fetchData={fetchData} />}
            {activeTab === 'menu' && <Menu menuItems={menuItems} setMenuItems={setMenuItems} fetchData={fetchData} />}
            {activeTab === 'reservations' && <Reservations reservations={reservations} setReservations={setReservations} fetchData={fetchData} />}
            {activeTab === 'settings' && <SettingsTab />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const Dashboard = ({ stats, orders }) => {
  const statCards = [
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'from-blue-500 to-blue-600' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: Clock, color: 'from-orange-500 to-orange-600' },
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'from-green-500 to-green-600' },
    { label: 'Today\'s Orders', value: stats.todayOrders, icon: TrendingUp, color: 'from-purple-500 to-purple-600' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                <p className="text-3xl font-bold mt-2 text-gray-800">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold mb-4">Recent Orders</h3>
        <div className="space-y-3">
          {orders.slice(0, 5).map((order) => (
            <motion.div 
              key={order._id} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  #{order._id.slice(-4)}
                </div>
                <div>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-sm text-gray-500">{order.customerPhone}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-orange-600">₹{order.totalAmount}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const Orders = ({ orders, setOrders, fetchData }) => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const updated = await res.json();
      setOrders(orders.map(o => o._id === orderId ? updated : o));
      setSelectedOrder(updated);
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.customerPhone.includes(searchTerm) ||
                          order._id.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
        >
          <option value="all">All Status</option>
          <option value="payment_pending">Payment Pending</option>
          <option value="payment_verified">Payment Verified</option>
          <option value="confirmed">Confirmed</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <motion.tr
                  key={order._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ backgroundColor: '#f9fafb' }}
                  className="cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm">#{order._id.slice(-8)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-sm">{order.customerName}</p>
                      <p className="text-xs text-gray-500">{order.customerPhone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-orange-600">₹{order.totalAmount}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm capitalize">{order.orderType}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      order.status === 'payment_pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdateStatus={updateOrderStatus} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const OrderModal = ({ order, onClose, onUpdateStatus }) => {
  const statusFlow = ['payment_verified', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
  const currentIndex = statusFlow.indexOf(order.status);
  const nextStatus = statusFlow[currentIndex + 1];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold">Order Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Order ID</p>
              <p className="font-mono font-medium">#{order._id.slice(-8)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{order.customerName}</p>
              <p className="text-sm text-gray-600">{order.customerPhone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Order Type</p>
              <p className="font-medium capitalize">{order.orderType}</p>
            </div>
          </div>

          {order.deliveryAddress && order.deliveryAddress.street && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Delivery Address</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p>{order.deliveryAddress.street}</p>
                <p>{order.deliveryAddress.city}, {order.deliveryAddress.state}</p>
                <p>Pincode: {order.deliveryAddress.pincode}</p>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-500 mb-3">Items</p>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity} × ₹{item.price}</p>
                  </div>
                  <p className="font-bold text-orange-600">₹{item.subtotal}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Amount</span>
              <span className="text-orange-600">₹{order.totalAmount}</span>
            </div>
          </div>

          {nextStatus && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onUpdateStatus(order._id, nextStatus)}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              Update to: {nextStatus.replace(/_/g, ' ').toUpperCase()}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const Menu = ({ menuItems, setMenuItems, fetchData }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Specials'];

  const deleteItem = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await fetch(`${API_BASE}/menu/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const filteredItems = filterCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === filterCategory);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <motion.div
            key={item._id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            {item.image && (
              <img src={item.image} alt={item.name} className="w-full h-48 object-cover" />
            )}
            {!item.image && (
              <div className="w-full h-48 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <Utensils className="w-16 h-16 text-white opacity-50" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-bold text-lg">{item.name}</h4>
                  <p className="text-xs text-gray-500 mb-2">{item.category}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.isVeg ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.isVeg ? '🟢 Veg' : '🔴 Non-Veg'}
                  </span>
                </div>
                <span className="text-xl font-bold text-orange-600">₹{item.price}</span>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingItem(item)}
                  className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteItem(item._id)}
                  className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No menu items found</p>
        </div>
      )}

      <AnimatePresence>
        {(isAddModalOpen || editingItem) && (
          <MenuItemModal
            item={editingItem}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingItem(null);
            }}
            onSave={fetchData}
            categories={categories}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MenuItemModal = ({ item, onClose, onSave, categories }) => {
  const [formData, setFormData] = useState(item || {
    name: '',
    description: '',
    category: 'Starters',
    price: '',
    image: '',
    isVeg: true,
    isAvailable: true,
    preparationTime: 15
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = item ? 'PUT' : 'POST';
      const url = item ? `${API_BASE}/menu/${item._id}` : `${API_BASE}/menu`;
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold">{item ? 'Edit' : 'Add'} Menu Item</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              rows="3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Price (₹)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Image URL</label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Preparation Time (mins)</label>
              <input
                type="number"
                value={formData.preparationTime}
                onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            <div className="space-y-3 pt-7">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isVeg}
                  onChange={(e) => setFormData({ ...formData, isVeg: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-sm">Vegetarian</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-sm">Available</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-shadow"
            >
              {item ? 'Update' : 'Add'} Item
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const Reservations = ({ reservations, setReservations, fetchData }) => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedReservation, setSelectedReservation] = useState(null);

  const updateReservationStatus = async (reservationId, newStatus, tableNumber) => {
    try {
      const res = await fetch(`${API_BASE}/reservations/${reservationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, tableNumber })
      });
      const updated = await res.json();
      setReservations(reservations.map(r => r._id === reservationId ? updated : r));
      setSelectedReservation(null);
      fetchData();
    } catch (error) {
      console.error('Error updating reservation:', error);
    }
  };

  const filteredReservations = filterStatus === 'all' 
    ? reservations 
    : reservations.filter(r => r.status === filterStatus);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReservations.map((reservation) => (
          <motion.div
            key={reservation._id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold text-lg">{reservation.customerName}</h4>
                <p className="text-sm text-gray-500">{reservation.customerPhone}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                reservation.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                reservation.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                reservation.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {reservation.status}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{new Date(reservation.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{reservation.time}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-gray-400" />
                <span>{reservation.partySize} people</span>
              </div>
              {reservation.tableNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span>Table {reservation.tableNumber}</span>
                </div>
              )}
            </div>

            {reservation.specialRequests && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Special Requests:</p>
                <p className="text-sm">{reservation.specialRequests}</p>
              </div>
            )}

            {reservation.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedReservation(reservation)}
                  className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm"
                >
                  Confirm
                </button>
                <button
                  onClick={() => updateReservationStatus(reservation._id, 'cancelled')}
                  className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {filteredReservations.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No reservations found</p>
        </div>
      )}

      <AnimatePresence>
        {selectedReservation && (
          <ReservationModal
            reservation={selectedReservation}
            onClose={() => setSelectedReservation(null)}
            onConfirm={updateReservationStatus}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ReservationModal = ({ reservation, onClose, onConfirm }) => {
  const [tableNumber, setTableNumber] = useState(reservation.tableNumber || '');

  const handleConfirm = () => {
    onConfirm(reservation._id, 'confirmed', tableNumber);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
      >
        <div className="p-6 border-b">
          <h3 className="text-2xl font-bold">Confirm Reservation</h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-500">Customer</p>
            <p className="font-medium">{reservation.customerName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">{new Date(reservation.date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Time</p>
              <p className="font-medium">{reservation.time}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Assign Table Number</label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g., A-5"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-shadow"
            >
              Confirm
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const SettingsTab = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold mb-4">WhatsApp Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number ID</label>
            <input
              type="text"
              placeholder="Your WhatsApp Phone Number ID"
              className="w-full px-4 py-2 border rounded-lg bg-gray-50"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Webhook URL</label>
            <input
              type="text"
              value="http://localhost:3000/webhook"
              className="w-full px-4 py-2 border rounded-lg bg-gray-50"
              disabled
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold mb-4">Razorpay Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Key ID</label>
            <input
              type="text"
              placeholder="Your Razorpay Key ID"
              className="w-full px-4 py-2 border rounded-lg bg-gray-50"
              disabled
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold mb-4">Restaurant Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Restaurant Name</label>
            <input
              type="text"
              placeholder="Your Restaurant Name"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <textarea
              placeholder="Restaurant Address"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              rows="3"
            />
          </div>
          <button className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-shadow">
            Save Changes
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default App;