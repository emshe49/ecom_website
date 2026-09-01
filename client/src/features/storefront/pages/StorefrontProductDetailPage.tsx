import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Check, AlertCircle, Loader2 } from 'lucide-react';
import { AxiosError } from 'axios';
import { productSearchApi } from '../api/product-search.api';
import { ProductVariant } from '../../products/types/product.types';
import { formatMoney } from '../../../utils/money';
import { useAuthStore } from '../../auth/store/auth.store';
import { cartApi } from '../../cart/api/cart.api';
import { QuantityControl } from '../../cart/components/QuantityControl';
import { WishlistButton } from '../../wishlist/components/WishlistButton';

interface ApiErrorData {
  error?: {
    message?: string;
    code?: string;
  };
}


export const StorefrontProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product-detail', slug],
    queryFn: () => productSearchApi.getProductBySlug(slug!),
    enabled: !!slug,
  });

  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState<number>(1);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);

  // Initialize active image and default options when product loads
  useEffect(() => {
    if (product) {
      // Document title for SEO
      document.title = `${product.seoTitle || product.name} | Apex Commerce`;

      const primary = product.images.find((img) => img.isPrimary) || product.images[0];
      if (primary) {
        setActiveImage(primary.url);
      }

      // If variants exist, pick options from the first active variant
      const firstVariant = product.variants?.[0];
      if (firstVariant && firstVariant.attributes && firstVariant.attributes.length > 0) {
        const initialOpts: Record<string, string> = {};
        for (const attr of firstVariant.attributes) {
          initialOpts[attr.name.toLowerCase()] = attr.value;
        }
        setSelectedOptions(initialOpts);
      }
    }
  }, [product]);

  // Extract distinct option names and available values from all variants
  const optionGroups: Record<string, string[]> = {};
  if (product?.variants) {
    for (const v of product.variants) {
      if (v.attributes) {
        for (const attr of v.attributes) {
          const normName = attr.name.toLowerCase();
          if (!optionGroups[normName]) {
            optionGroups[normName] = [];
          }
          if (!optionGroups[normName].includes(attr.value)) {
            optionGroups[normName].push(attr.value);
          }
        }
      }
    }
  }

  // Find currently matching active variant based on selectedOptions
  let matchedVariant: ProductVariant | null = null;
  if (product?.variants && product.variants.length > 0) {
    matchedVariant =
      product.variants.find((v) => {
        if (!v.isActive) return false;
        if (!v.attributes || v.attributes.length === 0) return true;

        for (const [normName, selectedVal] of Object.entries(selectedOptions)) {
          const hasAttr = v.attributes.some(
            (a) => a.name.toLowerCase() === normName && a.value.toLowerCase() === selectedVal.toLowerCase()
          );
          if (!hasAttr) return false;
        }
        return true;
      }) || null;
  }

  const addToCartMutation = useMutation({
    mutationFn: (payload: { variantId: string; quantity: number }) =>
      cartApi.addToCart(payload),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
      setCartError(null);
      setSuccessNotice(
        `Added ${quantity} × ${product?.name} to your cart!`
      );
      setTimeout(() => setSuccessNotice(null), 5000);
    },
    onError: (err: unknown) => {
      const axiosError = err as AxiosError<ApiErrorData>;
      setSuccessNotice(null);
      setCartError(
        axiosError?.response?.data?.error?.message || 'Failed to add item to cart.'
      );
    },

  });

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (user?.role !== 'CUSTOMER') {
      setCartError('Staff and admin accounts cannot use the customer shopping cart.');
      return;
    }

    if (!matchedVariant || !matchedVariant.isActive) {
      setCartError('Please select a valid and available product configuration.');
      return;
    }

    addToCartMutation.mutate({
      variantId: matchedVariant.id,
      quantity,
    });
  };

  const handleOptionSelect = (groupName: string, value: string) => {
    const next = { ...selectedOptions, [groupName]: value };
    setSelectedOptions(next);

    // If matching variant has its own image, update active image
    const nextMatch = product?.variants?.find((v) => {
      if (!v.isActive || !v.attributes) return false;
      for (const [n, val] of Object.entries(next)) {
        const match = v.attributes.some(
          (a) => a.name.toLowerCase() === n && a.value.toLowerCase() === val.toLowerCase()
        );
        if (!match) return false;
      }
      return true;
    });

    if (nextMatch?.imageUrl) {
      setActiveImage(nextMatch.imageUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400 text-sm animate-fadeIn">
        Loading product details...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="py-24 text-center space-y-4 animate-fadeIn">
        <div className="text-4xl">🛍️</div>
        <h2 className="text-lg font-bold text-white">Product Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          This product is either inactive, unavailable, or does not exist in our store catalog.
        </p>
        <Link
          to="/products"
          className="inline-block px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
        >
          Back to Store
        </Link>
      </div>
    );
  }

  const images = product.images || [];

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto pb-16">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/" className="hover:text-slate-200">
          Home
        </Link>
        <span>/</span>
        <Link to="/products" className="hover:text-slate-200">
          Catalog
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link to={`/products?category=${product.category.slug}`} className="hover:text-slate-200">
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-slate-200 truncate">{product.name}</span>
      </nav>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left: Image Gallery */}
        <div className="space-y-4">
          <div className="w-full aspect-square bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center relative shadow-xl">
            {activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
                className="w-full h-full object-cover object-center transition-all duration-300"
              />
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-4xl">
                {product.name[0]}
              </div>
            )}

            {product.featured && (
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Featured
                </span>
              </div>
            )}

            {/* Wishlist Button */}
            <div className="absolute top-4 right-4 z-10">
              <WishlistButton
                productId={product.id}
                productName={product.name}
                variant="icon"
              />
            </div>
          </div>


          {/* Thumbnails list */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(img.url)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    activeImage === img.url
                      ? 'border-indigo-500 shadow-md shadow-indigo-500/30'
                      : 'border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.altText || ''} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Details & Variant Chooser */}
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {product.brand && (
                <Link
                  to={`/products?brand=${product.brand.slug}`}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                >
                  {product.brand.name}
                </Link>
              )}
              {product.category && (
                <span className="text-xs text-slate-400">{product.category.name}</span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {product.name}
            </h1>

            {product.shortDescription && (
              <p className="text-sm text-slate-300 leading-relaxed">
                {product.shortDescription}
              </p>
            )}
          </div>

          {/* Pricing Box */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5">
            {matchedVariant ? (
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {formatMoney(matchedVariant.price, product.priceRange?.currency || 'PKR')}
                </span>
                {matchedVariant.compareAtPrice && (
                  <span className="text-sm font-mono text-slate-500 line-through">
                    {formatMoney(matchedVariant.compareAtPrice, product.priceRange?.currency || 'PKR')}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">
                    SKU: <strong className="text-slate-200">{matchedVariant.sku}</strong>
                  </span>
                  {matchedVariant.inStock === false || matchedVariant.stockStatus === 'OUT_OF_STOCK' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Out of Stock
                    </span>
                  ) : matchedVariant.stockStatus === 'LOW_STOCK' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Low Stock
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      In Stock
                    </span>
                  )}
                </div>
              </div>
            ) : product.priceRange ? (
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {product.priceRange.min === product.priceRange.max
                    ? formatMoney(product.priceRange.min, product.priceRange.currency)
                    : `${formatMoney(product.priceRange.min, product.priceRange.currency)} – ${formatMoney(
                        product.priceRange.max,
                        product.priceRange.currency
                      )}`}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic">No price available</span>
            )}
          </div>

          {/* Variant Option Pickers */}
          {Object.entries(optionGroups).length > 0 && (
            <div className="space-y-4 pt-2">
              {Object.entries(optionGroups).map(([groupName, values]) => (
                <div key={groupName} className="space-y-2">
                  <span className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {groupName}: <strong className="text-indigo-300">{selectedOptions[groupName] || 'None'}</strong>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {values.map((val) => {
                      const isSelected = selectedOptions[groupName]?.toLowerCase() === val.toLowerCase();
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleOptionSelect(groupName, val)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/50'
                              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Option Status Alert */}
          {!matchedVariant && Object.keys(optionGroups).length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>This specific option combination is currently unavailable.</span>
            </div>
          )}

          {/* Success Notice */}
          {successNotice && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successNotice}</span>
              </div>
              <Link
                to="/cart"
                className="underline font-bold text-white hover:text-emerald-200 text-xs"
              >
                View Cart
              </Link>
            </div>
          )}

          {/* Cart Error Notice */}
          {cartError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{cartError}</span>
              </div>
              <button
                type="button"
                onClick={() => setCartError(null)}
                className="text-rose-400 hover:text-white font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Quantity Selector & Add to Cart Action */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">
                  Quantity
                </label>
                <QuantityControl
                  quantity={quantity}
                  onChange={setQuantity}
                  disabled={
                    !matchedVariant ||
                    matchedVariant.inStock === false ||
                    matchedVariant.stockStatus === 'OUT_OF_STOCK' ||
                    addToCartMutation.isPending
                  }
                />
              </div>

              <div className="flex-1 space-y-1 pt-4">
                {(() => {
                  const isOutOfStock =
                    matchedVariant &&
                    (matchedVariant.inStock === false ||
                      matchedVariant.stockStatus === 'OUT_OF_STOCK');

                  return (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={
                        !matchedVariant ||
                        isOutOfStock ||
                        addToCartMutation.isPending
                      }
                      className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm shadow-lg transition-all ${
                        isOutOfStock
                          ? 'bg-rose-950/40 border border-rose-800/60 text-rose-400 cursor-not-allowed opacity-90'
                          : matchedVariant
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-[1.02] cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {addToCartMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Adding to Cart...</span>
                        </>
                      ) : isOutOfStock ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span>Out of Stock</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          <span>
                            {!isAuthenticated
                              ? 'Sign In to Add to Cart'
                              : matchedVariant
                              ? 'Add to Cart'
                              : 'Select an Option'}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>


            {/* Wishlist Action Button */}
            <WishlistButton
              productId={product.id}
              productName={product.name}
              variant="button"
              className="w-full"
            />


            <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center justify-between">
              <span>Authoritative pricing verified dynamically.</span>
              <span className="text-emerald-400 font-medium">In Stock</span>
            </div>
          </div>
        </div>
      </div>


      {/* Specifications & Description Tabs/Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-800">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white">Product Description</h2>
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80">
            {product.description || 'No detailed description provided for this product.'}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Specifications</h2>
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 space-y-3">
            {product.attributes && product.attributes.length > 0 ? (
              product.attributes.map((attr, idx) => (
                <div key={idx} className="flex justify-between text-xs py-1.5 border-b border-slate-800/60 last:border-0">
                  <span className="text-slate-400 font-medium">{attr.name}</span>
                  <span className="text-slate-100 font-semibold text-right">{attr.value}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No specifications listed.</p>
            )}

            {product.tags && product.tags.length > 0 && (
              <div className="pt-3">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((t) => (
                    <Link
                      key={t}
                      to={`/products?search=${t}`}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      #{t}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorefrontProductDetailPage;
