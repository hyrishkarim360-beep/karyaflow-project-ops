export type ProjectStatus =
  | "Planning"
  | "Procurement"
  | "In progress"
  | "Testing & commissioning"
  | "Handover"
  | "Closing"
  | "On hold";

export type ExpenseStatus = "Submitted" | "Needs correction" | "Approved" | "Rejected";

export type ExpenseLine = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  category: string;
};

export type Project = {
  id: string;
  code: string;
  name: string;
  clientName: string;
  siteName: string;
  status: ProjectStatus;
  progress: number;
  contractValue: number;
  internalBudget: number;
  actualCost: number;
  pendingCost: number;
  manager: string;
  dueDate: string;
  nextMilestone: string;
  color: string;
};

export type Opportunity = {
  id: string;
  title: string;
  clientName: string;
  siteName: string;
  value: number;
  status: string;
  deadline: string;
  owner: string;
};

export type Expense = {
  id: string;
  projectId: string | null;
  projectName: string;
  scope: "project" | "company_overhead";
  merchant: string;
  date: string;
  amount: number;
  category: string;
  paidBy: "company" | "employee";
  settlementStatus: string;
  status: ExpenseStatus;
  receiptUrl?: string;
  items: ExpenseLine[];
};

export type Invoice = {
  id: string;
  projectId: string;
  projectName: string;
  number: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
};

export type DocumentTemplate = {
  id: string;
  name: string;
  type: string;
  body: string;
  updatedAt: string;
  logoUrl?: string;
  companyName?: string;
  companyAddress?: string;
  footer?: string;
};

export type Activity = {
  id: string;
  title: string;
  detail: string;
  time: string;
  kind: "project" | "expense" | "invoice" | "document";
};

export type WorkspaceData = {
  projects: Project[];
  opportunities: Opportunity[];
  expenses: Expense[];
  invoices: Invoice[];
  templates: DocumentTemplate[];
  activities: Activity[];
};

