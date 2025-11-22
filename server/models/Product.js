const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['raw', 'finished', 'byproduct'],
    required: true,
  },
  unit: {
    type: String,
    enum: ['kg', 'bag', 'piece', 'liters'],
    required: true,
  },
  basePrice: {
    type: Number,
    min: 0,
    default: 0,
  },
  costPrice: {
    type: Number,
    min: 0,
    default: 0,
  },
  description: {
    type: String,
    trim: true,
  },
  specifications: {
    paddyType: {
      type: String,
      enum: ['nadu', 'samba', 'mixed', 'N/A'],
    },
    riceGrade: {
      type: String,
      enum: ['premium', 'standard', 'broken', 'N/A'],
    },
    bagWeight: {
      type: Number,
      min: 0,
    },
  },
  active: {
    type: Boolean,
    default: true,
  },
  reorderLevel: {
    type: Number,
    min: 0,
    default: 0,
  },
  reorderQuantity: {
    type: Number,
    min: 0,
    default: 0,
  },
}, {
  timestamps: true,
  indexes: [
    { sku: 1 },
    { category: 1 },
    { active: 1 },
    { name: 1 },
  ]
});

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
  if (this.costPrice === 0) return 0;
  return ((this.basePrice - this.costPrice) / this.costPrice) * 100;
});

// Virtual for profit amount
productSchema.virtual('profitAmount').get(function() {
  return this.basePrice - this.costPrice;
});

// Instance methods
productSchema.methods.isLowStock = function(currentStock) {
  return currentStock <= this.reorderLevel;
};

productSchema.methods.getDisplayName = function() {
  if (this.category === 'finished' && this.specifications.paddyType && this.specifications.riceGrade) {
    return `${this.specifications.paddyType.charAt(0).toUpperCase() + this.specifications.paddyType.slice(1)} Rice - ${this.specifications.riceGrade.charAt(0).toUpperCase() + this.specifications.riceGrade.slice(1)}`;
  }
  return this.name;
};

// Static methods
productSchema.statics.findByCategory = function(category) {
  return this.find({ category, active: true }).sort({ name: 1 });
};

productSchema.statics.findActive = function() {
  return this.find({ active: true }).sort({ category: 1, name: 1 });
};

productSchema.statics.findLowStock = function(currentStockMap) {
  return this.find({ active: true }).then(products => {
    return products.filter(product => {
      const stock = currentStockMap[product._id] || 0;
      return product.isLowStock(stock);
    });
  });
};

productSchema.statics.generateSKU = async function(category, paddyType, riceGrade, bagWeight) {
  let prefix = '';
  
  if (category === 'raw') {
    prefix = 'RAW';
  } else if (category === 'finished') {
    prefix = 'RICE';
    if (paddyType) prefix += `_${paddyType.toUpperCase()}`;
    if (riceGrade) prefix += `_${riceGrade.toUpperCase()}`;
    if (bagWeight) prefix += `_${bagWeight}KG`;
  } else if (category === 'byproduct') {
    prefix = 'BYPROD';
  }
  
  // Find existing SKUs with same prefix
  const existing = await this.find({ sku: new RegExp(`^${prefix}`) })
    .sort({ sku: -1 })
    .limit(1);
  
  let number = 1;
  if (existing.length > 0) {
    const lastSKU = existing[0].sku;
    const match = lastSKU.match(/(\d+)$/);
    if (match) {
      number = parseInt(match[1]) + 1;
    }
  }
  
  return `${prefix}_${String(number).padStart(4, '0')}`;
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

