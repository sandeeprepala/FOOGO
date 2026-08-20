import React from 'react';
import { useNotification } from '../context/NotificationContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useNotification();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full px-4">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center justify-between gap-3 p-4 rounded-2xl shadow-soft border transition-all duration-300 transform translate-y-0 ${
            toast.type === 'success'
              ? 'bg-surface-ivory border-primary-olive text-forest-green'
              : toast.type === 'error'
              ? 'bg-[#FDF2F2] border-[#E57373] text-[#7A1C1C]'
              : toast.type === 'warning'
              ? 'bg-[#FFFBEB] border-[#F59E0B] text-[#78350F]'
              : 'bg-card-sage border-border-light text-forest-green'
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-primary-olive shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-[#D32F2F] shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-primary-olive shrink-0" />}
            <span className="text-sm font-medium leading-snug">{toast.message}</span>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-muted-sage hover:text-text-charcoal p-1 rounded-full hover:bg-black/5"
            aria-label="Close alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
