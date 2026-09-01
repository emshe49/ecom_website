import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NotificationItem as INotificationItem } from '../types/notifications.types';
import { notificationsApi } from '../api/notifications.api';
import { NotificationIcon } from './NotificationIcon';

interface NotificationItemProps {
  notification: INotificationItem;
  onItemClick?: () => void;
  compact?: boolean;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onItemClick,
  compact = false,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }

    if (onItemClick) {
      onItemClick();
    }

    if (notification.actionUrl && notification.actionUrl.startsWith('/')) {
      navigate(notification.actionUrl);
    }
  };

  const formatRelativeTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSec < 60) return 'Just now';
      const diffInMin = Math.floor(diffInSec / 60);
      if (diffInMin < 60) return `${diffInMin}m ago`;
      const diffInHours = Math.floor(diffInMin / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-start gap-3 p-3.5 rounded-xl transition-all cursor-pointer border ${
        notification.read
          ? 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/40 hover:border-slate-700/60'
          : 'bg-indigo-950/20 border-indigo-900/40 hover:bg-indigo-950/40 hover:border-indigo-800/60 shadow-sm'
      }`}
    >
      {/* Category Icon */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
          notification.read
            ? 'bg-slate-800 border-slate-700/60'
            : 'bg-slate-800/90 border-indigo-500/30'
        }`}
      >
        <NotificationIcon category={notification.category} className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4
            className={`text-xs font-semibold truncate ${
              notification.read ? 'text-slate-300' : 'text-white'
            }`}
          >
            {notification.title}
          </h4>
          <span className="text-[10px] text-slate-400 font-mono shrink-0">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>

        <p
          className={`text-xs mt-0.5 leading-relaxed text-slate-400 ${
            compact ? 'line-clamp-2' : ''
          }`}
        >
          {notification.message}
        </p>
      </div>

      {/* Unread indicator dot */}
      {!notification.read && (
        <span
          className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1 shadow-sm shadow-indigo-500/50"
          title="Unread"
        />
      )}
    </div>
  );
};
