import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inventoryApi,
  salesApi,
  customerApi,
  analyticsApi,
} from "@/api/endpoints";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Receipt,
  Banknote,
  CreditCard,
  Smartphone,
  Clock,
  ScanBarcode,
  X,
  Printer,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import ProductThumb from "@/components/ProductThumb";
import { useTenant } from "@/hooks/useTenant";

interface CartItem {
  productId: string;
  productName: string;
  productImage?: string | null;
  unitPrice: number;
  quantity: number;
  discount: number;
  total: number;
  requiresPrescription?: boolean;
}

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "mobile", label: "Mobile", icon: Smartphone },
  { id: "credit", label: "Credit", icon: Clock },
] as const;

export default function POSPage() {
  const { currencySymbol, taxRate } = useTenant();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "mobile" | "credit"
  >("cash");
  const [discount, setDiscount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [printOnCheckout, setPrintOnCheckout] = useState(true);
  const [prescriptionId, setPrescriptionId] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: products } = useQuery({
    queryKey: ["pos-products", search],
    queryFn: () =>
      inventoryApi.getProducts({ search, limit: 10 }).then((r) => r.data.data),
    enabled: search.length > 1,
  });

  const { data: customers } = useQuery({
    queryKey: ["pos-customers", customerSearch],
    queryFn: () =>
      customerApi.getAll(customerSearch || undefined).then((r) => r.data.data),
    enabled: customerSearch.length > 0,
  });

  const printReceipt = (sale: any) => {
    const dateStr = new Date().toLocaleDateString("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = new Date().toLocaleTimeString("en", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const itemRows = (sale.items || [])
      .map((item: any) => {
        const qty = item.quantity || 0;
        const price = item.unitPrice || 0;
        return `<tr><td style="padding:4px 0;font-size:12px;">${item.productName}</td><td style="text-align:right;font-size:12px;">${qty}x${currencySymbol}${price}</td><td style="text-align:right;font-size:12px;font-weight:600;">${currencySymbol}${(qty * price).toFixed(2)}</td></tr>`;
      })
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:monospace;width:280px;margin:0 auto;padding:16px 8px;font-size:12px}@media print{@page{margin:2mm;size:80mm auto}}</style>
</head><body>
<div style="text-align:center;margin-bottom:12px;"><strong style="font-size:14px;">PharmaSaaS</strong><br/>${sale.invoiceNumber}<br/>${dateStr} ${timeStr}</div>
<hr style="border:none;border-top:1px dashed #000;margin:8px 0;"/>
<table style="width:100%;border-collapse:collapse;">${itemRows}</table>
<hr style="border:none;border-top:1px dashed #000;margin:8px 0;"/>
<div style="text-align:right;">
<div>Subtotal: ${currencySymbol}${(sale.subtotal || 0).toFixed(2)}</div>
${sale.discount > 0 ? `<div>Discount: -${currencySymbol}${sale.discount.toFixed(2)}</div>` : ""}
${sale.taxAmount > 0 ? `<div>Tax: ${currencySymbol}${sale.taxAmount.toFixed(2)}</div>` : ""}
<div style="font-size:14px;font-weight:700;margin-top:4px;">Total: ${currencySymbol}${(sale.totalAmount || 0).toFixed(2)}</div>
<div style="margin-top:4px;text-transform:capitalize;">Paid: ${sale.paymentMethod}</div>
</div>
<hr style="border:none;border-top:1px dashed #000;margin:8px 0;"/>
<div style="text-align:center;font-size:10px;">Thank you!</div>
</body></html>`;
    const w = window.open("", "_blank", "width=320,height=600");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.print();
      w.close();
    }, 300);
  };

  const saleMutation = useMutation({
    mutationFn: (data: any) => salesApi.createSale(data),
    onSuccess: (res) => {
      const sale = res.data?.data;
      const inv = sale?.invoiceNumber || "";
      toast.success(`Sale completed! ${inv}`);
      if (printOnCheckout && sale) printReceipt(sale);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      analyticsApi
        .createAuditLog({
          action: "create",
          entity: "sale",
          entityId: sale?._id,
          description: `Sale ${inv} — ${currencySymbol}${(sale?.totalAmount || 0).toFixed(2)}`,
        })
        .catch(() => {});
      setCart([]);
      setDiscount(0);
      setSearch("");
      setSelectedCustomer(null);
      setCustomerSearch("");
      setPrescriptionId("");
      searchRef.current?.focus();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Sale failed"),
  });

  const addToCart = (product: any) => {
    const discountPct = product.discount || 0;
    const discountedPrice =
      discountPct > 0
        ? Math.round(product.sellingPrice * (1 - discountPct / 100) * 100) / 100
        : product.sellingPrice;

    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product._id
            ? {
                ...i,
                quantity: i.quantity + 1,
                total: (i.quantity + 1) * i.unitPrice,
              }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          productName: product.name,
          productImage: product.images?.[0]?.url || null,
          unitPrice: discountedPrice,
          quantity: 1,
          discount: discountPct,
          total: discountedPrice,
          requiresPrescription: product.requiresPrescription || false,
        },
      ];
    });
    setSearch("");
    searchRef.current?.focus();
  };

  // Barcode scanner: on Enter, if exactly one product matches (or barcode exact match), auto-add it
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter" || !search.trim()) return;
      e.preventDefault();
      if (products?.length === 1) {
        addToCart(products[0]);
      } else if (products?.length > 1) {
        // Check for exact barcode match
        const exact = products.find(
          (p: any) => p.barcode && p.barcode === search.trim(),
        );
        if (exact) addToCart(exact);
      }
    },
    [search, products],
  );

  // Auto-focus search when pressing any key outside an input (for rapid barcode scanning)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty, total: newQty * i.unitPrice };
      }),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(afterDiscount * taxRate) / 100;
  const totalAmount = afterDiscount + taxAmount;
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const hasRxItems = cart.some((i) => i.requiresPrescription);

  const handleCheckout = () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (hasRxItems && !prescriptionId.trim()) {
      return toast.error("Prescription ID is required for Rx items");
    }
    saleMutation.mutate({
      items: cart,
      subtotal,
      discount: discountAmount,
      taxAmount,
      totalAmount,
      paymentMethod,
      customerId: selectedCustomer?._id || undefined,
      prescriptionId: prescriptionId.trim() || undefined,
    });
  };

  return (
    <div className="flex gap-5 h-[calc(100vh-5rem)]">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search */}
        <div className="relative mb-4">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="input-field pl-10 !py-3 text-base"
            placeholder="Search product or scan barcode..."
            autoFocus
          />
          <ScanBarcode
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600"
            size={18}
          />
          {/* Search Dropdown */}
          {search.length > 1 && products?.length > 0 && (
            <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/[0.06] rounded-xl shadow-xl overflow-hidden">
              {products.map((product: any) => (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  className="w-full text-left px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-500/10 flex items-center justify-between transition-colors border-b border-gray-200 dark:border-white/[0.04] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <ProductThumb src={product.images?.[0]?.url} size={32} />
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                        SKU: {product.sku} &bull; Stock:{" "}
                        {product.totalStock ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {product.discount > 0 ? (
                      <div>
                        <span className="text-[11px] text-gray-400 line-through mr-1">
                          {currencySymbol}
                          {product.sellingPrice}
                        </span>
                        <span className="text-sm font-bold text-primary-600 dark:text-primary-400 tabular-nums">
                          {currencySymbol}
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
                      <span className="text-sm font-bold text-primary-600 dark:text-primary-400 tabular-nums">
                        {currencySymbol}
                        {product.sellingPrice}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart Table */}
        <div className="card flex-1 overflow-hidden p-0 flex flex-col">
          <div className="overflow-y-auto flex-1">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-200 dark:border-white/[0.06]">
                  <th className="table-header">Product</th>
                  <th className="table-header text-center w-32">Qty</th>
                  <th className="table-header text-right w-24">Price</th>
                  <th className="table-header text-right w-28">Total</th>
                  <th className="table-header w-10" />
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center">
                      <ShoppingCart
                        className="mx-auto mb-3 text-gray-300 dark:text-gray-500"
                        size={40}
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Search above to add products to cart
                      </p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr
                      key={item.productId}
                      className="border-b border-gray-200 dark:border-white/[0.04]"
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <ProductThumb src={item.productImage} size={28} />
                          <span className="font-medium">
                            {item.productName}
                            {item.requiresPrescription && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                Rx
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="w-7 h-7 rounded-md bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-semibold w-8 text-center tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, 1)}
                            className="w-7 h-7 rounded-md bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="table-cell text-right tabular-nums text-gray-500 dark:text-gray-400">
                        <div>
                          {currencySymbol}
                          {item.unitPrice}
                          {item.discount > 0 && (
                            <span className="block text-[10px] text-green-600 dark:text-green-400">
                              -{item.discount}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell text-right font-semibold tabular-nums">
                        {currencySymbol}
                        {item.total.toFixed(2)}
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Cart footer */}
          {cart.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-200 dark:border-white/[0.06] bg-gray-100/50 dark:bg-white/[0.01] flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {itemCount} items in cart
              </span>
              <span className="font-semibold">
                Subtotal: {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Checkout Panel */}
      <div className="w-80 flex flex-col gap-4 shrink-0">
        {/* Summary */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <Receipt
              size={18}
              className="text-primary-600 dark:text-primary-400"
            />
            <h3 className="font-semibold">Order Summary</h3>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
              <span className="tabular-nums">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Discount</span>
              <div className="relative">
                <input
                  type="number"
                  value={discount || ""}
                  onChange={(e) =>
                    setDiscount(
                      Math.min(100, Math.max(0, Number(e.target.value))),
                    )
                  }
                  className="w-24 text-right input-field !py-1.5 text-sm tabular-nums pr-7"
                  placeholder="0"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  %
                </span>
              </div>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Tax ({taxRate}%)
                </span>
                <span className="tabular-nums">
                  {currencySymbol}
                  {taxAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="h-px bg-gray-200 dark:bg-white/[0.06]" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary-600 dark:text-primary-400 tabular-nums">
                {currencySymbol}
                {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Customer (optional) */}
        <div className="card space-y-2">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Customer (optional)
          </h3>
          {selectedCustomer ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20">
              <div>
                <p className="text-sm font-medium">{selectedCustomer.name}</p>
                {selectedCustomer.phone && (
                  <p className="text-[11px] text-gray-500">
                    {selectedCustomer.phone}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerSearch("");
                }}
                className="p-1 rounded text-gray-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="input-field !py-2 text-sm"
                placeholder="Search customer by name or phone..."
              />
              {customerSearch && customers?.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/[0.06] rounded-lg shadow-lg overflow-hidden">
                  {customers.slice(0, 5).map((c: any) => (
                    <button
                      key={c._id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-500/10 text-sm border-b border-gray-100 dark:border-white/[0.04] last:border-0"
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.phone && (
                        <span className="text-gray-400 ml-2">{c.phone}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Prescription (shows when cart has Rx items) */}
        {hasRxItems && (
          <div className="card space-y-2">
            <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} /> Prescription Required
            </h3>
            <input
              type="text"
              value={prescriptionId}
              onChange={(e) => setPrescriptionId(e.target.value)}
              className="input-field !py-2 text-sm"
              placeholder="Enter prescription ID (e.g. RX-00001)"
            />
            <p className="text-[11px] text-gray-500">
              Cart contains items that require a prescription.
            </p>
          </div>
        )}

        {/* Payment method */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Payment Method
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`flex items-center gap-2 py-2.5 px-3 rounded-lg border text-sm transition-all ${
                  paymentMethod === method.id
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 ring-1 ring-primary-500/20"
                    : "border-gray-200 dark:border-white/[0.06] text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/10"
                }`}
              >
                <method.icon size={15} />
                {method.label}
              </button>
            ))}
          </div>
        </div>

        {/* Print toggle + Checkout button */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none px-1">
            <input
              type="checkbox"
              checked={printOnCheckout}
              onChange={(e) => setPrintOnCheckout(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <Printer size={14} className="text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Print receipt on checkout
            </span>
          </label>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || saleMutation.isPending}
            className="btn-primary w-full !py-4 text-base font-bold shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30 transition-all"
          >
            {saleMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                Processing...
              </span>
            ) : (
              <>
                Checkout &bull; {currencySymbol}
                {totalAmount.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
