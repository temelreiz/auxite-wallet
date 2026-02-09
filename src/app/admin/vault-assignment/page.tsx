"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

// Types
interface Allocation {
  id: string;
  oderId: string;
  walletAddress: string;
  metalType: string;
  grams: number;
  vaultLocation: string | null;
  status: "pending" | "assigned" | "verified";
  createdAt: string;
  assignedAt?: string;
}

// Vault locations
const VAULT_LOCATIONS = [
  { id: "zurich", name: "Zurich Vault", country: "Switzerland", flag: "🇨🇭" },
  { id: "singapore", name: "Singapore Vault", country: "Singapore", flag: "🇸🇬" },
  { id: "london", name: "London Vault", country: "United Kingdom", flag: "🇬🇧" },
  { id: "dubai", name: "Dubai Vault", country: "UAE", flag: "🇦🇪" },
];

// Metal info
const METAL_INFO: Record<string, { name: string; icon: string; color: string }> = {
  AUXG: { name: "Gold", icon: "🥇", color: "text-[#BFA181]" },
  AUXS: { name: "Silver", icon: "🥈", color: "text-slate-300" },
  AUXPT: { name: "Platinum", icon: "💎", color: "text-cyan-400" },
  AUXPD: { name: "Palladium", icon: "💜", color: "text-purple-400" },
};

// Admin addresses
const ADMIN_ADDRESSES = [
  "0xD24B2bca1E0b58a2EAE5b1184871219f9a8EE944",
].map(a => a.toLowerCase());

