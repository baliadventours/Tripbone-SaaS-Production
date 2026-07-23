import React from 'react';
import { useTenant } from '../lib/TenantContext';
import { ShieldAlert, LogOut, LayoutDashboard, Globe, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ImpersonateBar() {
  const { tenant, isImpersonating, stopImpersonation } = useTenant();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  return (
    <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white border-b border-amber-500/40 shadow-2xl px-4 py-2.5 z-[10000] sticky top-0 no-print transition-all animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Left Side: Takeover Status & Tenant Info */}
        <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-full font-black uppercase text-[10px] tracking-wider animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Superadmin Takeover</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-gray-200">
            <span>Impersonating:</span>
            <strong className="font-extrabold text-white text-sm">
              {tenant?.companyName || tenant?.slug || 'Tenant Workspace'}
            </strong>
            {tenant?.id && (
              <span className="hidden md:inline font-mono text-[10px] text-gray-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                ID: {tenant.id}
              </span>
            )}
            {tenant?.plan && (
              <span className="hidden lg:inline text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {tenant.plan}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Navigation & Exit Impersonation Action */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg font-bold text-xs transition-colors border border-indigo-400/30 shadow-sm"
            title="Go to Tenant Admin Dashboard"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Tenant Admin (/admin)</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-200 rounded-lg font-bold text-xs transition-colors border border-slate-700 shadow-sm"
            title="View Public Tenant Website"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </button>

          <button
            onClick={stopImpersonation}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-lg text-xs shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            title="Exit impersonation and return to Superadmin console"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Impersonation</span>
          </button>
        </div>

      </div>
    </div>
  );
}
