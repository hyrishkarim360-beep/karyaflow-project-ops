"use client";

import {
  Activity, ArrowDownToLine, ArrowRight, Bell, BriefcaseBusiness,
  Building2, CalendarDays, Camera, Check, CheckCheck, ChevronDown,
  CircleCheck, CircleDollarSign, CircleHelp, Clock3, FileCheck2,
  FilePlus2, FileStack, FileText, HandCoins, LayoutDashboard, ListChecks, Menu,
  MoreHorizontal, Pencil, Plus, Printer, ReceiptText, ScanLine, Search, Send,
  Settings2, ShieldAlert, Sparkles, Trash2, TrendingUp, Upload, Wallet, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { demoWorkspace } from "@/lib/demo-data";
import type { Activity as ActivityItem, DocumentTemplate, Expense, ExpenseLine, Invoice, Opportunity, Project, WorkspaceData } from "@/lib/types";

type PageKey = "dashboard" | "projects" | "opportunities" | "expenses" | "invoices" | "documents" | "templates";
type ModalKey = "project" | "opportunity" | "expense" | "invoice" | null;
type NavItem = { id: PageKey; label: string; icon: LucideIcon; count?: number };
type NewProject = { name: string; clientName: string; siteName: string; contractValue: number; internalBudget: number; manager: string; dueDate: string };
type NewOpportunity = { title: string; clientName: string; siteName: string; value: number; deadline: string; owner: string };
type NewExpense = { projectId: string | null; scope: "project" | "company_overhead"; merchant: string; date: string; amount: number; category: string; paidBy: "company" | "employee"; settlementStatus: string; receiptUrl?: string; items: ExpenseLine[] };
type NewInvoice = { projectId: string; number: string; dueDate: string; amount: number };

const navItems: NavItem[] = [
  { id: "dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { id: "projects", label: "Proyek", icon: BriefcaseBusiness },
  { id: "opportunities", label: "Peluang & tender", icon: FilePlus2 },
  { id: "expenses", label: "Pengeluaran", icon: ReceiptText, count: 2 },
  { id: "invoices", label: "Tagihan", icon: CircleDollarSign },
  { id: "documents", label: "Dokumen", icon: FileStack },
  { id: "templates", label: "Template dokumen", icon: FileText },
];

const formatIDR = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const formatCompact = (value: number) => {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(2).replace(".", ",")} M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(0)} jt`;
  return formatIDR(value);
};
const formatDate = (value: string) => {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
};
const initials = (value: string) => value.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const safeNumber = (value: string) => Number(value.replace(/[^0-9]/g, "")) || 0;
const assetUrl = (value?: string) => value?.startsWith("data:") ? value : value ? `/api/receipt?path=${encodeURIComponent(value)}` : "";

function storeDemoWorkspace(value: WorkspaceData) {
  try { localStorage.setItem("karyaflow-demo-workspace-v1", JSON.stringify(value)); } catch { /* Browser storage can be unavailable in private mode. */ }
}

export default function WorkspaceApp() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [workspace, setWorkspace] = useState<WorkspaceData>(demoWorkspace);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<ModalKey>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch("/api/workspace", { cache: "no-store" });
        if (!response.ok) throw new Error("Workspace unavailable");
        const result = await response.json() as { isDemoMode: boolean; workspace: WorkspaceData };
        if (!alive) return;
        setIsDemoMode(result.isDemoMode);
        if (result.isDemoMode) {
          const localCopy = localStorage.getItem("karyaflow-demo-workspace-v1");
          if (localCopy) {
            try { setWorkspace(JSON.parse(localCopy) as WorkspaceData); }
            catch { setWorkspace(result.workspace); }
          } else setWorkspace(result.workspace);
        } else setWorkspace(result.workspace);
      } catch {
        if (alive) setWorkspace(demoWorkspace);
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };
  const updateDemo = (next: WorkspaceData) => {
    setWorkspace(next);
    storeDemoWorkspace(next);
  };
  const refreshWorkspace = async () => {
    const response = await fetch("/api/workspace", { cache: "no-store" });
    if (!response.ok) throw new Error("Gagal memuat ulang data workspace.");
    const result = await response.json() as { workspace: WorkspaceData };
    setWorkspace(result.workspace);
  };
  const runAction = async (action: string, payload: unknown) => {
    if (isDemoMode) return null;
    setSaving(true);
    try {
      const response = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, payload }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Aksi gagal disimpan.");
      await refreshWorkspace();
      return result;
    } finally { setSaving(false); }
  };

  const createProject = async (data: NewProject) => {
    if (isDemoMode) {
      const id = `project-${Date.now()}`;
      const project: Project = {
        id, code: `PRJ-${String(workspace.projects.length + 27).padStart(3, "0")}`, name: data.name,
        clientName: data.clientName, siteName: data.siteName, status: "Planning", progress: 0,
        contractValue: data.contractValue, internalBudget: data.internalBudget, actualCost: 0, pendingCost: 0,
        manager: data.manager, dueDate: data.dueDate, nextMilestone: "Kickoff proyek", color: "sage",
      };
      updateDemo({ ...workspace, projects: [project, ...workspace.projects], activities: [{ id: `act-${id}`, title: "Proyek baru dibuat", detail: `${project.code} · ${project.name}`, time: "Baru saja", kind: "project" }, ...workspace.activities] });
    } else await runAction("createProject", data);
    setModal(null); showToast("Proyek berhasil ditambahkan.");
  };

  const createOpportunity = async (data: NewOpportunity) => {
    if (isDemoMode) {
      const item: Opportunity = { id: `opp-${Date.now()}`, ...data, status: "Susun proposal" };
      updateDemo({ ...workspace, opportunities: [item, ...workspace.opportunities] });
    } else await runAction("createOpportunity", data);
    setModal(null); showToast("Peluang baru berhasil dicatat.");
  };

  const createExpense = async (data: NewExpense) => {
    if (isDemoMode) {
      const item: Expense = {
        id: `EXP-${String(Date.now()).slice(-6)}`, ...data,
        projectName: data.scope === "company_overhead" ? "Overhead perusahaan" : workspace.projects.find((project) => project.id === data.projectId)?.name ?? "Proyek",
        status: "Submitted",
      };
      updateDemo({ ...workspace, expenses: [item, ...workspace.expenses], activities: [{ id: `act-${item.id}`, title: "Pengeluaran menunggu persetujuan", detail: `${item.id} · ${item.category} · ${item.projectName}`, time: "Baru saja", kind: "expense" }, ...workspace.activities] });
    } else await runAction("createExpense", data);
    setModal(null); showToast("Pengeluaran dikirim untuk persetujuan.");
  };

  const reviewExpense = async (expenseId: string, status: "Approved" | "Needs correction" | "Rejected") => {
    if (isDemoMode) {
      const selected = workspace.expenses.find((expense) => expense.id === expenseId);
      updateDemo({ ...workspace, expenses: workspace.expenses.map((expense) => expense.id === expenseId ? { ...expense, status, settlementStatus: expense.paidBy === "employee" && status === "Approved" ? "Menunggu reimburse" : expense.settlementStatus } : expense), activities: [{ id: `act-${Date.now()}`, title: `Pengeluaran ${status === "Approved" ? "disetujui" : status === "Rejected" ? "ditolak" : "dikembalikan"}`, detail: `${expenseId} · ${selected?.merchant ?? "Pengeluaran"}`, time: "Baru saja", kind: "expense" }, ...workspace.activities] });
    } else await runAction("reviewExpense", { id: expenseId, status });
    showToast(status === "Approved" ? "Pengeluaran disetujui." : status === "Rejected" ? "Pengeluaran ditolak." : "Pengeluaran dikembalikan.");
  };

  const createInvoice = async (data: NewInvoice) => {
    if (isDemoMode) {
      const project = workspace.projects.find((item) => item.id === data.projectId);
      const item: Invoice = { id: `inv-${Date.now()}`, projectId: data.projectId, projectName: project?.name ?? "Proyek", number: data.number, dueDate: data.dueDate, amount: data.amount, paidAmount: 0, status: "Terkirim" };
      updateDemo({ ...workspace, invoices: [item, ...workspace.invoices] });
    } else await runAction("createInvoice", data);
    setModal(null); showToast("Invoice berhasil dicatat.");
  };

  const saveTemplate = async (template: DocumentTemplate) => {
    if (isDemoMode) {
      updateDemo({ ...workspace, templates: workspace.templates.map((item) => item.id === template.id ? { ...template, updatedAt: new Date().toISOString().slice(0, 10) } : item) });
    } else await runAction("saveTemplate", template);
    showToast("Template tersimpan sebagai versi terbaru.");
  };

  const createTemplate = async () => {
    const template: DocumentTemplate = { id: `tpl-${Date.now()}`, name: "Template baru", type: "Dokumen proyek", body: "JUDUL DOKUMEN\n\nIsi dokumen...\n\n{{project.name}}\n\nPihak Pertama,                         Pihak Kedua,\n\n\n(________________)                    (________________)", updatedAt: new Date().toISOString().slice(0, 10), companyName: "PT Karya Engineering", companyAddress: "Jakarta, Indonesia", footer: "Dokumen ini dibuat melalui KaryaFlow." };
    if (isDemoMode) updateDemo({ ...workspace, templates: [template, ...workspace.templates] });
    else await runAction("saveTemplate", template);
    setPage("templates");
    showToast("Template baru siap diedit.");
    return template;
  };

  const saveGeneratedDocument = async (payload: { projectId: string; templateId: string; title: string; content: string }) => {
    if (!isDemoMode) await runAction("saveGeneratedDocument", payload);
    showToast("Salinan dokumen proyek disimpan.");
  };

  const currentNav = navItems.find((item) => item.id === page);
  const pageTitle = currentNav?.label ?? "Ringkasan";

  return (
    <div className="app-shell">
      <div className={`mobile-backdrop ${mobileOpen ? "visible" : ""}`} onClick={() => setMobileOpen(false)} />
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Activity size={18} strokeWidth={2.7} /></div>
          <div className="brand-copy"><div className="brand-name">KaryaFlow</div><div className="brand-caption">Project operations</div></div>
        </div>
        <button className="workspace-picker" type="button">
          <span className="workspace-avatar">KE</span>
          <span className="workspace-copy"><strong>PT Karya Engineering</strong><small>Workspace utama</small></span>
          <ChevronDown size={14} />
        </button>
        <div className="nav-label">Workspace</div>
        <nav className="nav-list" aria-label="Navigasi utama">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button type="button" key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); setMobileOpen(false); }} aria-current={page === item.id ? "page" : undefined}>
              <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{item.count ? <small className="nav-count">{workspace.expenses.filter((expense) => expense.status === "Submitted").length}</small> : null}
            </button>;
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-help"><CircleHelp size={16} /><div><strong>Pusat bantuan</strong><p>Panduan singkat alur kerja proyek.</p></div></div>
        <div className="profile"><div className="profile-avatar">AD</div><div className="profile-info"><strong>Admin proyek</strong><small>Administrator</small></div><MoreHorizontal size={16} /></div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu size={18} /></button>
            <div className="crumb">Workspace <span> / </span> <strong>{pageTitle}</strong></div>
          </div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={15} /><input aria-label="Cari" placeholder="Cari proyek, dokumen, klien..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <span className="date-label">{new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date())}</span>
            <button className="icon-button" type="button" aria-label="Notifikasi" onClick={() => showToast("Tidak ada notifikasi baru.")}><Bell size={16} /><i className="notification-dot" /></button>
          </div>
        </header>

        <main className="page-container">
          <div className="demo-banner"><ShieldAlert size={15} /><span><strong>{isDemoMode ? "Mode demo" : "Prototipe tanpa login"}.</strong> {isDemoMode ? "Perubahan tersimpan di browser ini saja." : "Jangan masukkan dokumen atau informasi klien yang sensitif sampai autentikasi diaktifkan."}</span></div>
          {isLoading ? <div className="card empty-state"><Sparkles size={20} /><strong>Menyiapkan ruang kerja...</strong><p>Memuat proyek dan aktivitas terbaru.</p></div> : null}
          {!isLoading && page === "dashboard" ? <DashboardPage workspace={workspace} onNavigate={setPage} onCreate={() => setModal("project")} /> : null}
          {!isLoading && page === "projects" ? <ProjectsPage projects={workspace.projects} search={search} onCreate={() => setModal("project")} /> : null}
          {!isLoading && page === "opportunities" ? <OpportunitiesPage items={workspace.opportunities} search={search} onCreate={() => setModal("opportunity")} /> : null}
          {!isLoading && page === "expenses" ? <ExpensesPage items={workspace.expenses} search={search} onCreate={() => setModal("expense")} onReview={reviewExpense} /> : null}
          {!isLoading && page === "invoices" ? <InvoicesPage items={workspace.invoices} projects={workspace.projects} search={search} onCreate={() => setModal("invoice")} /> : null}
          {!isLoading && page === "documents" ? <DocumentsPage templates={workspace.templates} projects={workspace.projects} onGoTemplates={() => setPage("templates")} /> : null}
          {!isLoading && page === "templates" ? <TemplatesPage templates={workspace.templates} projects={workspace.projects} isDemoMode={isDemoMode} saving={saving} onCreate={createTemplate} onSave={saveTemplate} onGenerate={saveGeneratedDocument} showToast={showToast} /> : null}
        </main>
      </div>

      {modal === "project" ? <ProjectModal onClose={() => setModal(null)} onSave={createProject} saving={saving} /> : null}
      {modal === "opportunity" ? <OpportunityModal onClose={() => setModal(null)} onSave={createOpportunity} saving={saving} /> : null}
      {modal === "expense" ? <ExpenseModal projects={workspace.projects} isDemoMode={isDemoMode} onClose={() => setModal(null)} onSave={createExpense} saving={saving} /> : null}
      {modal === "invoice" ? <InvoiceModal projects={workspace.projects} onClose={() => setModal(null)} onSave={createInvoice} saving={saving} /> : null}
      {toast ? <div className="toast"><CircleCheck size={15} />{toast}</div> : null}
    </div>
  );
}

function PageHeading({ eyebrow, title, subtitle, action, secondary }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode; secondary?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div><div className="heading-actions">{secondary}{action}</div></div>;
}

function DashboardPage({ workspace, onNavigate, onCreate }: { workspace: WorkspaceData; onNavigate: (page: PageKey) => void; onCreate: () => void }) {
  const activeProjects = workspace.projects.filter((project) => !["Handover", "Closing"].includes(project.status));
  const contractTotal = workspace.projects.reduce((total, project) => total + project.contractValue, 0);
  const actualTotal = workspace.projects.reduce((total, project) => total + project.actualCost, 0);
  const receivable = workspace.invoices.reduce((total, invoice) => total + Math.max(invoice.amount - invoice.paidAmount, 0), 0);
  const attention = workspace.expenses.filter((expense) => expense.status === "Submitted");
  const overdue = workspace.invoices.filter((invoice) => invoice.paidAmount < invoice.amount && invoice.status.toLowerCase().includes("terlambat")).length;
  return <>
    <PageHeading eyebrow="Selasa, 20 Oktober 2026" title="Ringkasan proyek" subtitle="Pantau pekerjaan, biaya, dan tindak lanjut dalam satu ruang kerja." secondary={<button className="button secondary" type="button" onClick={() => onNavigate("projects")}><BriefcaseBusiness size={14} />Lihat proyek</button>} action={<button className="button" type="button" onClick={onCreate}><Plus size={15} />Buat proyek</button>} />
    <section className="stat-grid">
      <StatCard label="Proyek aktif" value={String(activeProjects.length).padStart(2, "0")} foot={<><span className="up">{workspace.projects.length} total</span><span>di seluruh tahap</span></>} icon={BriefcaseBusiness} />
      <StatCard label="Nilai kontrak aktif" value={formatCompact(contractTotal)} foot={<><span className="up">{workspace.projects.length} proyek</span><span>berjalan & serah terima</span></>} icon={TrendingUp} />
      <StatCard label="Biaya aktual disetujui" value={formatCompact(actualTotal)} foot={<><span className="up">{Math.round((actualTotal / workspace.projects.reduce((sum, project) => sum + project.internalBudget, 0)) * 100)}%</span><span>dari anggaran internal</span></>} icon={Wallet} tone="amber" />
      <StatCard label="Piutang berjalan" value={formatCompact(receivable)} foot={<><span className={overdue ? "warning" : "up"}>{overdue} terlambat</span><span>perlu ditindaklanjuti</span></>} icon={HandCoins} tone="blue" />
    </section>
    <div className="dashboard-grid">
      <div className="card chart-card"><div className="chart-head"><div><h2>Realisasi proyek</h2><p>Rencana progres dan aktual sepanjang periode berjalan</p></div><div className="chart-legend"><span className="legend-key"><i className="legend-dot" />Aktual</span><span className="legend-key"><i className="legend-dot actual" />Rencana</span></div></div>
        <div className="chart-wrap"><svg viewBox="0 0 700 195" role="img" aria-label="Grafik progres proyek kumulatif">
          <defs><linearGradient id="chartFade" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4d8c64" stopOpacity=".18" /><stop offset="100%" stopColor="#4d8c64" stopOpacity="0" /></linearGradient></defs>
          {[26, 66, 106, 146].map((y) => <line key={y} x1="49" x2="685" y1={y} y2={y} className="chart-gridline" />)}
          {["100%", "75%", "50%", "25%"].map((label, index) => <text key={label} x="1" y={30 + index * 40} className="chart-label">{label}</text>)}
          <path className="chart-area" d="M50 153 C100 145 112 132 155 125 S220 113 260 102 S329 85 365 74 S430 60 470 51 S548 39 588 30 S650 23 685 17 L685 160 L50 160 Z" />
          <path className="chart-secondary" d="M50 151 C105 139 117 132 155 119 S224 102 260 89 S328 74 365 61 S431 52 470 40 S541 31 588 24 S650 19 685 14" />
          <path className="chart-line" d="M50 153 C100 145 112 132 155 125 S220 113 260 102 S329 85 365 74 S430 60 470 51 S548 39 588 30 S650 23 685 17" />
          <circle cx="470" cy="51" r="4" fill="#fff" stroke="#397b58" strokeWidth="2" /><circle cx="685" cy="17" r="4" fill="#fff" stroke="#397b58" strokeWidth="2" />
          {["Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov"].map((month, index) => <text key={month} x={50 + index * 105} y="186" className="chart-label">{month}</text>)}
        </svg></div>
      </div>
      <div className="card attention-card"><div className="card-head"><div><h2>Perlu perhatian</h2><p>Tindakan yang masih tertunda</p></div><button className="icon-button" type="button" onClick={() => onNavigate("expenses")} aria-label="Buka pengeluaran"><MoreHorizontal size={16} /></button></div>
        <div className="attention-summary"><div className="attention-icon"><Clock3 size={16} /></div><div><strong>{attention.length} pengeluaran menunggu</strong><span>Nilai {formatIDR(attention.reduce((sum, expense) => sum + expense.amount, 0))}</span></div></div>
        <div className="attention-list">{attention.slice(0, 3).map((expense) => <div className="attention-row" key={expense.id}><div><strong>{expense.merchant}</strong><span>{expense.id} · {formatIDR(expense.amount)}</span></div><button className="row-action" type="button" aria-label={`Tinjau ${expense.id}`} onClick={() => onNavigate("expenses")}><ArrowRight size={13} /></button></div>)}</div>
        <div style={{ padding: "10px 17px 14px" }}><button className="text-link" type="button" onClick={() => onNavigate("expenses")}>Buka kotak persetujuan <ArrowRight size={12} /></button></div>
      </div>
    </div>
    <div className="lower-grid">
      <div className="card"><div className="card-head"><div><h2>Proyek berjalan</h2><p>Ringkasan kemajuan dan jadwal berikutnya</p></div><button className="text-link" type="button" onClick={() => onNavigate("projects")}>Semua proyek <ArrowRight size={12} /></button></div><ProjectTable projects={workspace.projects.slice(0, 4)} /></div>
      <div className="card"><div className="card-head"><div><h2>Aktivitas terbaru</h2><p>Perubahan terbaru pada workspace</p></div><button className="icon-button" type="button" aria-label="Lihat aktivitas"><MoreHorizontal size={16} /></button></div><ActivityList items={workspace.activities.slice(0, 4)} /></div>
    </div>
  </>;
}

function StatCard({ label, value, foot, icon: Icon, tone }: { label: string; value: string; foot: React.ReactNode; icon: LucideIcon; tone?: "amber" | "blue" }) {
  return <div className="card stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone ?? ""}`}><Icon size={15} /></span></div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></div>;
}

