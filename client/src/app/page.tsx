import { FileText, AlertTriangle, ShieldCheck } from "lucide-react";

export default function ReconDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-400/20">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tighter">ReconLogic</h1>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">CPA • Reconciliation</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 space-y-16">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-blue-900/40 to-slate-900 border border-white/5 p-12">
          <h2 className="text-5xl font-black tracking-tighter leading-tight">Evidence-first.<br/>No hallucinations.</h2>
          <p className="mt-6 text-xl text-slate-300 max-w-xl">Every extracted number maps to a bounding box. Every match requires a human sign-off.</p>
        </section>

        <section>
          <h3 className="text-3xl font-extrabold tracking-tight mb-8">Reconciliation Jobs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-blue-400/30 transition-colors">
              <FileText className="h-8 w-8 text-blue-400 mb-4" />
              <h4 className="text-lg font-bold">Pending Uploads</h4>
              <p className="text-sm text-slate-400 mt-2">Upload GL CSV + invoice PDFs to start.</p>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6">
              <AlertTriangle className="h-8 w-8 text-amber-400 mb-4" />
              <h4 className="text-lg font-bold">Exceptions</h4>
              <p className="text-sm text-slate-400 mt-2">Items flagged by deterministic Decimal matching.</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6">
              <ShieldCheck className="h-8 w-8 text-emerald-400 mb-4" />
              <h4 className="text-lg font-bold">Approved</h4>
              <p className="text-sm text-slate-400 mt-2">Human-reviewed and signed off.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
