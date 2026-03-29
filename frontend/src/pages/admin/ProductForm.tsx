import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productAPI } from '../../api/client';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface FormData {
  name: string;
  description: string;
  price: string;
  category: string;
  stock_quantity: string;
  image_url: string;
  is_active: boolean;
}

const initialForm: FormData = {
  name: '',
  description: '',
  price: '',
  category: '',
  stock_quantity: '',
  image_url: '',
  is_active: true,
};

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    productAPI.getCategories()
      .then((res) => {
        const cats = res.data.data || res.data;
        setCategories(Array.isArray(cats) ? cats.map((c: any) => (typeof c === 'string' ? c : c.category)) : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    setFetching(true);
    productAPI.getById(Number(id))
      .then((res) => {
        const p = res.data.data || res.data;
        setForm({
          name: p.name || '',
          description: p.description || '',
          price: String(p.price || ''),
          category: p.category || '',
          stock_quantity: String(p.stock_quantity ?? ''),
          image_url: p.image_url || '',
          is_active: p.is_active !== false,
        });
      })
      .catch(() => {
        toast.error('Failed to load product');
        navigate('/admin/products');
      })
      .finally(() => setFetching(false));
  }, [id, isEdit, navigate]);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
      errs.price = 'Valid price is required';
    if (!form.category.trim()) errs.category = 'Category is required';
    if (form.stock_quantity === '' || isNaN(Number(form.stock_quantity)) || Number(form.stock_quantity) < 0)
      errs.stock_quantity = 'Valid stock quantity is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // For number inputs, use the raw string value to avoid cursor/value issues
    const newValue = type === 'number' ? (e.target as HTMLInputElement).value : value;
    setForm((prev) => ({ ...prev, [name]: newValue }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: parseFloat(form.price),
      category: form.category.trim(),
      stock_quantity: parseInt(form.stock_quantity, 10),
      image_url: form.image_url.trim() || null,
      is_active: form.is_active,
    };

    try {
      if (isEdit && id) {
        await productAPI.update(Number(id), payload);
        toast.success('Product updated');
      } else {
        await productAPI.create(payload);
        toast.success('Product created');
      }
      navigate('/admin/products');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Something went wrong';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/admin/products')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">
          {isEdit ? 'Edit Product' : 'Add New Product'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.name ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="Enter product name"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Enter product description"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (₹)</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.price ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="0.00"
              />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Stock Quantity</label>
              <input
                type="number"
                name="stock_quantity"
                value={form.stock_quantity}
                onChange={handleChange}
                min="0"
                step="1"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.stock_quantity ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="0"
              />
              {errors.stock_quantity && <p className="text-xs text-red-500 mt-1">{errors.stock_quantity}</p>}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            {categories.length > 0 ? (
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white ${
                  errors.category ? 'border-red-300' : 'border-gray-200'
                }`}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.category ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="Enter category"
              />
            )}
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Image URL</label>
            <input
              type="text"
              name="image_url"
              value={form.image_url}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
            {form.image_url && (
              <img
                src={form.image_url}
                alt="Preview"
                className="mt-3 w-24 h-24 rounded-lg object-cover border border-gray-200"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.is_active ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.is_active ? 'translate-x-5' : ''
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {form.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
