export type ChatMessage = {
  id: string;
  time: string;
  user: string;
  text: string;
  assetUrl?: string;
};

const messages: ChatMessage[] = [];
const subscribers = new Set<(msg: ChatMessage) => void>();

export function getMessages(): ChatMessage[] {
  return messages.slice(-200);
}

export function addMessage(msg: ChatMessage) {
  messages.push(msg);
  if (messages.length > 500) messages.splice(0, messages.length - 500);
  for (const fn of subscribers) fn(msg);
}

export function subscribe(fn: (msg: ChatMessage) => void) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

