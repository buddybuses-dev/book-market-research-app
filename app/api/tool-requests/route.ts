import { NextResponse } from "next/server";

import { getConnectorStatus } from "@/lib/tool-providers";

type ToolRequestBody = {
  storyTitle?: string;
  primaryLanguage?: string;
  alternateLanguage?: string;
  price?: number;
  selectedFormats?: string[];
  selectedTools?: Array<{
    key: string;
    appName: string;
    name: string;
    label: string;
    module_type: string;
  }>;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ToolRequestBody;

  const storyTitle = body.storyTitle?.trim() || "Untitled story";
  const primaryLanguage = body.primaryLanguage || "en";
  const alternateLanguage = body.alternateLanguage || primaryLanguage;
  const price = typeof body.price === "number" ? Number(body.price.toFixed(2)) : 9.99;
  const selectedFormats = Array.isArray(body.selectedFormats) ? body.selectedFormats : [];
  const selectedTools = Array.isArray(body.selectedTools) ? body.selectedTools : [];

  const requests = selectedTools.map((tool) => {
    const connector = getConnectorStatus(tool.appName);

    return {
      toolKey: tool.key,
      appName: tool.appName,
      module: tool.name,
      label: tool.label,
      moduleType: tool.module_type,
      connector: {
        configured: connector.configured,
        provider: connector.provider
          ? {
              key: connector.provider.key,
              label: connector.provider.label,
              baseUrl: connector.provider.baseUrl,
              credentialEnvKeys: connector.provider.credentialEnvKeys,
              authType: connector.provider.authType
            }
          : null,
        missingEnvKeys: connector.missingEnvKeys
      },
      request: {
        storyTitle,
        languages: {
          primary: primaryLanguage,
          alternate: alternateLanguage
        },
        selectedFormats,
        price,
        intention:
          tool.module_type === "search"
            ? "Demand discovery, keyword mapping, and language-market comparison"
            : "Commercial estimation, pricing research, and format launch validation"
      }
    };
  });

  const configuredConnectors = requests.filter((entry) => entry.connector.configured).length;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    storyTitle,
    requestCount: requests.length,
    connectorSummary: {
      configured: configuredConnectors,
      missing: requests.length - configuredConnectors
    },
    requests
  });
}