function ProjectTable({ projects }: { projects: Project[] }) {
  return <div className="table-wrap"><table><thead><tr><th>Proyek</th><th>Tahap</th><th>Progres</th><th>Target selesai</th></tr></thead><tbody>{projects.map((project) => <tr key={project.id}><td><div className="project-name"><span className={`project-badge ${project.color}`}>{initials(project.clientName)}</span><div><strong>{project.name}</strong><small>{project.code} · {project.clientName}</small></div></div></td><td><span className={`status-pill ${statusTone(project.status)}`}>{project.status}</span></td><td><Progress value={project.progress} color={project.color} /></td><td>{formatDate(project.dueDate)}</td></tr>)}</tbody></table></div>;
}

function Progress({ value, color }: { value: number; color?: string }) {
  return <div className="progress-cell"><div className="progress-meta"><span>{value}%</span><span>{value >= 90 ? "Hampir selesai" : "Berjalan"}</span></div><div className="progress-track"><div className={`progress-fill ${color ?? ""}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>;
}

function ActivityList({ items }: { items: ActivityItem[] }) {
  return <div className="activity-list">{items.map((item) => {
    const Icon = item.kind === "invoice" ? CircleDollarSign : item.kind === "expense" ? ReceiptText : item.kind === "document" ? FileText : Activity;
    return <div className="activity-item" key={item.id}><span className={`activity-icon ${item.kind}`}><Icon size={14} /></span><div className="activity-copy"><strong>{item.title}</strong><p>{item.detail}</p><time>{item.time}</time></div></div>;
  })}{items.length === 0 ? <EmptyState title="Belum ada aktivitas" description="Aktivitas proyek akan muncul di sini." /> : null}</div>;
}

function statusTone(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("progress") || normalized.includes("disetujui") || normalized.includes("lunas") || normalized.includes("handover")) return "green";
  if (normalized.includes("procurement") || normalized.includes("tunggu") || normalized.includes("survei") || normalized.includes("tempo") || normalized.includes("planning")) return "amber";
  if (normalized.includes("testing") || normalized.includes("dikirim") || normalized.includes("terkirim")) return "blue";
  if (normalized.includes("ditolak") || normalized.includes("terlambat")) return "red";
  return "";
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><FileStack size={21} /><strong>{title}</strong><p>{description}</p></div>;
}

function ProjectsPage({ projects, search, onCreate }: { projects: Project[]; search: string; onCreate: () => void }) {
  const [status, setStatus] = useState("Semua");
  const statuses = ["Semua", "Planning", "Procurement", "In progress", "Testing & commissioning", "Handover"];
  const filtered = projects.filter((project) => {
    const matchesSearch = `${project.name} ${project.clientName} ${project.code} ${project.siteName}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (status === "Semua" || project.status === status);
  });
  return <>
    <PageHeading eyebrow="Delivery" title="Proyek" subtitle="Pantau ruang lingkup, kemajuan, jadwal, dan biaya internal setiap proyek." action={<button className="button" type="button" onClick={onCreate}><Plus size={15} />Buat proyek</button>} />
    <div className="list-toolbar"><div className="filter-pills">{statuses.map((item) => <button key={item} className={`filter-pill ${status === item ? "active" : ""}`} type="button" onClick={() => setStatus(item)}>{item}</button>)}</div><span className="table-sub">{filtered.length} proyek ditemukan</span></div>
    <div className="card"><ProjectTable projects={filtered} />{filtered.length === 0 ? <EmptyState title="Belum ada proyek yang cocok" description="Ubah filter atau tambahkan proyek baru." /> : null}</div>
    <div className="lower-grid" style={{ marginTop: 14 }}>
      <div className="card"><div className="card-head"><div><h2>Kontrol anggaran</h2><p>Anggaran internal dibandingkan dengan biaya yang disetujui</p></div><span className="status-pill green">Biaya aktual</span></div>
        <div className="table-wrap"><table><thead><tr><th>Proyek</th><th>Anggaran</th><th>Aktual</th><th>Pending</th><th>Sisa</th></tr></thead><tbody>{filtered.map((project) => <tr key={project.id}><td><span className="table-title">{project.code}</span><span className="table-sub">{project.name}</span></td><td>{formatCompact(project.internalBudget)}</td><td className="amount">{formatCompact(project.actualCost)}</td><td className="amount-muted">{formatCompact(project.pendingCost)}</td><td className="amount">{formatCompact(project.internalBudget - project.actualCost)}</td></tr>)}</tbody></table></div>
      </div>
      <div className="card"><div className="card-head"><div><h2>Baseline biaya</h2><p>Aturan pencatatan pada workspace ini</p></div><CircleHelp size={15} color="#829087" /></div><div className="activity-list"><div className="capture-check"><Check size={15} /> Biaya pending belum masuk ke aktual.</div><div className="capture-check"><Check size={15} /> Overhead perusahaan dilaporkan terpisah.</div><div className="capture-check"><Check size={15} /> RAB klien tidak membuka rincian biaya internal.</div></div></div>
    </div>
  </>;
}

function OpportunitiesPage({ items, search, onCreate }: { items: Opportunity[]; search: string; onCreate: () => void }) {
  const [filter, setFilter] = useState("Semua");
  const filters = ["Semua", "Susun proposal", "Penawaran dikirim", "Survei lapangan"];
  const filtered = items.filter((item) => `${item.title} ${item.clientName} ${item.siteName}`.toLowerCase().includes(search.toLowerCase()) && (filter === "Semua" || item.status === filter));
  return <>
    <PageHeading eyebrow="Pipeline" title="Peluang & tender" subtitle="Kelola penawaran, survei pra-award, dan tindak lanjut klien." secondary={<button className="button secondary" type="button" onClick={() => setFilter("Penawaran dikirim")}><FileText size={14} />Penawaran dikirim</button>} action={<button className="button" type="button" onClick={onCreate}><Plus size={15} />Tambah peluang</button>} />
    <div className="list-toolbar"><div className="filter-pills">{filters.map((item) => <button key={item} className={`filter-pill ${filter === item ? "active" : ""}`} type="button" onClick={() => setFilter(item)}>{item}</button>)}</div><span className="table-sub">Estimasi pipeline {formatCompact(filtered.reduce((total, item) => total + item.value, 0))}</span></div>
    <div className="opportunity-grid">{filtered.map((item) => <div className="card opportunity-card" key={item.id}><div className="opportunity-card-top"><span className={`status-pill ${statusTone(item.status)}`}>{item.status}</span><button className="icon-button" type="button" aria-label="Opsi peluang"><MoreHorizontal size={15} /></button></div><h3>{item.title}</h3><p>{item.clientName}<br />{item.siteName}</p><div className="opportunity-value">{formatCompact(item.value)}</div><div className="opportunity-meta"><span><CalendarDays size={11} style={{ verticalAlign: "-2px", marginRight: 4 }} />Tenggat {formatDate(item.deadline)}</span><span>{item.owner}</span></div><div className="opportunity-card-footer"><span className="table-sub">Versi proposal 01</span><button className="text-link" type="button" onClick={() => onCreate()}>Buka <ArrowRight size={12} /></button></div></div>)}
      {filtered.length === 0 ? <div className="card" style={{ gridColumn: "1 / -1" }}><EmptyState title="Belum ada peluang" description="Tambahkan peluang atau tender baru untuk mulai menyusun proposal." /></div> : null}
    </div>
  </>;
}

function ExpensesPage({ items, search, onCreate, onReview }: { items: Expense[]; search: string; onCreate: () => void; onReview: (id: string, status: "Approved" | "Needs correction" | "Rejected") => void }) {
  const [filter, setFilter] = useState("Semua");
  const filters = ["Semua", "Menunggu persetujuan", "Disetujui", "Ditolak"];
  const filtered = items.filter((item) => {
    const statusLabel = item.status === "Submitted" ? "Menunggu persetujuan" : item.status === "Approved" ? "Disetujui" : item.status === "Rejected" ? "Ditolak" : "Perlu perbaikan";
    return `${item.id} ${item.merchant} ${item.projectName} ${item.category}`.toLowerCase().includes(search.toLowerCase()) && (filter === "Semua" || statusLabel === filter);
  });
  const pendingValue = items.filter((item) => item.status === "Submitted").reduce((sum, item) => sum + item.amount, 0);
  return <>
    <PageHeading eyebrow="Field capture" title="Pengeluaran" subtitle="Catat nota lapangan, periksa hasil OCR, lalu setujui biaya yang terverifikasi." secondary={<button className="button secondary" type="button" onClick={() => setFilter("Menunggu persetujuan")}><Clock3 size={14} />{items.filter((item) => item.status === "Submitted").length} menunggu</button>} action={<button className="button" type="button" onClick={onCreate}><Camera size={15} />Catat pengeluaran</button>} />
    <section className="stat-grid"><StatCard label="Total biaya aktual" value={formatCompact(items.filter((item) => item.scope === "project" && item.status === "Approved").reduce((sum, item) => sum + item.amount, 0))} foot={<><span className="up">Disetujui</span><span>terkait proyek</span></>} icon={Wallet} /><StatCard label="Menunggu persetujuan" value={formatCompact(pendingValue)} foot={<><span className="warning">{items.filter((item) => item.status === "Submitted").length} catatan</span><span>belum masuk biaya aktual</span></>} icon={Clock3} tone="amber" /><StatCard label="Menunggu reimburse" value={formatCompact(items.filter((item) => item.paidBy === "employee" && item.settlementStatus.toLowerCase().includes("menunggu") && item.status === "Approved").reduce((sum, item) => sum + item.amount, 0))} foot={<><span>Pengeluaran dibayar staf</span></>} icon={HandCoins} tone="blue" /><StatCard label="Overhead perusahaan" value={formatCompact(items.filter((item) => item.scope === "company_overhead" && item.status === "Approved").reduce((sum, item) => sum + item.amount, 0))} foot={<><span className="up">Dilaporkan terpisah</span><span>dari biaya proyek</span></>} icon={Building2} /></section>
    <div className="card"><div className="card-head"><div><h2>Daftar pengeluaran</h2><p>Rincian transaksi, bukti, dan status persetujuan</p></div><span className="status-pill green">Aktual hanya dari biaya disetujui</span></div><div className="list-toolbar" style={{ padding: "0 17px 12px" }}><div className="filter-pills">{filters.map((item) => <button key={item} className={`filter-pill ${filter === item ? "active" : ""}`} type="button" onClick={() => setFilter(item)}>{item}</button>)}</div><span className="table-sub">{filtered.length} transaksi</span></div>
      <div className="table-wrap"><table><thead><tr><th>Transaksi</th><th>Proyek / kategori</th><th>Tanggal</th><th>Nominal</th><th>Dibayar oleh</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><span className="table-title">{item.merchant}</span><span className="table-sub">{item.id} · {item.items.length} item nota</span></td><td><span className="table-title">{item.projectName}</span><span className="table-sub">{item.category}</span></td><td>{formatDate(item.date)}</td><td className="amount">{formatIDR(item.amount)}</td><td>{item.paidBy === "employee" ? "Karyawan" : "Perusahaan"}<span className="table-sub">{item.settlementStatus}</span></td><td><span className={`status-pill ${statusTone(item.status)}`}>{item.status === "Submitted" ? "Menunggu" : item.status === "Approved" ? "Disetujui" : item.status === "Rejected" ? "Ditolak" : "Perlu perbaikan"}</span></td><td>{item.status === "Submitted" ? <div className="inline-actions"><button className="row-action" title="Setujui" type="button" onClick={() => onReview(item.id, "Approved")}><Check size={13} /></button><button className="row-action" title="Minta perbaikan" type="button" onClick={() => onReview(item.id, "Needs correction")}><Pencil size={12} /></button><button className="row-action" title="Tolak" type="button" onClick={() => onReview(item.id, "Rejected")}><X size={13} /></button></div> : <button className="row-action" title="Lihat rincian" type="button"><ArrowRight size={13} /></button>}</td></tr>)}</tbody></table>{filtered.length === 0 ? <EmptyState title="Tidak ada transaksi" description="Catat pembelian lapangan agar masuk ke kontrol biaya proyek." /> : null}</div>
    </div>
  </>;
}

function InvoicesPage({ items, projects, search, onCreate }: { items: Invoice[]; projects: Project[]; search: string; onCreate: () => void }) {
  const filtered = items.filter((invoice) => `${invoice.number} ${invoice.projectName}`.toLowerCase().includes(search.toLowerCase()));
  const outstanding = filtered.reduce((sum, invoice) => sum + Math.max(invoice.amount - invoice.paidAmount, 0), 0);
  return <>
    <PageHeading eyebrow="Cash flow" title="Tagihan & pembayaran" subtitle="Pantau termin, invoice yang sudah dikirim, dan penerimaan dari klien." action={<button className="button" type="button" onClick={onCreate}><Plus size={15} />Catat invoice</button>} />
    <section className="stat-grid"><StatCard label="Piutang terbuka" value={formatCompact(outstanding)} foot={<><span className="warning">Belum diterima</span><span>dari klien</span></>} icon={HandCoins} tone="amber" /><StatCard label="Sudah ditagih" value={formatCompact(filtered.reduce((sum, invoice) => sum + invoice.amount, 0))} foot={<><span>{filtered.length} invoice</span><span>tercatat</span></>} icon={FileText} /><StatCard label="Diterima" value={formatCompact(filtered.reduce((sum, invoice) => sum + invoice.paidAmount, 0))} foot={<><span className="up">Pembayaran masuk</span></>} icon={CircleCheck} tone="blue" /><StatCard label="Termin proyek" value={String(projects.length * 3)} foot={<><span>DP · progres · retensi</span></>} icon={ListChecks} /></section>
    <div className="card"><div className="card-head"><div><h2>Invoice klien</h2><p>Pembayaran sebagian dicatat sebagai transaksi terpisah dan mengurangi saldo invoice.</p></div><button className="button secondary small" type="button" onClick={() => window.print()}><ArrowDownToLine size={13} />Ekspor daftar</button></div><div className="table-wrap"><table><thead><tr><th>Nomor invoice</th><th>Proyek</th><th>Jatuh tempo</th><th>Nilai invoice</th><th>Diterima</th><th>Sisa piutang</th><th>Status</th></tr></thead><tbody>{filtered.map((invoice) => <tr key={invoice.id}><td><span className="table-title">{invoice.number}</span><span className="table-sub">Invoice klien</span></td><td>{invoice.projectName}</td><td>{formatDate(invoice.dueDate)}</td><td>{formatIDR(invoice.amount)}</td><td>{formatIDR(invoice.paidAmount)}</td><td className="amount">{formatIDR(Math.max(invoice.amount - invoice.paidAmount, 0))}</td><td><span className={`status-pill ${statusTone(invoice.status)}`}>{invoice.status}</span></td></tr>)}</tbody></table>{filtered.length === 0 ? <EmptyState title="Belum ada invoice" description="Catat invoice DP, progres, atau pelunasan untuk memantau piutang." /> : null}</div></div>
  </>;
}

function DocumentsPage({ templates, projects, onGoTemplates }: { templates: DocumentTemplate[]; projects: Project[]; onGoTemplates: () => void }) {
  return <>
    <PageHeading eyebrow="Project records" title="Dokumen proyek" subtitle="Template perusahaan dan dokumen yang dihasilkan untuk setiap proyek." secondary={<button className="button secondary" type="button" onClick={onGoTemplates}><Settings2 size={14} />Kelola template</button>} action={<button className="button" type="button" onClick={onGoTemplates}><Plus size={15} />Buat dokumen</button>} />
    <div className="dashboard-grid">
      <div className="card"><div className="card-head"><div><h2>Template siap pakai</h2><p>Buat dokumen dengan data proyek terisi otomatis</p></div><button className="text-link" type="button" onClick={onGoTemplates}>Kelola <ArrowRight size={12} /></button></div><div className="activity-list">{templates.map((template) => <div className="activity-item" key={template.id}><span className="activity-icon"><FileText size={14} /></span><div className="activity-copy"><strong>{template.name}</strong><p>{template.type} · diperbarui {formatDate(template.updatedAt)}</p></div><button className="row-action" type="button" title="Buka template" onClick={onGoTemplates}><ArrowRight size={13} /></button></div>)}{templates.length === 0 ? <EmptyState title="Belum ada template" description="Siapkan format dokumen berulang untuk tim." /> : null}</div></div>
      <div className="card"><div className="card-head"><div><h2>Proyek membutuhkan dokumen</h2><p>Serah terima dan laporan proyek aktif</p></div><FileCheck2 size={16} color="#71907b" /></div><div className="activity-list">{projects.slice(0, 4).map((project) => <div className="activity-item" key={project.id}><span className={`project-badge ${project.color}`}>{initials(project.clientName)}</span><div className="activity-copy"><strong>{project.name}</strong><p>{project.code} · {project.nextMilestone}</p></div><span className={`status-pill ${statusTone(project.status)}`}>{project.status}</span></div>)}</div></div>
    </div>
    <div className="card" style={{ marginTop: 14 }}><div className="card-head"><div><h2>Catatan dokumen</h2><p>Dokumen hasil generate menyimpan versi template dan snapshot data proyek.</p></div><span className="status-pill green">Siap cetak / PDF</span></div><div className="activity-list"><div className="capture-check"><Check size={15} /> Edit isi salinan dokumen tanpa mengubah template utama.</div><div className="capture-check"><Check size={15} /> Preview halaman sebelum dicetak atau disimpan sebagai PDF.</div><div className="capture-check"><ShieldAlert size={15} /> Dokumen bertanda tangan digital belum diaktifkan pada tahap ini.</div></div></div>
  </>;
}

function TemplatesPage({ templates, projects, isDemoMode, saving, onCreate, onSave, onGenerate, showToast }: {
  templates: DocumentTemplate[]; projects: Project[]; isDemoMode: boolean; saving: boolean;
  onCreate: () => Promise<DocumentTemplate>; onSave: (template: DocumentTemplate) => Promise<void>;
  onGenerate: (payload: { projectId: string; templateId: string; title: string; content: string }) => Promise<void>;
  showToast: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const selected = templates.find((template) => template.id === selectedId) ?? templates[0];
  const [draftOverride, setDraftOverride] = useState<{ id: string; sourceUpdatedAt: string; value: DocumentTemplate } | null>(null);
  const draft = selected && draftOverride?.id === selected.id && draftOverride.sourceUpdatedAt === selected.updatedAt
    ? draftOverride.value
    : selected ?? null;
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [logoLoading, setLogoLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const updateDraft = (changes: Partial<DocumentTemplate>) => {
    if (!selected || !draft) return;
    setDraftOverride({ id: selected.id, sourceUpdatedAt: selected.updatedAt, value: { ...draft, ...changes } });
  };

  const project = projects.find((item) => item.id === projectId) ?? projects[0];
  const companyName = draft?.companyName || "PT Karya Engineering";
  const placeholderValues: Record<string, string> = {
    "company.name": companyName,
    "company.address": draft?.companyAddress || "Jakarta, Indonesia",
    "client.name": project?.clientName || "Nama klien",
    "client.contact": "Perwakilan klien",
    "site.address": project?.siteName || "Lokasi proyek",
    "project.code": project?.code || "PRJ-XXX",
    "project.name": project?.name || "Nama proyek",
    "project.manager_name": project?.manager || "Project manager",
    "project.start_date": "Tanggal mulai proyek",
    tanggal: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date()),
    "handover.notes": "Tidak ada catatan tambahan.",
    "survey.team": "Tim proyek",
    "survey.findings": "Lengkapi temuan survei.",
    "survey.next_steps": "Lengkapi tindak lanjut.",
    "progress.summary": "Lengkapi ringkasan progres.",
    "progress.issues": "Tidak ada kendala yang dilaporkan.",
    "period.start": "Tanggal awal",
    "period.end": "Tanggal akhir",
  };
  const previewBody = (draft?.body ?? "").replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, key: string) => placeholderValues[key] ?? "________________");

  const save = async () => {
    if (!draft) return;
    await onSave({ ...draft, updatedAt: new Date().toISOString().slice(0, 10) });
  };

  const uploadLogo = async (file?: File) => {
    if (!file || !draft) return;
    if (!file.type.startsWith("image/")) return showToast("Pilih file gambar untuk logo.");
    if (file.size > 12 * 1024 * 1024) return showToast("Ukuran logo sebelum kompresi maksimal 12 MB.");
    setLogoLoading(true);
    try {
      const optimized = await optimizeImage(file);
      if (optimized.size > 4 * 1024 * 1024) throw new Error("Logo masih terlalu besar setelah dioptimalkan.");
      let logoUrl: string;
      if (isDemoMode) logoUrl = await readAsDataUrl(optimized);
      else {
        const form = new FormData(); form.append("file", optimized); form.append("folder", "brand");
        const response = await fetch("/api/receipt", { method: "POST", body: form });
        const result = await response.json() as { path?: string; error?: string };
        if (!response.ok || !result.path) throw new Error(result.error || "Logo tidak berhasil diunggah.");
        logoUrl = result.path;
      }
      updateDraft({ logoUrl });
      showToast("Logo kop berhasil dimuat.");
    } catch (error) { showToast(error instanceof Error ? error.message : "Logo gagal diunggah."); }
    finally { setLogoLoading(false); }
  };

  const addNew = () => { void onCreate().then((created) => { setSelectedId(created.id); }); };
  const insertPlaceholder = (value: string) => {
    if (!draft) return;
    updateDraft({ body: `${draft.body}${draft.body.endsWith("\n") ? "" : "\n"}${value}` });
  };
  const generate = async () => {
    if (!draft || !project) return showToast("Tambahkan proyek sebelum membuat dokumen.");
    setGenerating(true);
    try {
      const title = `${draft.name} · ${project.code}`;
      await onGenerate({ projectId: project.id, templateId: draft.id, title, content: previewBody });
      window.print();
    } catch (error) { showToast(error instanceof Error ? error.message : "Dokumen belum berhasil dibuat."); }
    finally { setGenerating(false); }
  };

  return <>
    <PageHeading eyebrow="Document studio" title="Template dokumen" subtitle="Siapkan format perusahaan, isi data proyek otomatis, lalu cetak atau ekspor ke PDF." secondary={<button className="button secondary" type="button" onClick={addNew}><Plus size={14} />Template baru</button>} action={<button className="button" type="button" disabled={!draft || saving || generating} onClick={() => void generate()}><Printer size={14} />{generating ? "Menyiapkan..." : "Buat & cetak PDF"}</button>} />
    <div className="template-layout">
      <div className="card"><div className="card-head"><div><h2>Template</h2><p>{templates.length} format dokumen</p></div><FileStack size={15} color="#75847a" /></div><div className="template-list">{templates.map((template) => <button type="button" key={template.id} className={`template-select ${selectedId === template.id ? "active" : ""}`} onClick={() => setSelectedId(template.id)}><strong>{template.name}</strong><small>{template.type} · v1</small></button>)}{templates.length === 0 ? <EmptyState title="Template kosong" description="Buat template dokumen pertama." /> : null}</div></div>
      {draft ? <>
        <div className="card template-editor"><div className="card-head" style={{ padding: "0 0 14px" }}><div><h2>Pengaturan template</h2><p>Perubahan disimpan sebagai versi baru</p></div><span className="status-pill green">Terstruktur</span></div>
          <div className="field-grid"><div className="field"><label>Nama template</label><input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} /></div><div className="field"><label>Jenis dokumen</label><input value={draft.type} onChange={(event) => updateDraft({ type: event.target.value })} /></div></div>
          <div className="field-grid"><div className="field"><label>Nama perusahaan pada kop</label><input value={draft.companyName ?? ""} placeholder="PT Karya Engineering" onChange={(event) => updateDraft({ companyName: event.target.value })} /></div><div className="field"><label>Alamat / informasi kontak</label><input value={draft.companyAddress ?? ""} placeholder="Alamat perusahaan" onChange={(event) => updateDraft({ companyAddress: event.target.value })} /></div></div>
          <div className="field"><label>Logo kop surat</label><div style={{ display: "flex", gap: 8, alignItems: "center" }}><label className="button secondary small" style={{ cursor: "pointer" }}><Upload size={12} />{logoLoading ? "Mengunggah..." : "Pilih logo"}<input type="file" accept="image/*" hidden onChange={(event) => void uploadLogo(event.target.files?.[0])} /></label>{draft.logoUrl ? <><Image unoptimized src={assetUrl(draft.logoUrl)} alt="Logo perusahaan" width={35} height={35} style={{ width: 35, height: 35, objectFit: "contain", borderRadius: 6, border: "1px solid #e7ece8" }} /><button className="text-link" type="button" onClick={() => updateDraft({ logoUrl: "" })}>Hapus logo</button></> : <span className="field-hint">PNG, JPG, atau WebP · maksimal 8 MB</span>}</div></div>
          <div className="field"><label>Isi template</label><textarea value={draft.body} onChange={(event) => updateDraft({ body: event.target.value })} /><span className="field-hint">Gunakan placeholder di bawah agar data proyek terisi otomatis. Isi dokumen yang dibuat tetap dapat disunting terpisah.</span></div>
          <div className="field"><label>Footer</label><input value={draft.footer ?? ""} placeholder="Informasi footer / nomor halaman" onChange={(event) => updateDraft({ footer: event.target.value })} /></div>
          <div className="field"><label>Sisipkan data otomatis</label><div className="filter-pills">{["{{project.name}}", "{{client.name}}", "{{site.address}}", "{{project.code}}", "{{tanggal}}", "{{project.manager_name}}"].map((value) => <button className="filter-pill" type="button" key={value} onClick={() => insertPlaceholder(value)}>{value}</button>)}</div></div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="button" type="button" disabled={saving} onClick={() => void save()}><CheckCheck size={14} />{saving ? "Menyimpan..." : "Simpan template"}</button></div>
          <p className="muted-note">Editor mendukung teks, placeholder, logo/kop, tabel berbasis data, header/footer, dan blok tanda tangan dalam format terstruktur. Tanda tangan elektronik tersertifikasi belum diaktifkan.</p>
        </div>
        <div className="card template-preview-card"><div className="preview-toolbar"><span>Print preview · A4</span><span>Ruang kerja</span></div><div className="field"><label>Gunakan data proyek</label><select value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></div><div className="paper"><div className="paper-brand"><span className="paper-logo">{draft.logoUrl ? <Image unoptimized src={assetUrl(draft.logoUrl)} alt="" width={39} height={39} /> : initials(companyName)}</span><div><strong>{companyName}</strong><small>{draft.companyAddress || "Alamat perusahaan · kontak · email"}</small></div></div><div className="paper-content">{previewBody.split("\n").map((line, index) => <p key={`${index}-${line}`}>{line || " "}</p>)}</div><div className="paper-footer">{draft.footer || "Dokumen internal · KaryaFlow"}</div></div></div>
      </> : <div className="card"><EmptyState title="Belum ada template" description="Buat template pertama untuk dokumen proyek." /></div>}
    </div>
    {draft && project ? <div className="print-document" style={{ display: "none" }}><div className="paper"><div className="paper-brand"><span className="paper-logo">{draft.logoUrl ? <Image unoptimized src={assetUrl(draft.logoUrl)} alt="" width={39} height={39} /> : initials(companyName)}</span><div><strong>{companyName}</strong><small>{draft.companyAddress || "Alamat perusahaan · kontak · email"}</small></div></div><div className="paper-content">{previewBody.split("\n").map((line, index) => <p key={`print-${index}`}>{line || " "}</p>)}</div><div className="paper-footer">{draft.footer || "Dokumen internal · KaryaFlow"}</div></div></div> : null}
  </>;
}

function Modal({ title, subtitle, onClose, children, footer, wide }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode; wide?: boolean }) {
  return <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="modal-close" type="button" onClick={onClose} aria-label="Tutup"><X size={16} /></button></div>{children}<div className="modal-footer">{footer}</div></section></div>;
}

function ProjectModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (value: NewProject) => Promise<void>; saving: boolean }) {
  const [form, setForm] = useState({ name: "", clientName: "", siteName: "", contractValue: "", internalBudget: "", manager: "", dueDate: "" });
  const [error, setError] = useState("");
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    try { await onSave({ name: form.name, clientName: form.clientName, siteName: form.siteName, contractValue: safeNumber(form.contractValue), internalBudget: safeNumber(form.internalBudget), manager: form.manager, dueDate: form.dueDate }); }
    catch (e) { setError(e instanceof Error ? e.message : "Proyek gagal disimpan."); }
  };
  return <Modal title="Buat proyek baru" subtitle="Data ini menjadi dasar ruang kerja, anggaran, jadwal, dan dokumentasi proyek." onClose={onClose} footer={<><button className="button secondary" type="button" onClick={onClose}>Batal</button><button className="button" type="submit" form="project-form" disabled={saving}><Plus size={14} />{saving ? "Menyimpan..." : "Buat proyek"}</button></>}>
    <form id="project-form" className="modal-body" onSubmit={(event) => void submit(event)}>{error ? <div className="form-error">{error}</div> : null}<div className="field"><label>Nama proyek</label><input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Contoh: Instalasi genset 500 kVA" /></div><div className="field-grid"><div className="field"><label>Nama klien</label><input required value={form.clientName} onChange={(e) => update("clientName", e.target.value)} placeholder="PT ..." /></div><div className="field"><label>Lokasi/site</label><input required value={form.siteName} onChange={(e) => update("siteName", e.target.value)} placeholder="Nama lokasi dan kota" /></div></div><div className="field-grid"><div className="field"><label>Nilai kontrak (Rp)</label><input required inputMode="numeric" value={form.contractValue} onChange={(e) => update("contractValue", e.target.value)} placeholder="1.250.000.000" /></div><div className="field"><label>Anggaran internal (Rp)</label><input required inputMode="numeric" value={form.internalBudget} onChange={(e) => update("internalBudget", e.target.value)} placeholder="875.000.000" /></div></div><div className="field-grid"><div className="field"><label>Project manager</label><input required value={form.manager} onChange={(e) => update("manager", e.target.value)} placeholder="Nama PIC" /></div><div className="field"><label>Target selesai</label><input required type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} /></div></div><p className="muted-note">Harga kontrak klien dan anggaran internal disimpan terpisah. Anggaran internal tidak tampil pada dokumen untuk klien.</p></form>
  </Modal>;
}

function OpportunityModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (value: NewOpportunity) => Promise<void>; saving: boolean }) {
  const [form, setForm] = useState({ title: "", clientName: "", siteName: "", value: "", deadline: "", owner: "" });
  const [error, setError] = useState("");
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(""); try { await onSave({ title: form.title, clientName: form.clientName, siteName: form.siteName, value: safeNumber(form.value), deadline: form.deadline, owner: form.owner }); } catch (e) { setError(e instanceof Error ? e.message : "Peluang gagal disimpan."); } };
  return <Modal title="Tambah peluang" subtitle="Catat kebutuhan klien sebelum menjadi proyek aktif." onClose={onClose} footer={<><button className="button secondary" type="button" onClick={onClose}>Batal</button><button className="button" type="submit" form="opportunity-form" disabled={saving}><Plus size={14} />Simpan peluang</button></>}>
    <form id="opportunity-form" className="modal-body" onSubmit={(event) => void submit(event)}>{error ? <div className="form-error">{error}</div> : null}<div className="field"><label>Nama tender / pekerjaan</label><input required value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Contoh: Genset 800 kVA + ATS" /></div><div className="field-grid"><div className="field"><label>Klien</label><input required value={form.clientName} onChange={(e) => update("clientName", e.target.value)} placeholder="PT ..." /></div><div className="field"><label>Site</label><input required value={form.siteName} onChange={(e) => update("siteName", e.target.value)} placeholder="Lokasi pekerjaan" /></div></div><div className="field-grid"><div className="field"><label>Nilai estimasi (Rp)</label><input required inputMode="numeric" value={form.value} onChange={(e) => update("value", e.target.value)} placeholder="750.000.000" /></div><div className="field"><label>Tenggat penawaran</label><input required type="date" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} /></div></div><div className="field"><label>Penanggung jawab</label><input required value={form.owner} onChange={(e) => update("owner", e.target.value)} placeholder="Nama estimator" /></div></form>
  </Modal>;
}

function InvoiceModal({ projects, onClose, onSave, saving }: { projects: Project[]; onClose: () => void; onSave: (value: NewInvoice) => Promise<void>; saving: boolean }) {
  const [form, setForm] = useState({ projectId: projects[0]?.id ?? "", number: "", dueDate: "", amount: "" });
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(""); try { await onSave({ projectId: form.projectId, number: form.number, dueDate: form.dueDate, amount: safeNumber(form.amount) }); } catch (e) { setError(e instanceof Error ? e.message : "Invoice gagal disimpan."); } };
  return <Modal title="Catat invoice klien" subtitle="Pelacakan operasional invoice dan saldo pembayaran." onClose={onClose} footer={<><button className="button secondary" type="button" onClick={onClose}>Batal</button><button className="button" type="submit" form="invoice-form" disabled={saving}><Send size={14} />Simpan invoice</button></>}>
    <form id="invoice-form" className="modal-body" onSubmit={(event) => void submit(event)}>{error ? <div className="form-error">{error}</div> : null}<div className="field"><label>Proyek</label><select required value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>{projects.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</select></div><div className="field"><label>Nomor invoice</label><input required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="INV/026/10/005" /></div><div className="field-grid"><div className="field"><label>Nilai (Rp)</label><input required inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="128.000.000" /></div><div className="field"><label>Jatuh tempo</label><input required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div></div><p className="muted-note">MVP mencatat status dan saldo pembayaran; pembuatan e-faktur/akuntansi tidak termasuk.</p></form>
  </Modal>;
}

function parseMoney(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

function parseReceiptText(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const merchant = lines.find((line) => /[a-zA-Z]{3,}/.test(line) && !/^(invoice|receipt|struk|tanggal|date)$/i.test(line)) ?? "";
  const totalLine = lines.find((line) => /(grand\s*total|total\s*(belanja|amount|tagihan)?|jumlah\s*bayar|amount\s*paid)/i.test(line));
  const totalMatch = totalLine?.match(/(?:rp\.?\s*)?([0-9][0-9.,]{2,})/gi)?.at(-1) ?? "";
  const itemLines = lines.filter((line) => !/(total|subtotal|tax|pajak|change|kembali|cash|tunai|invoice|receipt|tanggal|date)/i.test(line));
  const items: ExpenseLine[] = [];
  for (const [index, line] of itemLines.entries()) {
    const amounts = [...line.matchAll(/(?:rp\.?\s*)?([0-9][0-9.,]{2,})/gi)];
    if (!amounts.length) continue;
    const amountMatch = amounts[amounts.length - 1];
    const unitPrice = parseMoney(amountMatch[1]);
    const description = line.replace(amountMatch[0], "").replace(/\s+/g, " ").replace(/[|:,-]+$/g, "").trim();
    if (!description || description.length < 2 || !unitPrice) continue;
    const quantityMatch = description.match(/^(.*?)\s+(\d+(?:[.,]\d+)?)\s*(pcs|pc|unit|m|kg|l|liter|box|roll)?\s*[x×]$/i);
    items.push({
      id: `ocr-${index}-${Date.now()}`, description: quantityMatch?.[1]?.trim() || description,
      quantity: quantityMatch ? Number(quantityMatch[2].replace(",", ".")) : 1,
      unit: quantityMatch?.[3] || "pcs", unitPrice, category: "Material / belanja",
    });
  }
  return { merchant, amount: parseMoney(totalMatch), items, rawText: text };
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Foto tidak dapat dibaca."));
    reader.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
    reader.readAsDataURL(file);
  });
}

async function optimizeImage(file: File) {
  if (!file.type.startsWith("image/") || typeof createImageBitmap === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    let quality = 0.86;
    let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    while (blob && blob.size > 3.8 * 1024 * 1024 && quality > 0.56) {
      quality -= 0.1;
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    }
    return blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg", lastModified: Date.now() }) : file;
  } catch { return file; }
}

