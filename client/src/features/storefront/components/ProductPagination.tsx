import React from 'react';
import { PaginationMeta } from '../types/product-search.types';

interface ProductPaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

export const ProductPagination: React.FC<ProductPaginationProps> = ({
  pagination,
  onPageChange,
}) => {
  const { page, totalPages, total, hasNextPage, hasPreviousPage } = pagination;

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-800 text-xs text-slate-400">
      <div>
        Showing page <span className="font-semibold text-slate-200">{page}</span> of{' '}
        <span className="font-semibold text-slate-200">{totalPages}</span> ({total} products)
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 disabled:opacity-40 transition-colors"
        >
          Previous
        </button>

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pNum: number;
          if (totalPages <= 5) {
            pNum = i + 1;
          } else if (page <= 3) {
            pNum = i + 1;
          } else if (page >= totalPages - 2) {
            pNum = totalPages - 4 + i;
          } else {
            pNum = page - 2 + i;
          }

          return (
            <button
              key={pNum}
              type="button"
              onClick={() => onPageChange(pNum)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                pNum === page
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {pNum}
            </button>
          );
        })}

        <button
          type="button"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 disabled:opacity-40 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};
