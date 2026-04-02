import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { inventoryApi } from "@/api/endpoints";
import DateRangePicker, { type DatePreset } from "@/components/DateRangePicker";
import ProductThumb from "@/components/ProductThumb";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Power,
  Package,
} from "lucide-react";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

const PRODUCT_PRESETS: DatePreset[] = [
  {
    label: "Last 7 Days",
    getDates: () => [new Date(Date.now() - 6 * 86400000), new Date()],
  },
  {
    label: "Last 30 Days",
    getDates: () => [new Date(Date.now() - 29 * 86400000), new Date()],
  },
  {
    label: "This Month",
    getDates: () => {
      const now = new Date();
      return [new Date(now.getFullYear(), now.getMonth(), 1), now];
    },
  },
  {
    label: "Last 3 Months",
    getDates: () => [new Date(Date.now() - 89 * 86400000), new Date()],
  },
  {
    label: "This Year",
    getDates: () => {
      const now = new Date();
      return [new Date(now.getFullYear(), 0, 1), now];
    },
  },
];

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [stockFilter, setStockFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get("category") || "",
  );
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setCategoryFilter(cat);
    const stock = searchParams.get("stock");
    if (stock) setStockFilter(stock);
  }, [searchParams]);

  const toggleMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.toggleProductStatus(id),
    onSuccess: (res) => {
      const msg = res.data.data.isActive
        ? "Product enabled"
        : "Product disabled";
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to update status"),
  });

  const dateFrom = startDate ? toDateStr(startDate) : undefined;
  const dateTo = endDate ? toDateStr(endDate) : undefined;

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => inventoryApi.getCategories().then((r) => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "products",
      page,
      search,
      dateFrom,
      dateTo,
      categoryFilter,
      statusFilter,
    ],
    queryFn: () =>
      inventoryApi
        .getProducts({
          page,
          limit: 20,
          search,
          from: dateFrom,
          to: dateTo,
          category: categoryFilter || undefined,
          status: statusFilter || undefined,
        })
        .then((r) => r.data),
  });

  // Client-side stock filter
  const products = (data?.data ?? []).filter((p: any) => {
    if (!stockFilter) return true;
    if (stockFilter === "low")
      return p.totalStock > 0 && p.totalStock <= (p.reorderLevel || 10);
    if (stockFilter === "out") return (p.totalStock || 0) === 0;
    if (stockFilter === "in") return p.totalStock > (p.reorderLevel || 10);
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link to="/inventory/products/new" className="btn-primary">
          <Plus size={16} /> Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="card !p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={15}
            />
            <input
              type="text"
              placeholder="Search by name, SKU, or barcode..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-field pl-9 !py-2"
            />
          </div>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="input-field !w-auto !py-2 min-w-[140px]"
          >
            <option value="">All Stock</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="input-field !w-auto !py-2 min-w-[140px]"
          >
            <option value="">All Categories</option>
            {categories?.map((cat: any) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input-field !w-auto !py-2 min-w-[140px]"
          >
            <option value="">Active Only</option>
            <option value="inactive">Disabled Only</option>
            <option value="all">All Products</option>
          </select>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={({ start, end }) => {
              setStartDate(start);
              setEndDate(end);
              setPage(1);
            }}
            presets={PRODUCT_PRESETS}
          />
          {(search ||
            stockFilter ||
            categoryFilter ||
            statusFilter ||
            startDate ||
            endDate) && (
            <button
              onClick={() => {
                setSearch("");
                setStockFilter("");
                setCategoryFilter("");
                setStatusFilter("");
                setStartDate(null);
                setEndDate(null);
              }}
              className="btn-ghost text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/[0.06]">
                <th className="table-header">Product</th>
                <th className="table-header">SKU</th>
                <th className="table-header text-right">Cost</th>
                <th className="table-header text-right">Price</th>
                <th className="table-header text-right">Stock</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-200 dark:border-white/[0.04]"
                  >
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="table-cell">
                        <div className="h-4 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length ? (
                products.map((product: any) => {
                  const stock = product.totalStock ?? 0;
                  const isLow =
                    stock > 0 && stock <= (product.reorderLevel || 10);
                  const isOut = stock === 0;
                  return (
                    <tr
                      key={product._id}
                      className={`border-b border-gray-200 dark:border-white/[0.04] hover:bg-gray-100/50 dark:hover:bg-white/[0.02] transition-colors ${!product.isActive ? "opacity-50" : ""}`}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <ProductThumb
                            src={product.images?.[0]?.url}
                            size={36}
                          />
                          <div className="min-w-0">
                            <Link
                              to={`/inventory/products/${product._id}/edit`}
                              className="font-medium text-sm truncate block hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            >
                              {product.name}
                            </Link>
                            {product.genericName && (
                              <p className="text-[11px] text-gray-600 dark:text-gray-400 truncate">
                                {product.genericName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                          {product.sku}
                        </span>
                      </td>
                      <td className="table-cell text-right tabular-nums text-gray-600 dark:text-gray-400">
                        ৳{product.costPrice}
                      </td>
                      <td className="table-cell text-right tabular-nums font-medium">
                        {product.discount > 0 ? (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 line-through text-xs">
                              ৳{product.sellingPrice}
                            </span>
                            <br />
                            <span>
                              ৳
                              {(
                                product.sellingPrice *
                                (1 - product.discount / 100)
                              ).toFixed(0)}
                            </span>
                            <span className="ml-1 text-[10px] text-green-600 dark:text-green-400 font-medium">
                              -{product.discount}%
                            </span>
                          </div>
                        ) : (
                          <>৳{product.sellingPrice}</>
                        )}
                      </td>
                      <td className="table-cell text-right tabular-nums font-medium">
                        {stock}
                      </td>
                      <td className="table-cell text-center">
                        <span
                          className={
                            isOut
                              ? "badge-danger"
                              : isLow
                                ? "badge-warning"
                                : "badge-success"
                          }
                        >
                          {isOut ? "Out" : isLow ? "Low" : "In Stock"}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              navigate(
                                `/inventory/products/${product._id}/edit`,
                              )
                            }
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => toggleMutation.mutate(product._id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              product.isActive
                                ? "text-green-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                                : "text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"
                            }`}
                            title={
                              product.isActive
                                ? "Disable product"
                                : "Enable product"
                            }
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="table-cell py-16 text-center text-gray-600 dark:text-gray-400"
                  >
                    {search || stockFilter || categoryFilter || statusFilter
                      ? "No products match your filters."
                      : "No products yet. Add your first product."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-white/[0.06]">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Page {data.meta.page} of {data.meta.totalPages} &bull;{" "}
              {data.meta.total} products
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost !p-1.5 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.meta.totalPages}
                className="btn-ghost !p-1.5 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
