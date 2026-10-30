import "server-only";
import { asc, count, eq, and } from "drizzle-orm";
import { z } from "zod";
import { uuidSchema } from "@/domain/shared/schema";
import { db } from "@/infrastructure/db/client";
import { clientDomain, clientFeatureClass, clientField, clientSchema, clientSubtype } from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";
import { writeAudit } from "@/application/audit/audit";
import { notFound } from "@/application/errors";
import { assertCan, parseInput } from "@/application/shared/guard";
import { updateVersioned, withTx } from "@/application/shared/service";

export interface ClientSchemaView {
  id: string;
  clientName: string;
  gisLead: string | null;
  schemaVersion: string | null;
  notes: string | null;
  featureClasses: number;
  available: number;
  unavailable: number;
  partial: number;
  approved: number;
  fields: number;
  subtypes: number;
  domains: number;
}

/** The client schemas (one Master Tracker workbook each) with their KPI tiles. */
export async function listClientSchemas(actor: Actor): Promise<ClientSchemaView[]> {
  assertCan(actor, "hub:read");
  const schemas = await db.select().from(clientSchema).orderBy(asc(clientSchema.clientName));
  const out: ClientSchemaView[] = [];
  for (const s of schemas) {
    const fcs = await db.select({ availability: clientFeatureClass.availability, status: clientFeatureClass.status }).from(clientFeatureClass).where(eq(clientFeatureClass.clientSchemaId, s.id));
    const n = async (t: typeof clientField | typeof clientSubtype | typeof clientDomain) => (await db.select({ n: count() }).from(t).where(eq(t.clientSchemaId, s.id)))[0]?.n ?? 0;
    out.push({
      id: s.id,
      clientName: s.clientName,
      gisLead: s.gisLead,
      schemaVersion: s.schemaVersion,
      notes: s.notes,
      featureClasses: fcs.length,
      available: fcs.filter((f) => f.availability === "Available").length,
      unavailable: fcs.filter((f) => f.availability === "Unavailable").length,
      partial: fcs.filter((f) => f.availability === "Partial").length,
      approved: fcs.filter((f) => f.status === "Approved").length,
      fields: await n(clientField),
      subtypes: await n(clientSubtype),
      domains: await n(clientDomain),
    });
  }
  return out;
}

export async function getClientSchema(actor: Actor, id: string) {
  assertCan(actor, "hub:read");
  const [s] = await db.select().from(clientSchema).where(eq(clientSchema.id, parseInput(uuidSchema, id)));
  if (!s) throw notFound("Client schema");
  const [featureClasses, fields, subtypes, domains] = await Promise.all([
    db.select().from(clientFeatureClass).where(eq(clientFeatureClass.clientSchemaId, s.id)).orderBy(asc(clientFeatureClass.sortOrder)),
    db.select().from(clientField).where(eq(clientField.clientSchemaId, s.id)).orderBy(asc(clientField.sortOrder)),
    db.select().from(clientSubtype).where(eq(clientSubtype.clientSchemaId, s.id)).orderBy(asc(clientSubtype.sortOrder)),
    db.select().from(clientDomain).where(eq(clientDomain.clientSchemaId, s.id)).orderBy(asc(clientDomain.sortOrder)),
  ]);
  return { schema: s, featureClasses, fields, subtypes, domains };
}

const fcInput = z.object({
  id: uuidSchema,
  version: z.coerce.number().int().min(1),
  geometryType: z.string().trim().max(60).optional().or(z.literal("")).transform((s) => s || null),
  discipline: z.string().trim().max(200).optional().or(z.literal("")).transform((s) => s || null),
  disciplineIndividual: z.string().trim().max(200).optional().or(z.literal("")).transform((s) => s || null),
  availability: z.string().trim().max(40).optional().or(z.literal("")).transform((s) => s || null),
  gisComments: z.string().trim().max(4000).optional().or(z.literal("")).transform((s) => s || null),
  status: z.string().trim().max(40).optional().or(z.literal("")).transform((s) => s || null),
  notes: z.string().trim().max(4000).optional().or(z.literal("")).transform((s) => s || null),
  sourceFileUrl: z.string().trim().max(2000).optional().or(z.literal("")).transform((s) => s || null),
  shareFolderUrl: z.string().trim().max(2000).optional().or(z.literal("")).transform((s) => s || null),
});

/** The specialist updates the tracking columns of a feature class (the schema columns stay as imported). */
export async function updateFeatureClass(actor: Actor, raw: unknown): Promise<void> {
  assertCan(actor, "clientSchema:manage");
  const { id, version, ...values } = parseInput(fcInput, raw);
  await withTx(async (tx) => {
    const [before] = await tx.select().from(clientFeatureClass).where(eq(clientFeatureClass.id, id));
    if (!before) throw notFound("Feature class");
    const after = await updateVersioned(tx, clientFeatureClass, id, version, values, "Feature class");
    await writeAudit(tx, actor, { action: "clientSchema.updateFeatureClass", entityType: "client_feature_class", entityId: id, before, after });
  });
}

const schemaInput = z.object({
  id: uuidSchema,
  version: z.coerce.number().int().min(1),
  gisLead: z.string().trim().max(120).optional().or(z.literal("")).transform((s) => s || null),
  schemaVersion: z.string().trim().max(120).optional().or(z.literal("")).transform((s) => s || null),
  notes: z.string().trim().max(4000).optional().or(z.literal("")).transform((s) => s || null),
});

export async function updateClientSchema(actor: Actor, raw: unknown): Promise<void> {
  assertCan(actor, "clientSchema:manage");
  const { id, version, ...values } = parseInput(schemaInput, raw);
  await withTx(async (tx) => {
    const [before] = await tx.select().from(clientSchema).where(eq(clientSchema.id, id));
    if (!before) throw notFound("Client schema");
    const after = await updateVersioned(tx, clientSchema, id, version, values, "Client schema");
    await writeAudit(tx, actor, { action: "clientSchema.update", entityType: "client_schema", entityId: id, before, after });
  });
}

export async function deleteClientSchema(actor: Actor, rawId: unknown): Promise<void> {
  assertCan(actor, "import:run");
  const id = parseInput(uuidSchema, rawId);
  await withTx(async (tx) => {
    const [before] = await tx.select().from(clientSchema).where(and(eq(clientSchema.id, id)));
    if (!before) throw notFound("Client schema");
    await tx.delete(clientSchema).where(eq(clientSchema.id, id));
    await writeAudit(tx, actor, { action: "clientSchema.delete", entityType: "client_schema", entityId: id, before });
  });
}