export default function VaultAssignmentPage() {
  const { isConnected, address } = useAccount();
  
  // Auth state
  const [isAdmin, setIsAdmin] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  
  // Data state
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "assigned">("pending");
  const [filterMetal, setFilterMetal] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Message
  const [message, setMessage] = useState({ type: "", text: "" });

  // Check admin auth
  useEffect(() => {
    if (address) {
      const isAdminWallet = ADMIN_ADDRESSES.includes(address.toLowerCase());
      setIsAdmin(isAdminWallet);
      if (isAdminWallet) {
        const token = sessionStorage.getItem("auxite_admin_token");
        if (token) {
          setAuthenticated(true);
          loadAllocations();
        }
      }
    }
  }, [address]);

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${sessionStorage.getItem("auxite_admin_token")}`,
  });

  // Load allocations
  const loadAllocations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/allocations", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAllocations(data.allocations || []);
      }
    } catch (e) {
      console.error("Failed to load allocations:", e);
    } finally {
      setLoading(false);
    }
  };

  // Assign vault
  const handleAssignVault = async (allocationId: string, vaultId: string) => {
    setProcessing(allocationId);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/admin/allocations", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "assign-vault",
          allocationId,
          vaultLocation: vaultId,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Vault başarıyla atandı!" });
        loadAllocations();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Atama başarısız" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Bağlantı hatası" });
    } finally {
      setProcessing(null);
    }
  };

  // Bulk assign
  const handleBulkAssign = async (vaultId: string) => {
    const pendingAllocations = filteredAllocations.filter(a => a.status === "pending");
    if (pendingAllocations.length === 0) return;

    setProcessing("bulk");
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/admin/allocations", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "bulk-assign",
          allocationIds: pendingAllocations.map(a => a.id),
          vaultLocation: vaultId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: `${data.assigned} allocation vault'a atandı!` });
        loadAllocations();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Toplu atama başarısız" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Bağlantı hatası" });
    } finally {
      setProcessing(null);
    }
  };

  // Filter allocations
  const filteredAllocations = allocations.filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterMetal !== "all" && a.metalType !== filterMetal) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        a.walletAddress.toLowerCase().includes(query) ||
        a.oderId?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    total: allocations.length,
    pending: allocations.filter(a => a.status === "pending").length,
    assigned: allocations.filter(a => a.status === "assigned").length,
    totalGrams: allocations.reduce((sum, a) => sum + a.grams, 0),
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Not connected
  if (!isConnected) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
            <span className="text-4xl">🏦</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">Vault Assignment</h1>
          <p className="text-slate-400 mb-6">Admin cüzdanınızı bağlayın</p>
          <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
        </div>
      </main>
    );
  }

  // Not admin
  if (!isAdmin || !authenticated) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">Yetkisiz Erişim</h1>
          <p className="text-slate-400 mb-6">Bu sayfaya erişim yetkiniz yok</p>
          <Link
            href="/admin"
            className="px-6 py-3 bg-[#2F6F62] hover:bg-[#2F6F62] rounded-xl text-black font-semibold"
          >
            Admin Paneline Git
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Image src="/gold-favicon-32x32.png" alt="Auxite" width={32} height={32} />
              </Link>
              <div>
                <h1 className="text-xl font-bold">🏦 Vault Assignment</h1>
                <p className="text-sm text-slate-400">Kullanıcı allocation'larına vault ata</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-sm"
              >
                ← Admin Panel
              </Link>
              <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Toplam Allocation</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Bekleyen</p>
            <p className="text-2xl font-bold text-orange-400">{stats.pending}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Atanmış</p>
            <p className="text-2xl font-bold text-[#2F6F62]">{stats.assigned}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Toplam Gram</p>
            <p className="text-2xl font-bold text-[#BFA181]">{stats.totalGrams.toLocaleString()}g</p>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.type === "success"
              ? "bg-[#2F6F62]/20 border border-[#2F6F62]/50 text-[#2F6F62]"
              : "bg-red-500/20 border border-red-500/50 text-red-400"
          }`}>
            {message.text}
          </div>
        )}

        {/* Filters & Bulk Actions */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Bekleyen</option>
              <option value="assigned">Atanmış</option>
            </select>

            {/* Metal Filter */}
            <select
              value={filterMetal}
              onChange={(e) => setFilterMetal(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Tüm Metaller</option>
              <option value="AUXG">🥇 Gold</option>
              <option value="AUXS">🥈 Silver</option>
              <option value="AUXPT">💎 Platinum</option>
              <option value="AUXPD">💜 Palladium</option>
            </select>

            {/* Search */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Adres veya Order ID ara..."
              className="flex-1 min-w-48 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            />

            {/* Bulk Assign */}
            {stats.pending > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-slate-400">Toplu Ata:</span>
                {VAULT_LOCATIONS.map(vault => (
                  <button
                    key={vault.id}
                    onClick={() => handleBulkAssign(vault.id)}
                    disabled={processing === "bulk"}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs transition-colors disabled:opacity-50"
                    title={vault.name}
                  >
                    {vault.flag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Allocations Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <div className="animate-spin w-8 h-8 border-2 border-[#BFA181] border-t-transparent rounded-full mx-auto mb-4"></div>
              Yükleniyor...
            </div>
          ) : filteredAllocations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <span className="text-4xl block mb-4">📭</span>
              Allocation bulunamadı
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Metal</th>
                    <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Miktar</th>
                    <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Cüzdan</th>
                    <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Order ID</th>
                    <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Tarih</th>
                    <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Durum</th>
                    <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Vault</th>
                    <th className="text-right px-4 py-3 text-xs text-slate-400 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredAllocations.map((allocation) => {
                    const metal = METAL_INFO[allocation.metalType] || { name: allocation.metalType, icon: "?", color: "text-white" };
                    const vault = VAULT_LOCATIONS.find(v => v.id === allocation.vaultLocation);
                    
                    return (
                      <tr key={allocation.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{metal.icon}</span>
                            <span className={`font-medium ${metal.color}`}>{allocation.metalType}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium">{allocation.grams.toLocaleString()}g</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-400">
                            {allocation.walletAddress.slice(0, 6)}...{allocation.walletAddress.slice(-4)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-500">
                            {allocation.oderId?.slice(0, 10) || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-400">{formatDate(allocation.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            allocation.status === "pending"
                              ? "bg-orange-500/20 text-orange-400"
                              : allocation.status === "assigned"
                              ? "bg-[#2F6F62]/20 text-[#2F6F62]"
                              : "bg-blue-500/20 text-blue-400"
                          }`}>
                            {allocation.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {vault ? (
                            <span className="flex items-center gap-1 text-sm">
                              {vault.flag} {vault.name.split(" ")[0]}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {allocation.status === "pending" ? (
                            <div className="flex items-center justify-end gap-1">
                              {VAULT_LOCATIONS.map(v => (
                                <button
                                  key={v.id}
                                  onClick={() => handleAssignVault(allocation.id, v.id)}
                                  disabled={processing === allocation.id}
                                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors disabled:opacity-50"
                                  title={v.name}
                                >
                                  {v.flag}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">✓</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vault Legend */}
        <div className="mt-6 p-4 bg-slate-900/30 rounded-xl">
          <h4 className="text-sm font-medium text-slate-400 mb-3">Vault Lokasyonları</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {VAULT_LOCATIONS.map(vault => (
              <div key={vault.id} className="flex items-center gap-2 text-sm">
                <span className="text-xl">{vault.flag}</span>
                <div>
                  <p className="font-medium">{vault.name}</p>
                  <p className="text-xs text-slate-500">{vault.country}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
