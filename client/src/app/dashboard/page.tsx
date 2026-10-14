"use client";
import { AlertTriangle, CheckCircle2, Clock, Search } from "lucide-react";

export default function ReconDashboard() {
  const jobs = [
    { id: 1, status: "completed", exceptions: 2, invoices: 12 },
    { id: 2, status: "processing", exceptions: 0, invoices: 3 },
    { id: 3, status: "human_review", exceptions: 7, invoices: 9 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-400/20 p-8 md:p-12">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">ReconLogic</h1>
          <p className="text-slate-400 mt-2">CPA • Evidence-first reconciliation</p>
        </div>
        <button className="rounded-full bg-amber-400 text-black font-black px-6 py-3 hover:bg-amber-300 transition">New Job</button>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Job list */}
        <section className="lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-extrabold tracking-tight">Active Reconciliations</h2>
          {jobs.map((j) => (
            <a key={j.id} href={`/app/dashboard/${j.id}`} className="block rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-blue-400/30 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-slate-400">JOB-{j.id}</span>
                <span className={`text-xs font-black uppercase tracking-widest ${j.status === "completed" ? "text-emerald-400" : j.status === "processing" ? "text-blue-400" : "text-amber-400"}`}>{j.status}</span>
              </div>
              <div className="flex gap-6 text-sm font-medium text-slate-300">
                <span>{j.invoices} invoices</span>
                <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> {j.exceptions} exceptions</span>
              </div>
            </a>
          ))}
        </section>

        {/* Stats */}
        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold tracking-tight">Evidence Stats</h2>
          <div className="rounded-2xl bg-gradient-to-br from-blue-900/30 to-slate-900 border border-white/5 p-6">
            <div className="text-5xl font-black text-blue-400">95%</div>
            <div className="text-sm font-medium text-slate-300">Matching accuracy target (300 transactions)</div>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
            <div className="text-5xl font-black text-amber-400">0</div>
            <div className="text-sm font-medium text-slate-300">Float values used in matching (Decimal only)</div>
          </div>
        </section>
      </main>
    </div>
  );
}
