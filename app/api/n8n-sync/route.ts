import { NextResponse } from "next/server";

import { checkAppSecret } from "@/lib/api-auth";
import { processEnv } from "@/lib/env";

type N8nSyncBody = {
  storyTitle?: string;
  primaryLanguage?: string;
  alternateLanguage?: string;
  selectedFormats?: string[];
  selectedTools?: string[];
  requestPack?: {
    generatedAt?: string;
    storyTitle?: string;
    requestCount?: number;
    connectorSummary?: {
      configured?: number;
      missing?: number;
    };
    requests?: Array<{
      toolKey?: string;
      appName?: string;
      module?: string;
      label?: string;
      moduleType?: string;
      connector?: {
        configured?: boolean;
        provider?: {
          label?: string;
        } | null;
        missingEnvKeys?: string[];
      };
    }>;
  };
  liveRun?: {
    provider?: string;
    toolKey?: string;
    summary?: {
      status?: string;
      averageInterest?: number | null;
      points?: number;
    };
  } | null;
  runHistory?: unknown;
};

function getSafeWebhookUrl(urlValue: string) {
  try {
    const parsed = new URL(urlValue);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "configured";
  }
}

function getSecretConfig() {
  const secret = processEnv.N8N_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return null;
  }

  const mode = (processEnv.N8N_WEBHOOK_SECRET_MODE?.trim().toLowerCase() || "header") as
    | "header"
    | "query"
    | "both";
  const headerName = processEnv.N8N_WEBHOOK_SECRET_HEADER_NAME?.trim() || "X-N8N-SECRET";
  const queryParamName = processEnv.N8N_WEBHOOK_SECRET_QUERY_PARAM_NAME?.trim() || "secret";

  return {
    secret,
    mode: ["header", "query", "both"].includes(mode) ? mode : "header",
    headerName,
    queryParamName
  };
}

export async function POST(request: Request) {
  const authError = checkAppSecret(request);

  if (authError) {
    return authError;
  }

  const webhookUrl = processEnv.N8N_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    return NextResponse.json(
      {
        error: "N8N webhook is not configured.",
        missingEnvKeys: ["N8N_WEBHOOK_URL"]
      },
      { status: 400 }
    );
  }

  const body = (await request.json()) as N8nSyncBody;
  const secretConfig = getSecretConfig();
  const storyTitle = body.storyTitle?.trim() || "Untitled story";
  const primaryLanguage = body.primaryLanguage || "en";
  const alternateLanguage = body.alternateLanguage || primaryLanguage;
  const selectedFormats = Array.isArray(body.selectedFormats) ? body.selectedFormats : [];
  const selectedTools = Array.isArray(body.selectedTools) ? body.selectedTools : [];
  const requestPackRequests = Array.isArray(body.requestPack?.requests) ? body.requestPack.requests : [];
  const syncedAt = new Date().toISOString();

  const sheetRows = requestPackRequests.length
    ? requestPackRequests.map((requestItem) => ({
        syncedAt,
        storyTitle,
        primaryLanguage,
        alternateLanguage,
        selectedFormats: selectedFormats.join(", "),
        selectedToolCount: selectedTools.length,
        requestCount: body.requestPack?.requestCount ?? requestPackRequests.length,
        configuredConnectors: body.requestPack?.connectorSummary?.configured ?? 0,
        missingConnectors: body.requestPack?.connectorSummary?.missing ?? 0,
        toolKey: requestItem.toolKey ?? "",
        appName: requestItem.appName ?? "",
        module: requestItem.module ?? "",
        label: requestItem.label ?? "",
        moduleType: requestItem.moduleType ?? "",
        connectorConfigured: requestItem.connector?.configured ?? false,
        provider: requestItem.connector?.provider?.label ?? "",
        missingEnvKeys: requestItem.connector?.missingEnvKeys?.join(", ") ?? "",
        liveProvider: body.liveRun?.provider ?? "",
        liveToolKey: body.liveRun?.toolKey ?? "",
        liveStatus: body.liveRun?.summary?.status ?? "",
        liveAverageInterest: body.liveRun?.summary?.averageInterest ?? "",
        livePoints: body.liveRun?.summary?.points ?? ""
      }))
    : [
        {
          syncedAt,
          storyTitle,
          primaryLanguage,
          alternateLanguage,
          selectedFormats: selectedFormats.join(", "),
          selectedToolCount: selectedTools.length,
          requestCount: body.requestPack?.requestCount ?? 0,
          configuredConnectors: body.requestPack?.connectorSummary?.configured ?? 0,
          missingConnectors: body.requestPack?.connectorSummary?.missing ?? 0,
          toolKey: "",
          appName: "",
          module: "",
          label: "",
          moduleType: "",
          connectorConfigured: false,
          provider: "",
          missingEnvKeys: "",
          liveProvider: body.liveRun?.provider ?? "",
          liveToolKey: body.liveRun?.toolKey ?? "",
          liveStatus: body.liveRun?.summary?.status ?? "",
          liveAverageInterest: body.liveRun?.summary?.averageInterest ?? "",
          livePoints: body.liveRun?.summary?.points ?? ""
        }
      ];

  const payload = {
    source: "story-market-desk",
    sentAt: syncedAt,
    story: {
      title: storyTitle,
      primaryLanguage,
      alternateLanguage,
      selectedFormats,
      selectedTools
    },
    sheetRows,
    requestPack: body.requestPack ?? null,
    liveRun: body.liveRun ?? null,
    runHistory: Array.isArray(body.runHistory) ? body.runHistory : []
  };

  let targetWebhookUrl = webhookUrl;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (secretConfig) {
    if (secretConfig.mode === "header" || secretConfig.mode === "both") {
      headers[secretConfig.headerName] = secretConfig.secret;
    }

    if (secretConfig.mode === "query" || secretConfig.mode === "both") {
      const parsed = new URL(targetWebhookUrl);
      parsed.searchParams.set(secretConfig.queryParamName, secretConfig.secret);
      targetWebhookUrl = parsed.toString();
    }
  }

  const response = await fetch(targetWebhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const rawText = await response.text();

  let webhookResponse: unknown = rawText;

  try {
    webhookResponse = rawText ? (JSON.parse(rawText) as unknown) : null;
  } catch {
    webhookResponse = rawText;
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "n8n webhook rejected the payload.",
        status: response.status,
        webhookResponse
      },
      { status: response.status }
    );
  }

  return NextResponse.json({
    syncedAt: new Date().toISOString(),
    webhookUrl: getSafeWebhookUrl(webhookUrl),
    status: response.status,
    webhookResponse
  });
}