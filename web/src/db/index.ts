import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { demoWorkspace } from "@/lib/demo-data";

function connectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

function createDatabase() {
  const url = connectionString();
  if (!url) throw new Error("DATABASE_URL is not configured");
  return drizzle({ client: neon(url), schema });
}

type Database = ReturnType<typeof createDatabase>;
let dbInstance: Database | undefined;
let initialization: Promise<void> | undefined;

export function getDb() {
  if (!dbInstance) dbInstance = createDatabase();
  return dbInstance;
}

export function hasDatabase() {
  return Boolean(connectionString());
}

const statements = [
  `CREATE TABLE IF NOT EXISTS clients (
    id text PRIMARY KEY, name text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS opportunities (
    id text PRIMARY KEY, title text NOT NULL, client_id text REFERENCES clients(id), site_name text NOT NULL DEFAULT '',
    value numeric(16,2) NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'Susun proposal', deadline date,
    owner text NOT NULL DEFAULT 'Tim proyek', created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id text PRIMARY KEY, code text NOT NULL UNIQUE, name text NOT NULL, client_id text REFERENCES clients(id),
    site_name text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'Planning', progress integer NOT NULL DEFAULT 0,
    contract_value numeric(16,2) NOT NULL DEFAULT 0, internal_budget numeric(16,2) NOT NULL DEFAULT 0,
    manager text NOT NULL DEFAULT 'Tim proyek', due_date date, next_milestone text NOT NULL DEFAULT 'Belum ditentukan',
    color text NOT NULL DEFAULT 'sage', created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id text PRIMARY KEY, project_id text REFERENCES projects(id), scope text NOT NULL DEFAULT 'project',
    merchant text NOT NULL, receipt_number text, transaction_date date NOT NULL, total_amount numeric(16,2) NOT NULL,
    category text NOT NULL, payment_method text NOT NULL DEFAULT 'Cash', paid_by text NOT NULL DEFAULT 'company',
    settlement_status text NOT NULL DEFAULT 'Dibayar perusahaan', approval_status text NOT NULL DEFAULT 'Submitted',
    receipt_url text, submitted_by text NOT NULL DEFAULT 'Tim lapangan', approved_by text, approved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS expense_items (
    id text PRIMARY KEY, expense_id text NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    description text NOT NULL, quantity numeric(12,3) NOT NULL DEFAULT 1, unit text NOT NULL DEFAULT 'pcs',
    unit_price numeric(16,2) NOT NULL DEFAULT 0, category text NOT NULL DEFAULT 'Lainnya'
  )`,
  `CREATE TABLE IF NOT EXISTS invoices (
    id text PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), number text NOT NULL UNIQUE,
    due_date date NOT NULL, amount numeric(16,2) NOT NULL, paid_amount numeric(16,2) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'Draft', created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS document_templates (
    id text PRIMARY KEY, name text NOT NULL, type text NOT NULL, body text NOT NULL,
    logo_url text, company_name text, company_address text, footer text,
    version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS generated_documents (
    id text PRIMARY KEY, project_id text REFERENCES projects(id), template_id text REFERENCES document_templates(id),
    title text NOT NULL, content text NOT NULL, template_version integer NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'Draft', created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS activities (
    id text PRIMARY KEY, title text NOT NULL, detail text NOT NULL, kind text NOT NULL DEFAULT 'project',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
];

async function seedIfEmpty(db: Database) {
  const existing = await db.select({ id: schema.projects.id }).from(schema.projects).limit(1);
  if (existing.length) return;

  const clientNames = [...new Set([
    ...demoWorkspace.projects.map((item) => item.clientName),
    ...demoWorkspace.opportunities.map((item) => item.clientName),
  ])];
  const clientIdFor = (name: string) => `client-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

  await db.insert(schema.clients).values(clientNames.map((name) => ({ id: clientIdFor(name), name }))).onConflictDoNothing();
  await db.insert(schema.projects).values(demoWorkspace.projects.map((p) => ({
    id: p.id, code: p.code, name: p.name, clientId: clientIdFor(p.clientName), siteName: p.siteName,
    status: p.status, progress: p.progress, contractValue: p.contractValue, internalBudget: p.internalBudget,
    manager: p.manager, dueDate: p.dueDate, nextMilestone: p.nextMilestone, color: p.color,
  }))).onConflictDoNothing();
  await db.insert(schema.opportunities).values(demoWorkspace.opportunities.map((o) => ({
    id: o.id, title: o.title, clientId: clientIdFor(o.clientName), siteName: o.siteName,
    value: o.value, status: o.status, deadline: o.deadline, owner: o.owner,
  }))).onConflictDoNothing();

  for (const expense of demoWorkspace.expenses) {
    await db.insert(schema.expenses).values({
      id: expense.id, projectId: expense.projectId, scope: expense.scope, merchant: expense.merchant,
      transactionDate: expense.date, totalAmount: expense.amount, category: expense.category,
      paidBy: expense.paidBy, settlementStatus: expense.settlementStatus, approvalStatus: expense.status,
      receiptUrl: expense.receiptUrl || null, submittedBy: "Tim lapangan",
    }).onConflictDoNothing();
    if (expense.items.length) {
      await db.insert(schema.expenseItems).values(expense.items.map((item) => ({
        id: item.id, expenseId: expense.id, description: item.description, quantity: item.quantity,
        unit: item.unit, unitPrice: item.unitPrice, category: item.category,
      }))).onConflictDoNothing();
    }
  }

  await db.insert(schema.invoices).values(demoWorkspace.invoices.map((i) => ({
    id: i.id, projectId: i.projectId, number: i.number, dueDate: i.dueDate,
    amount: i.amount, paidAmount: i.paidAmount, status: i.status,
  }))).onConflictDoNothing();
  await db.insert(schema.documentTemplates).values(demoWorkspace.templates.map((t) => ({
    id: t.id, name: t.name, type: t.type, body: t.body, companyName: t.companyName,
    companyAddress: t.companyAddress, footer: t.footer, logoUrl: t.logoUrl,
  }))).onConflictDoNothing();
  await db.insert(schema.activities).values(demoWorkspace.activities.map((a) => ({
    id: a.id, title: a.title, detail: a.detail, kind: a.kind,
  }))).onConflictDoNothing();
}

export async function initializeDatabase() {
  if (!initialization) {
    initialization = (async () => {
      const db = getDb();
      for (const statement of statements) await db.execute(sql.raw(statement));
      await seedIfEmpty(db);
    })().catch((error) => {
      initialization = undefined;
      throw error;
    });
  }
  await initialization;
}

