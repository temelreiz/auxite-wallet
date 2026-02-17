// src/app/api/admin/statements/route.ts
// Custody Statements Management API
// Admin: CRUD with multi-language support
// Public: GET published statements

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

interface StatementContent {
  tr: string;
  en: string;
  de?: string;
  fr?: string;
  ar?: string;
  ru?: string;
}

interface Statement {
  id: string;
  type: "monthly" | "quarterly" | "annual";
  title: StatementContent;
  period: StatementContent;
  periodEnding: string;       // ISO date
  generatedDate: string;      // ISO date
  fileSize: string;
  status: "available" | "generating" | "scheduled";
  published: boolean;
  pdfUrl?: string;            // Optional external PDF link
  createdAt: string;
  updatedAt: string;
}

const STATEMENTS_KEY = "auxite:statements";

// Auth helper
const verifyAuth = (request: NextRequest): boolean => {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  return token === process.env.ADMIN_PASSWORD;
};

// GET — Public (published only) or Admin (all)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminMode = searchParams.get("admin") === "true";

    let statements: Statement[] = [];
    try {
      statements = await kv.get<Statement[]>(STATEMENTS_KEY) || [];
    } catch {
      statements = [];
    }

    // Admin: return all (needs auth)
    if (adminMode) {
      if (!verifyAuth(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // Sort by periodEnding desc
      statements.sort((a, b) => new Date(b.periodEnding).getTime() - new Date(a.periodEnding).getTime());
      return NextResponse.json({ success: true, statements, total: statements.length });
    }

    // Public: only published + available statements
    const published = statements
      .filter(s => s.published && s.status === "available")
      .sort((a, b) => new Date(b.periodEnding).getTime() - new Date(a.periodEnding).getTime());

    return NextResponse.json({ success: true, statements: published, total: published.length });
  } catch (error: any) {
    console.error("Statements GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Admin CRUD actions
export async function POST(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    let statements: Statement[] = [];
    try {
      statements = await kv.get<Statement[]>(STATEMENTS_KEY) || [];
    } catch {
      statements = [];
    }

    switch (action) {
      // ── CREATE ──
      case "create": {
        const { type, title, period, periodEnding, fileSize, pdfUrl } = body;

        if (!type || !title?.tr || !title?.en || !period?.tr || !period?.en || !periodEnding) {
          return NextResponse.json(
            { error: "type, title (tr+en), period (tr+en), periodEnding required" },
            { status: 400 }
          );
        }

        const newStatement: Statement = {
          id: `stmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type,
          title,
          period,
          periodEnding,
          generatedDate: new Date().toISOString(),
          fileSize: fileSize || "—",
          status: "available",
          published: false,
          pdfUrl: pdfUrl || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        statements.push(newStatement);
        await kv.set(STATEMENTS_KEY, statements);

        console.log(`✅ Statement created: ${newStatement.id} — ${title.en}`);
        return NextResponse.json({ success: true, statement: newStatement });
      }

      // ── UPDATE ──
      case "update": {
        const { id, updates } = body;
        const idx = statements.findIndex(s => s.id === id);
        if (idx === -1) {
          return NextResponse.json({ error: "Statement not found" }, { status: 404 });
        }

        statements[idx] = {
          ...statements[idx],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        await kv.set(STATEMENTS_KEY, statements);

        console.log(`✏️ Statement updated: ${id}`);
        return NextResponse.json({ success: true, statement: statements[idx] });
      }

      // ── PUBLISH / UNPUBLISH ──
      case "toggle-publish": {
        const { id: toggleId } = body;
        const toggleIdx = statements.findIndex(s => s.id === toggleId);
        if (toggleIdx === -1) {
          return NextResponse.json({ error: "Statement not found" }, { status: 404 });
        }

        statements[toggleIdx].published = !statements[toggleIdx].published;
        statements[toggleIdx].updatedAt = new Date().toISOString();
        await kv.set(STATEMENTS_KEY, statements);

        const newStatus = statements[toggleIdx].published ? "published" : "unpublished";
        console.log(`📋 Statement ${newStatus}: ${toggleId}`);
        return NextResponse.json({ success: true, published: statements[toggleIdx].published });
      }

      // ── DELETE ──
      case "delete": {
        const { id: deleteId } = body;
        const before = statements.length;
        statements = statements.filter(s => s.id !== deleteId);
        if (statements.length === before) {
          return NextResponse.json({ error: "Statement not found" }, { status: 404 });
        }
        await kv.set(STATEMENTS_KEY, statements);

        console.log(`🗑️ Statement deleted: ${deleteId}`);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Statements POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
