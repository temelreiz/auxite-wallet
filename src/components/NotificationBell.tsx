"use client";

import { useState } from "react";
import { usePositionNotifications } from "@/hooks/usePositionNotifications";

interface NotificationBellProps {
  lang: "tr" | "en";
}

export function NotificationBell({ lang }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    notifications, 
    unlockedCount, 
    totalCount, 
    dismissNotification,
    clearAllNotifications 
  } = usePositionNotifications(lang);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "unlocked":
        return "🔓";
      case "unlock_soon":
        return "⏰";
      default:
        return "📢";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "unlocked":
        return "border-[#2F6F62]/50 bg-[#2F6F62]/10";
      case "unlock_soon":
        return "border-[#BFA181]/50 bg-[#BFA181]/10";
      default:
        return "border-blue-500/50 bg-blue-500/10";
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
      >
        <svg
          className="w-5 h-5 text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Badge */}
        {totalCount > 0 && (
          <span className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full ${
            unlockedCount > 0 ? "bg-[#2F6F62] text-white" : "bg-[#2F6F62] text-white"
          }`}>
            {totalCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel */}
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="font-semibold text-slate-200">
                {lang === "tr" ? "Bildirimler" : "Notifications"}
              </h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-slate-400 hover:text-slate-300"
                >
                  {lang === "tr" ? "Tümünü Temizle" : "Clear All"}
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="p-2">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-3xl mb-2">🔔</div>
                  <p className="text-sm">
                    {lang === "tr" ? "Bildirim yok" : "No notifications"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border ${getNotificationColor(notification.type)} relative group`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {notification.metal} • {parseFloat(notification.amount).toFixed(2)}g
                          </p>
                        </div>
                        <button
                          onClick={() => dismissNotification(notification.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Action Button for Unlocked */}
                      {notification.type === "unlocked" && (
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            // Navigate to positions tab
                            window.location.href = "/leasing?tab=positions";
                          }}
                          className="mt-2 w-full px-3 py-1.5 rounded bg-[#2F6F62] hover:bg-[#2F6F62] text-white text-xs font-medium transition-colors"
                        >
                          {lang === "tr" ? "Geri Çek" : "Withdraw"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}