const source = {
  react: `export const useState = (...a) => globalThis.__conversationHooks.useState(...a);
    export const useRef = (...a) => globalThis.__conversationHooks.useRef(...a);
    export const useEffect = (...a) => globalThis.__conversationHooks.useEffect(...a);
    export const useCallback = (...a) => globalThis.__conversationHooks.useCallback(...a);`,
  sonner: `export const toast = { success() {}, error: (...a) => globalThis.__conversationToasts.push(a) };`,
  '@/lib/supabase/conversations': `
    export const getUserConversations = async () => [];
    export const getConversation = (...a) => globalThis.__getConversation(...a);
    export const createConversation = async () => null;
    export const deleteConversation = (...a) => globalThis.__deleteConversation(...a);
    export const toggleConversationPin = async () => {};
    export const deleteAllConversations = async () => {};`,
};
export async function resolve(specifier, context, nextResolve) {
  return specifier in source ? { url: 'data:text/javascript,' + encodeURIComponent(source[specifier]), shortCircuit: true } : nextResolve(specifier, context);
}
