import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { demoWorkspace } from "@/lib/demo-data";
import { activities, clients, documentTemplates, expenses, expenseItems, generatedDocuments, invoices, opportunities, projects } from "@/db/schema";
import { getDb, hasDatabase, initializeDatabase } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const newId = () => crypto.randomUUID();
const safeClientId = (name: string) => `client-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

async function logActivity(title: string, detail: string, kind: string) {
  const db = getDb();
  await db.insert(activities).values({ id: newId(), title, detail, kind });
}

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({ isDemoMode: true, workspace: demoWorkspace }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    await initializeDatabase();
    const db = getDb();
    const [clientRows, projectRows, opportunityRows, expenseRows, itemRows, invoiceRows, templateRows, activityRows] = await Promise.all([
      db.select().from(clients),
      db.select().from(projects),
      db.select().from(opportunities).orderBy(desc(opportunities.createdAt)),
      db.select().from(expenses).orderBy(desc(expenses.createdAt)),
      db.select().from(expenseItems),
      db.select().from(invoices).orderBy(desc(invoices.createdAt)),
      db.select().from(documentTemplates).orderBy(desc(documentTemplates.updatedAt)),
      db.select().from(activities).orderBy(desc(activities.createdAt)).limit(12),
    ]);

    const clientName = new Map(clientRows.map((client) => [client.id, client.name]));
    const lineItems = new Map<string, typeof itemRows>();
    for (const item of itemRows) lineItems.set(item.expenseId, [...(lineItems.get(item.expenseId) ?? []), item]);
    const costs = new Map<string, { actual: number; pending: number }>();
    for (const expense of expenseRows) {
      if (!expense.projectId || expense.scope !== "project") continue;
      const row = costs.get(expense.projectId) ?? { actual: 0, pending: 0 };
      if (expense.approvalStatus === "Approved") row.actual += Number(expense.totalAmount);
      else if (expense.approvalStatus === "Submitted" || expense.approvalStatus === "Needs correction") row.pending += Number(expense.totalAmount);
      costs.set(expense.projectId, row);
    }

    const workspace = {
      projects: projectRows.map((project) => ({
        ...project,
        clientName: project.clientId ? clientName.get(project.clientId) ?? "Klien belum ditentukan" : "Klien belum ditentukan",
        contractValue: Number(project.contractValue),
        internalBudget: Number(project.internalBudget),
        actualCost: costs.get(project.id)?.actual ?? 0,
        pendingCost: costs.get(project.id)?.pending ?? 0,
      })),
      opportunities: opportunityRows.map((opportunity) => ({
        ...opportunity,
        clientName: opportunity.clientId ? clientName.get(opportunity.clientId) ?? "Klien baru" : "Klien baru",
        value: Number(opportunity.value),
      })),
      expenses: expenseRows.map((expense) => ({
        ...expense,
        projectName: expense.projectId ? projectRows.find((project) => project.id === expense.projectId)?.name ?? "Proyek" : "Overhead perusahaan",
        date: expense.transactionDate,
        amount: Number(expense.totalAmount),
        category: expense.category,
        paidBy: expense.paidBy,
        settlementStatus: expense.settlementStatus,
        status: expense.approvalStatus,
        items: (lineItems.get(expense.id) ?? []).map((item) => ({
          id: item.id, description: item.description, quantity: Number(item.quantity), unit: item.unit,
          unitPrice: Number(item.unitPrice), category: item.category,
        })),
      })),
      invoices: invoiceRows.map((invoice) => ({
        ...invoice,
        projectName: projectRows.find((project) => project.id === invoice.projectId)?.name ?? "Proyek",
        amount: Number(invoice.amount),
        paidAmount: Number(invoice.paidAmount),
      })),
      templates: templateRows,
      activities: activityRows.map((activity) => ({ ...activity, time: new Date(activity.createdAt).toLocaleString("id-ID"), kind: activity.kind })),
    };

    return NextResponse.json({ isDemoMode: false, workspace }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Workspace load failed", error);
    return NextResponse.json({ error: "Database belum siap. Periksa koneksi Neon dan skema." }, { status: 503 });
  }
}

const projectSchema = z.object({
  name: z.string().min(2), clientName: z.string().min(2), siteName: z.string().min(2),
  contractValue: z.number().nonnegative(), internalBudget: z.number().nonnegative(),
  manager: z.string().min(2), dueDate: z.string(),
});
const opportunitySchema = z.object({
  title: z.string().min(2), clientName: z.string().min(2), siteName: z.string().min(2),
  value: z.number().nonnegative(), deadline: z.string(), owner: z.string().min(2),
});
const expenseSchema = z.object({
  projectId: z.string().nullable(), scope: z.enum(["project", "company_overhead"]), merchant: z.string().min(2),
  date: z.string(), amount: z.number().positive(), category: z.string().min(2),
  paidBy: z.enum(["company", "employee"]), settlementStatus: z.string(), receiptUrl: z.string().optional(),
  items: z.array(z.object({ description: z.string().min(1), quantity: z.number().positive(), unit: z.string(), unitPrice: z.number().nonnegative(), category: z.string() })).min(1),
});
const invoiceSchema = z.object({ projectId: z.string(), number: z.string().min(3), dueDate: z.string(), amount: z.number().positive() });
const templateSchema = z.object({
  id: z.string().optional(), name: z.string().min(3), type: z.string().min(2), body: z.string().min(10),
  logoUrl: z.string().optional(), companyName: z.string().optional(), companyAddress: z.string().optional(), footer: z.string().optional(),
});

export async function POST(request: Request) {
  if (!hasDatabase()) return NextResponse.json({ error: "Aksi tersimpan lokal di mode demo. Neon belum terhubung." }, { status: 409 });
  try {
    await initializeDatabase();
    const db = getDb();
    const body = await request.json() as { action?: string; payload?: unknown };

    if (body.action === "createProject") {
      const parsed = projectSchema.safeParse(body.payload);
      if (!parsed.success) return NextResponse.json({ error: "Data proyek belum lengkap." }, { status: 400 });
      const value = parsed.data;
      const clientId = safeClientId(value.clientName);
      await db.insert(clients).values({ id: clientId, name: value.clientName }).onConflictDoNothing();
      const id = newId();
      const code = `PRJ-${String(Date.now()).slice(-3)}`;
      await db.insert(projects).values({
        id, code, name: value.name, clientId, siteName: value.siteName, status: "Planning", progress: 0,
        contractValue: value.contractValue, internalBudget: value.internalBudget, manager: value.manager,
        dueDate: value.dueDate, nextMilestone: "Kickoff proyek", color: "sage",
      });
      await logActivity("Proyek dibuat", `${code} · ${value.name}`, "project");
      return NextResponse.json({ id, code }, { status: 201 });
    }

    if (body.action === "createOpportunity") {
      const parsed = opportunitySchema.safeParse(body.payload);
      if (!parsed.success) return NextResponse.json({ error: "Data peluang belum lengkap." }, { status: 400 });
      const value = parsed.data;
      const clientId = safeClientId(value.clientName);
      await db.insert(clients).values({ id: clientId, name: value.clientName }).onConflictDoNothing();
      const id = newId();
      await db.insert(opportunities).values({
        id, title: value.title, clientId, siteName: value.siteName, value: value.value,
        status: "Susun proposal", deadline: value.deadline, owner: value.owner,
      });
      await logActivity("Peluang baru ditambahkan", `${value.title} · ${value.clientName}`, "project");
      return NextResponse.json({ id }, { status: 201 });
    }

    if (body.action === "createExpense") {
      const parsed = expenseSchema.safeParse(body.payload);
      if (!parsed.success) return NextResponse.json({ error: "Periksa kembali rincian pengeluaran." }, { status: 400 });
      const value = parsed.data;
      if (value.scope === "project" && !value.projectId) return NextResponse.json({ error: "Pilih proyek untuk biaya proyek." }, { status: 400 });
      const id = `EXP-${String(Date.now()).slice(-6)}`;
      const approvalStatus = "Submitted";
      await db.insert(expenses).values({
        id, projectId: value.scope === "project" ? value.projectId : null, scope: value.scope,
        merchant: value.merchant, transactionDate: value.date, totalAmount: value.amount,
        category: value.category, paidBy: value.paidBy, settlementStatus: value.settlementStatus,
        approvalStatus, receiptUrl: value.receiptUrl || null, submittedBy: "Tim lapangan",
      });
      await db.insert(expenseItems).values(value.items.map((item) => ({ ...item, id: newId(), expenseId: id })));
      await logActivity("Pengeluaran dikirim untuk persetujuan", `${id} · ${value.merchant}`, "expense");
      return NextResponse.json({ id }, { status: 201 });
    }

    if (body.action === "reviewExpense") {
      const payload = z.object({ id: z.string(), status: z.enum(["Approved", "Needs correction", "Rejected"]) }).safeParse(body.payload);
      if (!payload.success) return NextResponse.json({ error: "Status persetujuan tidak valid." }, { status: 400 });
      await db.update(expenses).set({
        approvalStatus: payload.data.status,
        approvedBy: payload.data.status === "Approved" ? "Admin proyek" : null,
        approvedAt: payload.data.status === "Approved" ? new Date() : null,
      }).where(eq(expenses.id, payload.data.id));
      await logActivity(`Pengeluaran ${payload.data.status === "Approved" ? "disetujui" : payload.data.status === "Rejected" ? "ditolak" : "dikembalikan"}`, payload.data.id, "expense");
      return NextResponse.json({ ok: true });
    }

    if (body.action === "createInvoice") {
      const parsed = invoiceSchema.safeParse(body.payload);
      if (!parsed.success) return NextResponse.json({ error: "Data invoice belum lengkap." }, { status: 400 });
      const id = newId();
      await db.insert(invoices).values({ ...parsed.data, id, paidAmount: 0, status: "Terkirim" });
      await logActivity("Invoice diterbitkan", `${parsed.data.number} · ${parsed.data.projectId}`, "invoice");
      return NextResponse.json({ id }, { status: 201 });
    }

    if (body.action === "saveTemplate") {
      const parsed = templateSchema.safeParse(body.payload);
      if (!parsed.success) return NextResponse.json({ error: "Template perlu nama, tipe, dan isi." }, { status: 400 });
      const id = parsed.data.id ?? newId();
      const [existing] = await db.select().from(documentTemplates).where(eq(documentTemplates.id, id)).limit(1);
      if (existing) {
        await db.update(documentTemplates).set({
          name: parsed.data.name, type: parsed.data.type, body: parsed.data.body, logoUrl: parsed.data.logoUrl,
          companyName: parsed.data.companyName, companyAddress: parsed.data.companyAddress, footer: parsed.data.footer,
          version: existing.version + 1, updatedAt: new Date(),
        }).where(eq(documentTemplates.id, id));
      } else {
        await db.insert(documentTemplates).values({ ...parsed.data, id, version: 1 });
      }
      await logActivity("Template dokumen disimpan", parsed.data.name, "document");
      return NextResponse.json({ id });
    }

    if (body.action === "saveGeneratedDocument") {
      const parsed = z.object({ projectId: z.string(), templateId: z.string(), title: z.string(), content: z.string() }).safeParse(body.payload);
      if (!parsed.success) return NextResponse.json({ error: "Dokumen belum lengkap." }, { status: 400 });
      const [template] = await db.select().from(documentTemplates).where(eq(documentTemplates.id, parsed.data.templateId)).limit(1);
      const id = newId();
      await db.insert(generatedDocuments).values({ ...parsed.data, id, templateVersion: template?.version ?? 1, status: "Draft" });
      await logActivity("Dokumen proyek dibuat dari template", parsed.data.title, "document");
      return NextResponse.json({ id }, { status: 201 });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (error) {
    console.error("Workspace mutation failed", error);
    return NextResponse.json({ error: "Perubahan belum tersimpan. Coba lagi sebentar." }, { status: 500 });
  }
}

