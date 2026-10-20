import {
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const opportunities = pgTable("opportunities", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  clientId: text("client_id").references(() => clients.id),
  siteName: text("site_name").notNull().default(""),
  value: numeric("value", { precision: 16, scale: 2, mode: "number" }).notNull().default(0),
  status: text("status").notNull().default("Susun proposal"),
  deadline: date("deadline", { mode: "string" }),
  owner: text("owner").notNull().default("Tim proyek"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  clientId: text("client_id").references(() => clients.id),
  siteName: text("site_name").notNull().default(""),
  status: text("status").notNull().default("Planning"),
  progress: integer("progress").notNull().default(0),
  contractValue: numeric("contract_value", { precision: 16, scale: 2, mode: "number" }).notNull().default(0),
  internalBudget: numeric("internal_budget", { precision: 16, scale: 2, mode: "number" }).notNull().default(0),
  manager: text("manager").notNull().default("Tim proyek"),
  dueDate: date("due_date", { mode: "string" }),
  nextMilestone: text("next_milestone").notNull().default("Belum ditentukan"),
  color: text("color").notNull().default("sage"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id),
  scope: text("scope").notNull().default("project"),
  merchant: text("merchant").notNull(),
  receiptNumber: text("receipt_number"),
  transactionDate: date("transaction_date", { mode: "string" }).notNull(),
  totalAmount: numeric("total_amount", { precision: 16, scale: 2, mode: "number" }).notNull(),
  category: text("category").notNull(),
  paymentMethod: text("payment_method").notNull().default("Cash"),
  paidBy: text("paid_by").notNull().default("company"),
  settlementStatus: text("settlement_status").notNull().default("Dibayar perusahaan"),
  approvalStatus: text("approval_status").notNull().default("Submitted"),
  receiptUrl: text("receipt_url"),
  submittedBy: text("submitted_by").notNull().default("Tim lapangan"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const expenseItems = pgTable("expense_items", {
  id: text("id").primaryKey(),
  expenseId: text("expense_id").notNull().references(() => expenses.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }).notNull().default(1),
  unit: text("unit").notNull().default("pcs"),
  unitPrice: numeric("unit_price", { precision: 16, scale: 2, mode: "number" }).notNull().default(0),
  category: text("category").notNull().default("Lainnya"),
});

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  number: text("number").notNull().unique(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  amount: numeric("amount", { precision: 16, scale: 2, mode: "number" }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 16, scale: 2, mode: "number" }).notNull().default(0),
  status: text("status").notNull().default("Draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const documentTemplates = pgTable("document_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  body: text("body").notNull(),
  logoUrl: text("logo_url"),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  footer: text("footer"),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const generatedDocuments = pgTable("generated_documents", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id),
  templateId: text("template_id").references(() => documentTemplates.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  templateVersion: integer("template_version").notNull().default(1),
  status: text("status").notNull().default("Draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  kind: text("kind").notNull().default("project"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

