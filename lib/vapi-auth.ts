// Verify a Vapi tool call request is authentic.
// Vapi signs server-side tool calls with a shared secret in the X-Vapi-Secret header.
// We compare against VAPI_TOOL_SECRET (set in Vercel env, same secret configured in Vapi assistant).

export function verifyVapiSecret(req: Request): boolean {
  const expected = (process.env.VAPI_TOOL_SECRET || '').trim();
  if (!expected) return false;
  const got = (req.headers.get('x-vapi-secret') || '').trim();
  return got === expected;
}

export type VapiToolCall = {
  toolCallList?: Array<{
    id: string;
    function: { name: string; arguments: Record<string, unknown> };
  }>;
  // Vapi's newer "message.toolCallList" envelope variant
  message?: {
    toolCallList?: Array<{
      id: string;
      function: { name: string; arguments: Record<string, unknown> };
    }>;
  };
};

export function extractToolCalls(body: VapiToolCall) {
  return body.message?.toolCallList || body.toolCallList || [];
}

export function vapiToolResponse(toolCallId: string, result: unknown) {
  return {
    results: [
      {
        toolCallId,
        result: typeof result === 'string' ? result : JSON.stringify(result),
      },
    ],
  };
}
