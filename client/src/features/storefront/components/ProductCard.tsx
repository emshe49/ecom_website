import React from 'react';
import { Link } from 'react-router-dom';
import { ProductCardDTO } from '../types/product-search.types';
import { formatMoney } from '../../../utils/money';
import { WishlistButton } from '../../wishlist/components/WishlistButton';

interface ProductCardProps {
  product: ProductCardDTO;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const primaryImg = product.images.find((img) => img.isPrimary) || product.images[0];

  const renderPrice = () => {
    const { min, max, currency } = product.priceRange;
    if (!min && !max) {
      return <span className="text-slate-500 text-xs italic">Price unavailable</span>;
    }
    if (min === max) {
      return (
        <span className="text-base font-bold text-emerald-400 font-mono">
          {formatMoney(min, currency)}
        </span>
      );
    }
    return (
      <span className="text-sm font-bold text-emerald-400 font-mono">
        {formatMoney(min, currency)} – {formatMoney(max, currency)}
      </span>
    );
  };

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group relative flex flex-col bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Product Image Box */}
      <div className="relative w-full aspect-square bg-slate-950/80 overflow-hidden flex items-center justify-center border-b border-slate-800/80">
        {primaryImg ? (
          <img
            src={primaryImg.url}
            alt={primaryImg.altText || product.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-2xl">
            {product.name[0]}
          </div>
        )}

        {/* Wishlist Button (Top Right) */}
        <div className="absolute top-3 right-3 z-10">
          <WishlistButton
            productId={product.id}
            productName={product.name}
            variant="icon"
          />
        </div>

        {/* Featured Badge */}
        {product.featured && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Featured
            </span>
          </div>
        )}


        {/* Variant Count Tag */}
        {product.availableVariantCount > 1 && (
          <div className="absolute bottom-3 right-3">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-950/80 text-slate-300 border border-slate-800 backdrop-blur-sm">
              {product.availableVariantCount} Options
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{product.category.name}</span>
            {product.brand && (
              <span className="font-medium text-indigo-400">{product.brand.name}</span>
            )}
          </div>

          <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {product.shortDescription && (
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {product.shortDescription}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
          <div>{renderPrice()}</div>
          <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  );
};
