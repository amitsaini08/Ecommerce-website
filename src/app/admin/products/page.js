'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/components/common/Toast';
import Pagination from '@/components/common/Pagination';
import { Package, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiCheck, FiX } from 'react-icons/fi';
import CustomSelect from '@/components/ui/CustomSelect';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const codOptions = [
  { value: '', label: 'All COD' },
  { value: 'true', label: 'COD Available' },
  { value: 'false', label: 'COD Not Available' },
];

const stockOptions = [
  { value: '', label: 'All Stock' },
  { value: 'in', label: 'In Stock' },
  { value: 'low', label: 'Low Stock (≤10)' },
  { value: 'out', label: 'Out of Stock' },
];

import { productsApi } from '@/lib/apiClient/products';
import { useMutation } from '@/hooks/useMutation';

let pagePaginationCache = { page: 1, totalPages: 1, total: 0 };

export default function AdminProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState({});
  const [pagination, setPagination] = useState(pagePaginationCache);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [codFilter, setCodFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  const deleteMutation = useMutation((id) => productsApi.remove(id));

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput) }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    pagePaginationCache = pagination;
  }, [pagination]);

  const filterKey = JSON.stringify([search, statusFilter, codFilter, stockFilter]);
  const prevFilterKey = useRef(filterKey);

  async function fetchProducts(page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '7' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('isActive', statusFilter);
      if (codFilter) params.set('codAvailable', codFilter);
      if (stockFilter) params.set('stockStatus', stockFilter);

      const data = await productsApi.getAdmin(params.toString());
      setProducts((prev) => ({ ...prev, [page]: data.products }));
      setPagination((prev) => ({
        ...prev,
        totalPages: data.pagination.totalPages,
        total: data.pagination.total,
      }));
    } catch { }
    setLoading(false);
  }

  useEffect(() => {
    if (prevFilterKey.current === filterKey) return;
    prevFilterKey.current = filterKey;
    queueMicrotask(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      setProducts({});
    });
  }, [filterKey]);

  useEffect(() => {
    if (products[pagination.page]) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    queueMicrotask(() => fetchProducts(pagination.page));
  }, [pagination.page, products, search, statusFilter, codFilter, stockFilter]);


  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await deleteMutation.run(id);
    if (res) {
      toast.success('Product deleted');
      setProducts({});
      if(currentProducts.length === 1 && pagination.page > 1){
        setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
      }
    }
  }

  function clearFilters() {
    setStatusFilter('');
    setCodFilter("");
    setStockFilter("");
    setSearchInput('');
     setSearch('');
  }

  const columns = [
    {
      key: 'product',
      header: 'Product',
      render: (p) => (
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-warm-100">
            {p.images?.[0] ? (
              <Image src={p.images[0]} alt="" fill className="object-cover" sizes="32px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-warm-400">
                <Package className="h-4 w-4" />
              </div>
            )}
          </div>
          <span className="max-w-[180px] truncate font-medium text-warm-900">{p.name}</span>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (p) => (
        <span className="text-warm-700">
          {formatCurrency(p.discountPrice || p.price)}
          {p.discountPrice && (
            <span className="ml-1 text-xs text-warm-400 line-through">{formatCurrency(p.price)}</span>
          )}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (p) => (
        <span className={`font-medium ${p.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>{p.stock}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (p) =>
        p.categoryNames?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {p.categoryNames.map((n) => (
              <span key={n} className="rounded bg-warm-100 px-1.5 py-0.5 text-[10px] font-semibold text-warm-600">
                {n}
              </span>
            ))}
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'active',
      header: 'Active',
      render: (p) =>
        p.isActive ? <FiCheck className="h-4 w-4 text-green-500" /> : <FiX className="h-4 w-4 text-red-400" />,
    },
    {
      key: 'cod',
      header: 'COD',
      render: (p) =>
        p.codAvailable !== false ? (
          <span className="rounded-md bg-green-50 px-1.5 py-0.5 text-xs font-semibold text-green-700">Yes</span>
        ) : (
          <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-600">No</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => {
        const id = p._id || p.id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button variant="outline" size="sm" href={`/admin/products/${id}/edit`} aria-label="Edit product">
              <FiEdit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(id, p.name)}
              aria-label="Delete product"
              className="text-red-600 hover:bg-red-50"
            >
              <FiTrash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const hasActiveFilters = Boolean(statusFilter || codFilter || stockFilter || search);
  const currentProducts = products[pagination.page] || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-bold text-warm-900">Products</h1>
        <Button variant="dark" size="sm" href="/admin/products/new">
          <FiPlus className="h-3.5 w-3.5" /> Add Product
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products title, category..."
            className="w-full pl-8 pr-8 py-1.5 border border-warm-200 rounded-md text-[11px] outline-none focus:border-brand-400"
          />
          {searchInput && (
            <X onClick={() => { setSearchInput(''); setSearch('') }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400 cursor-pointer hover:text-warm-700" />
          )}
        </div>

        <div className="w-36">
          <CustomSelect
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Status"
          />
        </div>

        <div className="w-40">
          <CustomSelect
            options={codOptions}
            value={codFilter}
            onChange={setCodFilter}
            placeholder="All COD"
          />
        </div>

        <div className="w-44">
          <CustomSelect
            options={stockOptions}
            value={stockFilter}
            onChange={setStockFilter}
            placeholder="All Stock"
          />
        </div>


        <button
          onClick={clearFilters}
          className={`text-[11px] font-semibold whitespace-nowrap transition-opacity
             ${hasActiveFilters ? 'text-brand-600 hover:text-brand-700 hover:underline opacity-100'
              : 'invisible opacity-0 pointer-events-none'}`}>
          Clear Filters
        </button>
      </div>

      {/* <div className="bg-white rounded-md border border-warm-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="bg-warm-50 text-warm-600 text-[10px] uppercase tracking-wider">
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-left">Price</th>
              <th className="px-3 py-2 text-left">Stock</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Active</th>
              <th className="px-3 py-2 text-left">COD</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-warm-100">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-3 py-3"><div className="h-8 shimmer rounded" /></td></tr>
              )) : currentProducts.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-warm-400">No products found</td></tr>
              ) : currentProducts.map(p => {
                const productId = p._id || p.id;
                return (
                  <tr key={productId} className="hover:bg-warm-50/50">
                    <td className="px-3 py-2"><div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-warm-100 overflow-hidden shrink-0 relative">
                        {p.images?.[0] ? <Image src={p.images[0]} alt="" fill className="object-cover" sizes="32px" /> : <div className="w-full h-full flex items-center justify-center text-warm-400"><Package className="w-4 h-4" /></div>}
                      </div>
                      <span className="font-medium text-warm-900 truncate max-w-[180px]">{p.name}</span>
                    </div></td>
                    <td className="px-3 py-2 text-warm-700">{formatCurrency(p.discountPrice || p.price)}{p.discountPrice && <span className="text-warm-400 line-through ml-1 text-[10px]">{formatCurrency(p.price)}</span>}</td>
                    <td className="px-3 py-2"><span className={`font-medium ${p.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>{p.stock}</span></td>
                    <td className="px-3 py-2 text-warm-500">
                      {p.categoryNames?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.categoryNames.map((name) => (
                            <span key={name} className="px-1.5 py-0.5 bg-warm-100 text-warm-600 text-[9px] font-semibold rounded" >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : ('—')}
                    </td>
                    <td className="px-3 py-2">{p.isActive ? <FiCheck className="text-green-500 w-3.5 h-3.5" /> : <FiX className="text-red-400 w-3.5 h-3.5" />}</td>
                    <td className="px-3 py-2">{p.codAvailable !== false ? <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-50 text-green-700 rounded-md">Yes</span> : <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-50 text-red-600 rounded-md">No</span>}</td>
                    <td className="px-3 py-2 text-right"><div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/products/${productId}/edit`} className="p-1 text-warm-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"><FiEdit className="w-3.5 h-3.5" /></Link>
                      <button onClick={() => handleDelete(productId, p.name)} className="p-1 text-warm-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><FiTrash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div> */}
      <DataTable
        columns={columns}
        rows={currentProducts}
        loading={loading}
        emptyText="No products found"
      />
      {pagination.totalPages > 1 && <div className="mt-4"><Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} /></div>}
    </div>
  );
}