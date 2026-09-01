import React from 'react';
import { OrderItemSnapshot } from '../orders.types';
import { ShoppingBag } from 'lucide-react';


interface OrderItemsTableProps {
  items: OrderItemSnapshot[];
  currency?: string;
}

export const OrderItemsTable: React.FC<OrderItemsTableProps> = ({
  items,
  currency = 'PKR',
}) => {
  const formatPrice = (minorUnits: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: currency || 'PKR',
      minimumFractionDigits: 2,
    }).format(minorUnits / 100);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShoppingBag className="w-5 h-5 text-indigo-400" />

          <h3 className="text-base font-semibold text-slate-100">
            Order Items ({items.reduce((sum, item) => sum + item.quantity, 0)})
          </h3>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/50 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th scope="col" className="py-3.5 px-4 sm:px-6">
                Product Details
              </th>
              <th scope="col" className="py-3.5 px-4 text-center">
                SKU
              </th>
              <th scope="col" className="py-3.5 px-4 text-right">
                Unit Price
              </th>
              <th scope="col" className="py-3.5 px-4 text-center">
                Qty
              </th>
              <th scope="col" className="py-3.5 px-4 sm:px-6 text-right">
                Line Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {items.map((item, idx) => (
              <tr key={`${item.variantId}-${idx}`} className="hover:bg-slate-800/20 transition-colors">
                <td className="py-4 px-4 sm:px-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.primaryImage ? (
                        <img
                          src={item.primaryImage}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-slate-600" />
                      )}

                    </div>
                    <div>
                      <p className="font-medium text-slate-100 line-clamp-1">
                        {item.productName}
                      </p>
                      {item.variantAttributes && item.variantAttributes.length > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.variantAttributes
                            .map((attr) => `${attr.name}: ${attr.value}`)
                            .join(' • ')}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-center font-mono text-xs text-slate-400">
                  {item.sku}
                </td>
                <td className="py-4 px-4 text-right text-slate-300">
                  {formatPrice(item.unitPrice)}
                </td>
                <td className="py-4 px-4 text-center font-medium text-slate-200">
                  × {item.quantity}
                </td>
                <td className="py-4 px-4 sm:px-6 text-right font-semibold text-slate-100">
                  {formatPrice(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
