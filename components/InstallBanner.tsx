import React from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface InstallBannerProps {
  visible: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

const InstallBanner: React.FC<InstallBannerProps> = ({ visible, onInstall, onDismiss }) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="absolute top-3 left-3 right-3 z-[1600] safe-area-top install-banner-enter pointer-events-none">
      <div className="glass-panel rounded-2xl shadow-xl px-4 py-3 pointer-events-auto">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
            <Smartphone size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-bold text-slate-900">Instal·la BicingAI</div>
            <p className="mt-0.5 text-xs leading-5 text-slate-600">
              Accés instantani des d&apos;Android o Windows, pantalla completa i obertura molt més ràpida.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={onInstall}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-200 transition active:scale-95"
              >
                <Download size={14} /> Instal·lar
              </button>
              <button
                onClick={onDismiss}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition active:scale-95"
              >
                Més tard
              </button>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100"
            aria-label="Tancar banner d'instal·lació"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallBanner;