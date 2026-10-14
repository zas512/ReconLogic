"use client";
import { useState } from "react";

export default function PdfViewer({ src }: { src: string }) {
  const [selectedBox, setSelectedBox] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans p-8 md:p-12">
      <h2 className="text-3xl font-black tracking-tighter mb-8">Evidence Viewer</h2>
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-10">
        <div className="flex gap-6">
          {/* PDF placeholder with bounding box overlay */}
          <div className="relative flex-1 aspect-[4/5] bg-slate-900 rounded-xl overflow-hidden shadow-2xl">
            <img src={src || "/invoice-sample.png"} alt="Invoice PDF" className="w-full h-full object-contain opacity-90" />
            {/* Bounding box highlight */}
            <div className="absolute top-[35%] left-[20%] w-[30%] h-[10%] border-2 border-amber-400 bg-amber-400/20 rounded shadow-[0_0_20px_rgba(251,191,36,0.5)]" title="Source: $1,245.00" />
          </div>

          {/* Evidence panel */}
          <aside className="w-80 space-y-4">
            <h3 className="text-xl font-black">Evidence Link</h3>
            <div className="rounded-xl bg-slate-900 border border-white/10 p-4">
              <div className="font-mono text-xs text-slate-400 mb-1">SOURCE_STRING</div>
              <code className="text-sm font-bold text-amber-300">"$1,245.00"</code>
            </div>
            <div className="rounded-xl bg-slate-900 border border-white/10 p-4">
              <div className="font-mono text-xs text-slate-400 mb-1">BOUNDING BOX</div>
              <div className="text-sm text-slate-200">Page 1 • left 20% • top 35% • w 30% • h 10%</div>
            </div>
            <div className="rounded-xl bg-amber-400/10 border border-amber-400/30 p-4">
              <div className="font-mono text-xs text-amber-300 mb-1">MATCH STATUS</div>
              <div className="text-sm font-black text-amber-300">Exception — requires sign-off</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
