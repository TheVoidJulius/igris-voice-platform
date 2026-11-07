export const runtime = "nodejs";

export function GET() {
  const azureConfigured = Boolean(
    process.env.AZURE_OPENAI_ENDPOINT?.trim() &&
      process.env.AZURE_OPENAI_API_KEY?.trim() &&
      process.env.AZURE_OPENAI_DEPLOYMENT?.trim(),
  );

  return Response.json({
    status: "ok",
    provider: azureConfigured ? "azure-openai" : "local-demo",
    deployment: azureConfigured
      ? process.env.AZURE_OPENAI_DEPLOYMENT
      : null,
  });
}
