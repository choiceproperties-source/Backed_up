import { supabase } from "../supabase";
import type { Request } from "express";
import type { AuthenticatedRequest } from "../auth-middleware";
import type { AuditAction, PaymentAuditAction } from "@shared/schema";

export interface AuditLogParams {
  userId?: string;
  action: AuditAction | string;
  resourceType: string;
  resourceId?: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
  req?: Request | AuthenticatedRequest;
}

function getClientIp(req?: Request): string | null {
  if (!req) return null;
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || null;
}

function getUserAgent(req?: Request): string | null {
  if (!req) return null;
  return req.headers["user-agent"] || null;
}

export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      user_id: params.userId || null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      previous_data: params.previousData || null,
      new_data: params.newData || null,
      ip_address: getClientIp(params.req) || null,
      user_agent: getUserAgent(params.req) || null,
      metadata: params.metadata || null,
    });

    if (error) {
      console.error("[AUDIT] Failed to log event:", error);
    }
  } catch (error) {
    console.error("[AUDIT] Exception logging event:", error);
  }
}

export async function logPropertyChange(
  userId: string,
  propertyId: string,
  action: "create" | "update" | "delete",
  previousData?: Record<string, any>,
  newData?: Record<string, any>,
  req?: Request
): Promise<void> {
  await logAuditEvent({
    userId,
    action,
    resourceType: "property",
    resourceId: propertyId,
    previousData,
    newData,
    req,
  });
}

export async function logApplicationChange(
  userId: string,
  applicationId: string,
  action: AuditAction,
  previousData?: Record<string, any>,
  newData?: Record<string, any>,
  req?: Request
): Promise<void> {
  await logAuditEvent({
    userId,
    action,
    resourceType: "application",
    resourceId: applicationId,
    previousData,
    newData,
    req,
  });
}

export async function logSecurityEvent(
  userId: string | undefined,
  action: AuditAction | string,
  success: boolean,
  metadata?: Record<string, any>,
  req?: Request
): Promise<void> {
  await logAuditEvent({
    userId,
    action,
    resourceType: "security",
    metadata: { ...metadata, success },
    req,
  });
}

export async function logLeaseAction(
  userId: string,
  applicationId: string,
  action: string,
  previousStatus?: string,
  newStatus?: string,
  notes?: string,
  req?: Request
): Promise<void> {
  await logAuditEvent({
    userId,
    action,
    resourceType: "lease",
    resourceId: applicationId,
    metadata: {
      previousStatus,
      newStatus,
      notes,
      actionType: action
    },
    req,
  });
}

export async function logPaymentAction(
  userId: string,
  paymentId: string,
  action: PaymentAuditAction,
  previousStatus?: string,
  newStatus?: string,
  metadata?: Record<string, any>,
  req?: Request
): Promise<void> {
  await logAuditEvent({
    userId,
    action,
    resourceType: "payment",
    resourceId: paymentId,
    previousData: previousStatus ? { status: previousStatus } : undefined,
    newData: newStatus ? { status: newStatus } : undefined,
    metadata: {
      ...metadata,
      actionType: action,
      timestamp: new Date().toISOString(),
    },
    req,
  });
}

export async function getPaymentAuditLogs(
  paymentId?: string,
  page: number = 1,
  limit: number = 50
): Promise<{ logs: any[]; total: number }> {
  try {
    let query = supabase.from("audit_logs").select("*", { count: "exact" })
      .eq("resource_type", "payment");

    if (paymentId) {
      query = query.eq("resource_id", paymentId);
    }

    const offset = (page - 1) * limit;
    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      logs: data || [],
      total: count || 0,
    };
  } catch (error) {
    console.error("[AUDIT] Failed to fetch payment logs:", error);
    return { logs: [], total: 0 };
  }
}

export async function getAuditLogs(
  filters: {
    userId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
  },
  page: number = 1,
  limit: number = 50
): Promise<{ logs: any[]; total: number }> {
  try {
    let query = supabase.from("audit_logs").select("*", { count: "exact" });

    if (filters.userId) {
      query = query.eq("user_id", filters.userId);
    }
    if (filters.action) {
      query = query.eq("action", filters.action);
    }
    if (filters.resourceType) {
      query = query.eq("resource_type", filters.resourceType);
    }
    if (filters.resourceId) {
      query = query.eq("resource_id", filters.resourceId);
    }
    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate.toISOString());
    }
    if (filters.endDate) {
      query = query.lte("created_at", filters.endDate.toISOString());
    }

    const offset = (page - 1) * limit;
    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      logs: data || [],
      total: count || 0,
    };
  } catch (error) {
    console.error("[AUDIT] Failed to fetch logs:", error);
    return { logs: [], total: 0 };
  }
}
