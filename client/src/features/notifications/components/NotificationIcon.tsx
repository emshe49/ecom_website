import React from 'react';
import {
  Package,
  CreditCard,
  Truck,
  Star,
  RotateCcw,
  DollarSign,
  AlertTriangle,
  Tag,
  Bell,
} from 'lucide-react';
import { NotificationCategory } from '../types/notifications.types';

interface NotificationIconProps {
  category: NotificationCategory;
  className?: string;
}

export const NotificationIcon: React.FC<NotificationIconProps> = ({
  category,
  className = 'w-4 h-4',
}) => {
  switch (category) {
    case 'ORDER':
      return <Package className={`${className} text-indigo-400`} />;
    case 'PAYMENT':
      return <CreditCard className={`${className} text-emerald-400`} />;
    case 'SHIPPING':
      return <Truck className={`${className} text-blue-400`} />;
    case 'REVIEW':
      return <Star className={`${className} text-amber-400`} />;
    case 'RETURN':
      return <RotateCcw className={`${className} text-purple-400`} />;
    case 'REFUND':
      return <DollarSign className={`${className} text-teal-400`} />;
    case 'INVENTORY':
      return <AlertTriangle className={`${className} text-rose-400`} />;
    case 'PROMOTION':
      return <Tag className={`${className} text-pink-400`} />;
    case 'SYSTEM':
    default:
      return <Bell className={`${className} text-slate-400`} />;
  }
};