function ExpenseModal({ projects, isDemoMode, onClose, onSave, saving }: { projects: Project[]; isDemoMode: boolean; onClose: () => void; onSave: (value: NewExpense) => Promise<void>; saving: boolean }) {
  const [scope, setScope] = useState<"project" | "company_overhead">("project");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Material / belanja");
  const [paidBy, setPaidBy] = useState<"company" | "employee">("employee");
  const [items, setItems] = useState<ExpenseLine[]>([{ id: "line-initial", description: "", quantity: 1, unit: "pcs", unitPrice: 0, category: "Material / belanja" }]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState("");
  const computedTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const processReceipt = async (selected?: File) => {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) { setError("Pilih foto nota dalam format gambar."); return; }
    if (selected.size > 12 * 1024 * 1024) { setError("Ukuran foto sebelum kompresi maksimal 12 MB."); return; }
    setError(""); setOcrLoading(true); setOcrStatus("Mengoptimalkan dan membaca nota…");
    try {
      const optimized = await optimizeImage(selected);
      if (optimized.size > 4 * 1024 * 1024) throw new Error("Foto masih terlalu besar setelah dioptimalkan. Pilih foto beresolusi lebih rendah.");
      setFile(optimized); setPreview(URL.createObjectURL(optimized));
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const result = await worker.recognize(optimized);
      await worker.terminate();
      const parsed = parseReceiptText(result.data.text);
      setOcrText(parsed.rawText);
      if (parsed.merchant && !merchant) setMerchant(parsed.merchant);
      if (parsed.amount) setAmount(String(parsed.amount));
      if (parsed.items.length) setItems(parsed.items);
      setOcrStatus(parsed.items.length ? `${parsed.items.length} baris terdeteksi · periksa kembali sebelum kirim` : "Teks terbaca · lengkapi baris barang secara manual");
    } catch (e) {
      console.error("OCR failed", e);
      setOcrStatus("OCR tidak berhasil · isi data secara manual");
    } finally { setOcrLoading(false); }
  };

  const updateItem = (id: string, key: keyof ExpenseLine, value: string) => setItems((current) => current.map((item) => item.id === id ? { ...item, [key]: key === "quantity" || key === "unitPrice" ? Number(value) || 0 : value } : item));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (!file) { setError("Foto nota atau invoice wajib dilampirkan."); return; }
    if (scope === "project" && !projectId) { setError("Pilih proyek untuk pengeluaran ini."); return; }
    if (!merchant.trim()) { setError("Nama toko atau pemasok perlu diisi."); return; }
    if (items.some((item) => !item.description.trim())) { setError("Lengkapi nama barang pada setiap baris."); return; }
    let receiptUrl = "";
    try {
      if (isDemoMode) receiptUrl = await readAsDataUrl(file);
      else {
        const formData = new FormData(); formData.append("file", file); formData.append("folder", "receipts");
        const response = await fetch("/api/receipt", { method: "POST", body: formData });
        const result = await response.json() as { path?: string; error?: string };
        if (!response.ok || !result.path) throw new Error(result.error || "Foto nota belum berhasil diunggah.");
        receiptUrl = result.path;
      }
      await onSave({ projectId: scope === "project" ? projectId : null, scope, merchant: merchant.trim(), date, amount: safeNumber(amount) || computedTotal, category, paidBy, settlementStatus: paidBy === "employee" ? "Menunggu reimburse" : "Dibayar perusahaan", receiptUrl, items: items.map((item) => ({ ...item, category })) });
    } catch (e) { setError(e instanceof Error ? e.message : "Pengeluaran gagal dikirim."); }
  };

  return <Modal title="Catat pengeluaran lapangan" subtitle="Ambil foto bukti, periksa hasil baca, lalu kirim untuk persetujuan." onClose={onClose} wide footer={<><button className="button secondary" type="button" onClick={onClose}>Batal</button><button className="button" type="submit" form="expense-form" disabled={saving || ocrLoading}><Send size={14} />{saving ? "Mengirim..." : "Kirim untuk persetujuan"}</button></>}>
    <form id="expense-form" className="modal-body" onSubmit={(event) => void submit(event)}><div className="mobile-capture"><div className="capture-card card" style={{ boxShadow: "none" }}>
      {error ? <div className="form-error">{error}</div> : null}
      <div className="field-grid"><div className="field"><label>Biaya untuk</label><select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}><option value="project">Proyek</option><option value="company_overhead">Overhead perusahaan</option></select></div>{scope === "project" ? <div className="field"><label>Pilih proyek</label><select value={projectId} onChange={(e) => setProjectId(e.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</select></div> : <div className="field"><label>Kategori overhead</label><select value={category} onChange={(e) => setCategory(e.target.value)}><option>Operasional kantor</option><option>Administrasi</option><option>Transportasi</option><option>Perangkat kerja</option></select></div>}</div>
      <label className="receipt-zone" style={{ padding: 15, cursor: "pointer" }}>
        {preview ? <Image unoptimized className="receipt-image" src={preview} alt="Pratinjau foto nota" width={480} height={320} /> : <><span className="stat-icon"><Camera size={18} /></span><strong>Ambil atau unggah foto nota</strong><span>Foto jelas dan tidak terpotong · maksimal 8 MB</span></>}
        <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => void processReceipt(e.target.files?.[0])} />
      </label>
      {ocrStatus ? <div className={`ocr-state ${ocrLoading ? "loading" : ""}`}>{ocrLoading ? <ScanLine size={13} /> : <Check size={13} />}{ocrStatus}</div> : null}
      {ocrText ? <details className="muted-note"><summary>Periksa teks OCR mentah</summary><pre style={{ whiteSpace: "pre-wrap", fontSize: 9 }}>{ocrText}</pre></details> : null}
      <div className="field-grid" style={{ marginTop: 12 }}><div className="field"><label>Toko / pemasok</label><input required value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Nama toko atau supplier" /></div><div className="field"><label>Tanggal transaksi</label><input required type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div></div>
      <div className="field-grid"><div className="field"><label>Kategori biaya</label><select value={category} onChange={(e) => setCategory(e.target.value)}><option>Material / belanja</option><option>Material elektrikal</option><option>Pekerjaan sipil</option><option>Transportasi & mobilisasi</option><option>Tenaga kerja</option><option>Konsumsi tim</option><option>Operasional kantor</option><option>Lainnya</option></select></div><div className="field"><label>Dibayar oleh</label><select value={paidBy} onChange={(e) => setPaidBy(e.target.value as typeof paidBy)}><option value="employee">Saya / karyawan (reimburse)</option><option value="company">Perusahaan</option></select></div></div>
      <div className="field"><label>Rincian barang pada nota</label><div className="line-items"><div className="line-items-head"><span>Nama barang</span><span>Qty</span><span>Satuan</span><span>Harga satuan</span><span /></div>{items.map((item) => <div className="line-item" key={item.id}><input required value={item.description} placeholder="Nama barang" onChange={(e) => updateItem(item.id, "description", e.target.value)} /><input aria-label="Jumlah" type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} /><input aria-label="Satuan" value={item.unit} onChange={(e) => updateItem(item.id, "unit", e.target.value)} /><input aria-label="Harga satuan" inputMode="numeric" value={item.unitPrice || ""} placeholder="0" onChange={(e) => updateItem(item.id, "unitPrice", String(safeNumber(e.target.value)))} /><button className="line-remove" type="button" onClick={() => setItems((current) => current.length > 1 ? current.filter((line) => line.id !== item.id) : current)} aria-label="Hapus barang"><Trash2 size={13} /></button></div>)}<div className="line-items-total"><button className="text-link" type="button" onClick={() => setItems((current) => [...current, { id: `line-${Date.now()}`, description: "", quantity: 1, unit: "pcs", unitPrice: 0, category }])}><Plus size={12} />Tambah baris</button><span>Subtotal item <strong>{formatIDR(computedTotal)}</strong></span></div></div></div>
      <div className="field-grid"><div className="field"><label>Total sesuai nota (Rp)</label><input required inputMode="numeric" value={amount} onChange={(e) => setAmount(String(safeNumber(e.target.value) || ""))} placeholder={String(computedTotal || "0")} /></div><div className="field"><label>Rekonsiliasi</label><div className="field-hint" style={{ paddingTop: 10 }}>{safeNumber(amount) && computedTotal && safeNumber(amount) !== computedTotal ? <span style={{ color: "#a8752b" }}>Total berbeda dari subtotal item. Pastikan pajak/diskon sudah diperhitungkan.</span> : "Jumlah item harus sesuai nilai nota sebelum dikirim."}</div></div></div>
      <p className="muted-note">OCR hanya mengisi usulan awal. Periksa nama barang, jumlah, dan nilai sebelum mengirim. Foto asli disimpan sebagai bukti.</p>
    </div><aside className="card capture-side"><h3>Sebelum kirim</h3><div className="capture-check"><Check size={14} />Pastikan foto nota menunjukkan tanggal dan nilai total.</div><div className="capture-check"><Check size={14} />Pilih kategori dan proyek yang benar.</div><div className="capture-check"><Check size={14} />Pengeluaran pending belum masuk ke biaya aktual.</div><div className="capture-check"><Check size={14} />Reimburse dicatat terpisah dari persetujuan biaya.</div><div style={{ marginTop: 16, padding: 12, borderRadius: 9, background: "#f5f8f5" }}><div className="eyebrow">Akan dikirim</div><strong style={{ display: "block", marginTop: 7, fontSize: 12 }}>{formatIDR(safeNumber(amount) || computedTotal)}</strong><span className="table-sub">{scope === "project" ? projects.find((project) => project.id === projectId)?.code : "Overhead perusahaan"} · {items.length} baris</span></div></aside></div></form>
  </Modal>;
}
