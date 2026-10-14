// Module hooks for chat-first-reply.test.mjs: the chat hook's imports are
// replaced with stand-ins that the test controls through globalThis.__chat,
// so the real handleSend runs without React, Supabase or the network.

const stubs = {
  react: `
    export function useState(initial) {
      const hook = globalThis.__chat.hook;
      const i = hook.next++;
      return [i in hook.values ? hook.values[i] : initial, () => {}];
    }`,
  sonner: `export const toast = { error: (...a) => globalThis.__chat.toast(...a), success() {} };`,
  '@/lib/supabase/conversations': `
    const c = (name) => (...a) => globalThis.__chat[name](...a);
    export const addMessage = c('addMessage');
    export const createMessage = c('createMessage');
    export const updateMessage = c('updateMessage');
    export const deleteMessage = c('deleteMessage');
    export const updateConversationTitle = c('updateConversationTitle');`,
  '@/lib/supabase/search-history': `export const saveSearchHistory = () => {};`,
  '@/lib/ai/chat-request': `export const postChat = (...a) => globalThis.__chat.postChat(...a);`,
};

export async function resolve(specifier, context, nextResolve) {
  if (specifier in stubs) {
    return { url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
