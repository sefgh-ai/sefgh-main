export class EmptyAssistantReplyError extends Error {
 constructor() { super("The assistant sent an empty answer"); this.name = "EmptyAssistantReplyError"; }
}

export function assistantResponse(payload) {
 const response = payload?.response;
 if (typeof response !== "string" || response.trim() === "") { throw new EmptyAssistantReplyError(); }
 return response;
}
