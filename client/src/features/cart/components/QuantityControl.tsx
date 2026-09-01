import React from 'react';
import { Minus, Plus, Loader2 } from 'lucide-react';

interface QuantityControlProps {
  quantity: number;
  min?: number;
  max?: number;
  onChange: (quantity: number) => void;
  disabled?: boolean;
  isLoading?: boolean;
  size?: 'sm' | 'md';
}

export const QuantityControl: React.FC<QuantityControlProps> = ({
  quantity,
  min = 1,
  max = 99,
  onChange,
  disabled = false,
  isLoading = false,
  size = 'md',
}) => {
  const handleDecrement = () => {
    if (quantity > min && !disabled && !isLoading) {
      onChange(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < max && !disabled && !isLoading) {
      onChange(quantity + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= min && val <= max) {
      onChange(val);
    }
  };

  const isSm = size === 'sm';

  return (
    <div className="inline-flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 select-none">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || isLoading || quantity <= min}
        className={`flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer ${
          isSm ? 'w-6 h-6' : 'w-8 h-8'
        }`}
        aria-label="Decrease quantity"
      >
        <Minus className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      </button>

      <div className={`relative flex items-center justify-center font-mono font-semibold text-slate-200 ${
        isSm ? 'w-8 text-xs' : 'w-10 text-sm'
      }`}>
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        ) : (
          <input
            type="text"
            inputMode="numeric"
            value={quantity}
            onChange={handleInputChange}
            disabled={disabled || isLoading}
            className="w-full text-center bg-transparent focus:outline-none focus:text-indigo-400"
          />
        )}
      </div>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || isLoading || quantity >= max}
        className={`flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer ${
          isSm ? 'w-6 h-6' : 'w-8 h-8'
        }`}
        aria-label="Increase quantity"
      >
        <Plus className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      </button>
    </div>
  );
};

export default QuantityControl;
