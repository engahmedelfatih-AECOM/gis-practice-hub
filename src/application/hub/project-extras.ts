import "server-only";
import { and, asc, eq, max } from "drizzle-orm";
import { z } from "zod";
import { uuidSchema } from "@/domain/shared/schema";
import { db } from "@/infrastructure/db/client";
import { enterpriseApp, project, workflowStep } from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";
import { writeAudit } from "@/application/audit/audit";
import { notFound } from "@/application/errors";
import { assertCan, parseInput } from "@/application/shared/guard";
import { withTx } from "@/application/shared/service";
import { createDefaultWorkflow } from "./registers";

const stepInput = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1).max(200),
  status: z.enum(["Completed", "In Progress", "Not Started"]),
});

/** Rename a workflow step or set its status (the band at the foot of the update page). */
export async function updateWorkflowStep(actor: Actor, raw: unknown): Promise<void> {
  assertCan(actor, "workflow:manage");
  const input = parseInput(stepInput, raw);
  await withTx(async (tx) => {
    const [before] = await tx.select().from(workflowStep).where(eq(workflowStep.id, input.id));
    if (!before) throw notFound("Workflow step");
    const [after] = await tx.update(workflowStep).set({ name: input.name, status: input.status }).where(eq(workflowStep.id, input.id)).returning();
    await writeAudit(tx, actor, { action: "workflow.update", entityType: "workflow_step", entityId: input.id, before, after });
  });
}

export async function addWorkflowStep(actor: Actor, raw: unknown): Promise<void> {
  assertCan(actor, "workflow:manage");
  const input = parseInput(z.object({ projectId: uuidSchema, name: z.string().trim().min(1).max(200) }), raw);
  await withTx(async (tx) => {
    const [m] = await tx.select({ n: max(workflowStep.stepNo) }).from(workflowStep).where(eq(workflowStep.projectId, input.projectId));
    const [row] = await tx.insert(workflowStep).values({ projectId: input.projectId, stepNo: (m?.n ?? 0) + 1, name: input.name }).returning();
    await writeAudit(tx, actor, { action: "workflow.add", entityType: "workflow_step", entityId: row!.id, after: row });
  });
}

/** Remove a step and renumber the rest so the circles stay 1..n. */
export async function removeWorkflowStep(actor: Actor, rawId: unknown): Promise<void> {
  assertCan(actor, "workflow:manage");
  const id = parseInput(uuidSchema, rawId);
  await withTx(async (tx) => {
    const [before] = await tx.select().from(workflowStep).where(eq(workflowStep.id, id));
    if (!before) throw notFound("Workflow step");
    await tx.delete(workflowStep).where(eq(workflowStep.id, id));
    const rest = await tx.select().from(workflowStep).where(eq(workflowStep.projectId, before.projectId)).orderBy(asc(workflowStep.stepNo));
    for (let i = 0; i < rest.length; i++) {
      if (rest[i]!.stepNo !== i + 1) await tx.update(workflowStep).set({ stepNo: -(i + 1) }).where(eq(workflowStep.id, rest[i]!.id));
    }
    for (const r of rest) {
      const [cur] = await tx.select({ n: workflowStep.stepNo }).from(workflowStep).where(eq(workflowStep.id, r.id));
      if (cur && cur.n < 0) await tx.update(workflowStep).set({ stepNo: -cur.n }).where(eq(workflowStep.id, r.id));
    }
    await writeAudit(tx, actor, { action: "workflow.remove", entityType: "workflow_step", entityId: id, before });
  });
}

/** Reset a project's workflow to the default AECOM steps. */
export async function resetWorkflow(actor: Actor, rawProjectId: unknown): Promise<void> {
  assertCan(actor, "workflow:manage");
  const projectId = parseInput(uuidSchema, rawProjectId);
  await withTx(async (tx) => {
    const [p] = await tx.select({ id: project.id }).from(project).where(eq(project.id, projectId));
    if (!p) throw notFound("Project");
    await tx.delete(workflowStep).where(eq(workflowStep.projectId, projectId));
    await createDefaultWorkflow(tx, projectId);
    await writeAudit(tx, actor, { action: "workflow.reset", entityType: "project", entityId: projectId });
  });
}

const appInput = z.object({
  projectId: uuidSchema,
  name: z.string().trim().min(1).max(200),
  url: z.string().trim().max(2000).optional().or(z.literal("")).transform((s) => (s ? s : null)),
});

/** GIS Enterprise Applications box of the update page. */
export async function addEnterpriseApp(actor: Actor, raw: unknown): Promise<void> {
  assertCan(actor, "workflow:manage");
  const input = parseInput(appInput, raw);
  await withTx(async (tx) => {
    const [m] = await tx.select({ n: max(enterpriseApp.sortOrder) }).from(enterpriseApp).where(eq(enterpriseApp.projectId, input.projectId));
    const [row] = await tx.insert(enterpriseApp).values({ ...input, sortOrder: (m?.n ?? 0) + 1 }).returning();
    await writeAudit(tx, actor, { action: "app.add", entityType: "enterprise_app", entityId: row!.id, after: row });
  });
}

export async function removeEnterpriseApp(actor: Actor, rawId: unknown): Promise<void> {
  assertCan(actor, "workflow:manage");
  const id = parseInput(uuidSchema, rawId);
  await withTx(async (tx) => {
    const [before] = await tx.select().from(enterpriseApp).where(and(eq(enterpriseApp.id, id)));
    if (!before) throw notFound("Application");
    await tx.delete(enterpriseApp).where(eq(enterpriseApp.id, id));
    await writeAudit(tx, actor, { action: "app.remove", entityType: "enterprise_app", entityId: id, before });
  });
}

export async function listProjectsBrief(): Promise<{ id: string; name: string }[]> {
  return db.select({ id: project.id, name: project.name }).from(project).orderBy(asc(project.sortOrder), asc(project.name));
}
