// src/app/trust/custody/page.tsx
// Auxite Wallet - Custody Details Page

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, MapPin, Lock, Eye, CheckCircle, Building, Globe, Key } from "lucide-react";

interface Vault {
  id: string;
  name: string;
  location: string;
  country: string;
  flag: string;
  operator: string;
  certification: string[];
  capacity: string;
  currentHoldings: string;
  securityFeatures: string[];
  insurance: string;
  lastInspection: string;
}

const VAULTS: Vault[] = [
  {
    id: 'zurich',
    name: 'Zurich Secure Vault',
    location: 'Zurich',
    country: 'Switzerland',
    flag: '🇨🇭',
    operator: 'Swiss Vault AG',
    certification: ['LBMA Certified', 'ISO 27001', 'SOC 2 Type II'],
    capacity: '500 tonnes',
    currentHoldings: '$320M',
    securityFeatures: [
      '24/7 Armed Security',
      'Biometric Access Control',
      'Motion Detection Sensors',
      'Seismic Monitoring',
      'Air-gapped Networks',
      'Multi-signature Access',
    ],
    insurance: 'Lloyd\'s of London - $500M',
    lastInspection: '2024-12-10',
  },
  {
    id: 'london',
    name: 'London Bullion Vault',
    location: 'London',
    country: 'United Kingdom',
    flag: '🇬🇧',
    operator: 'Brink\'s UK',
    certification: ['LBMA Certified', 'ISO 9001', 'ISO 27001'],
    capacity: '300 tonnes',
    currentHoldings: '$145M',
    securityFeatures: [
      '24/7 Surveillance',
      'Vault Depth: 30m Underground',
      'Blast-proof Construction',
      'Independent Power Supply',
      'Dual-key Access System',
    ],
    insurance: 'AXA Corporate - $300M',
    lastInspection: '2024-12-05',
  },
  {
    id: 'singapore',
    name: 'Singapore Freeport',
    location: 'Singapore',
    country: 'Singapore',
    flag: '🇸🇬',
    operator: 'Malca-Amit',
    certification: ['LBMA Certified', 'Singapore MAS Licensed'],
    capacity: '200 tonnes',
    currentHoldings: '$42M',
    securityFeatures: [
      'Military-grade Security',
      'Climate Controlled',
      'Earthquake Resistant',
      'Fire Suppression System',
      'Real-time Inventory Tracking',
    ],
    insurance: 'Chubb - $200M',
    lastInspection: '2024-11-28',
  },
];

export default function CustodyPage() {
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/trust" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Trust Center
          </Link>
          <h1 className="text-3xl font-bold text-white">Custody & Security</h1>
          <p className="text-slate-400 mt-2">Bank-grade vault storage across 3 continents</p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Vault Capacity', value: '1,000 tonnes', icon: Building },
            { label: 'Current Holdings', value: '$507M', icon: Lock },
            { label: 'Insurance Coverage', value: '$1B', icon: Shield },
            { label: 'Vault Locations', value: '3', icon: Globe },
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <stat.icon className="w-5 h-5 text-amber-400 mb-2" />
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vaults Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Vault Locations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VAULTS.map((vault) => (
            <div
              key={vault.id}
              className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer"
              onClick={() => setSelectedVault(vault)}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{vault.flag}</span>
                <div>
                  <h3 className="font-semibold text-white">{vault.name}</h3>
                  <p className="text-sm text-slate-400">{vault.location}, {vault.country}</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Operator</span>
                  <span className="text-sm text-white">{vault.operator}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Holdings</span>
                  <span className="text-sm text-[#2F6F62] font-semibold">{vault.currentHoldings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Insurance</span>
                  <span className="text-sm text-white">{vault.insurance.split(' - ')[1]}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {vault.certification.slice(0, 2).map((cert, i) => (
                  <span key={i} className="px-2 py-1 text-xs bg-amber-500/10 text-amber-400 rounded">
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Features */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-xl font-semibold text-white mb-6">Security Standards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#2F6F62]/10 to-[#2F6F62]/5 border border-[#2F6F62]/20">
            <div className="w-12 h-12 rounded-xl bg-[#2F6F62]/20 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-[#2F6F62]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Physical Security</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#2F6F62]" /> 24/7 armed security personnel</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#2F6F62]" /> Biometric access control</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#2F6F62]" /> Blast-proof vault doors</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#2F6F62]" /> Underground storage facilities</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
              <Key className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Access Control</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> Multi-signature authorization</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> Time-locked access procedures</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> Segregated storage by client</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> Dual-key authentication</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
              <Eye className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Monitoring</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-400" /> Real-time CCTV surveillance</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-400" /> Seismic activity monitoring</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-400" /> Environmental controls</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-400" /> Inventory tracking system</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
              <Building className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Insurance & Compliance</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-amber-400" /> $1B total insurance coverage</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-amber-400" /> LBMA certified facilities</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-amber-400" /> SOC 2 Type II compliant</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-amber-400" /> Regular third-party audits</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Vault Detail Modal */}
      {selectedVault && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedVault(null)}>
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedVault.flag}</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedVault.name}</h2>
                  <p className="text-slate-400">{selectedVault.location}, {selectedVault.country}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Operator</p>
                <p className="text-white">{selectedVault.operator}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Certifications</p>
                <div className="flex flex-wrap gap-2">
                  {selectedVault.certification.map((cert, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-[#2F6F62]/10 text-[#2F6F62] rounded">{cert}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Security Features</p>
                <ul className="space-y-1">
                  {selectedVault.securityFeatures.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-white">
                      <CheckCircle className="w-3 h-3 text-[#2F6F62]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Capacity</p>
                  <p className="text-white font-semibold">{selectedVault.capacity}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Current Holdings</p>
                  <p className="text-[#2F6F62] font-semibold">{selectedVault.currentHoldings}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Insurance</p>
                <p className="text-white">{selectedVault.insurance}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Last Inspection</p>
                <p className="text-white">{new Date(selectedVault.lastInspection).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-800">
              <button
                onClick={() => setSelectedVault(null)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
