import React from 'react';
import { CreditCard, Banknote, ShieldCheck } from 'lucide-react';
import { PaymentMethod, PaymentMethodOption } from '../payments.types';

interface PaymentMethodSelectorProps {
  methods: PaymentMethodOption[];
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  methods,
  selectedMethod,
  onSelect,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">
          Choose Payment Method
        </label>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          End-to-End Encrypted
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {methods.map((m) => {
          const isSelected = selectedMethod === m.code;
          const isOnline = m.code === 'ONLINE';

          return (
            <div
              key={m.code}
              onClick={() => !disabled && m.enabled && onSelect(m.code)}
              className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
              } ${disabled || !m.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-lg border ${
                      isSelected
                        ? 'border-indigo-500/30 bg-indigo-500/20 text-indigo-400'
                        : 'border-slate-800 bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isOnline ? (
                      <CreditCard className="w-5 h-5" />
                    ) : (
                      <Banknote className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100">
                      {m.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {m.description}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600'
                      : 'border-slate-700'
                  }`}
                >
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </div>

              <div className="mt-auto pt-2 flex items-center gap-2">
                {isOnline ? (
                  <span className="inline-flex items-center text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Cards / Net Banking / Sandbox
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                    Pay on Package Delivery
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
