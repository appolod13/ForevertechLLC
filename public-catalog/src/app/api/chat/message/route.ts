import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { generateAutoSocialCaptions } from "@/lib/contentFactory/text";
import { addMessage } from "../_state";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function stripAgentTags(input: string) {
  return input
    .replace(/@neo\.pm\s*ai/gi, "")
    .replace(/@planning\s+agent/gi, "")
    .replace(/@graphicdesigner/gi, "")
    .replace(/@feengineer/gi, "")
    .replace(/@backendengineer/gi, "")
    .replace(/@backendarchitect/gi, "")
    .replace(/@neuraloverclocker/gi, "")
    .replace(/@projectsuggester/gi, "")
    .replace(/@promptnavigator/gi, "")
    .replace(/@growthstrategist/gi, "")
    .replace(/@content\s+strategist/gi, "")
    .replace(/@criticalconsultant/gi, "")
    .replace(/@performanceprofiler/gi, "")
    .replace(/@devopsexpert/gi, "")
    .replace(/@quantumdeugger/gi, "")
    .replace(/@errorfixer/gi, "")
    .replace(/@testingarchitect/gi, "")
    .replace(/@securitysentinel/gi, "")
    .replace(/@automationexpert/gi, "")
    .replace(/@mlarchitect/gi, "")
    .replace(/@stackbridge/gi, "")
    .replace(/@databasearchitect/gi, "")
    .replace(/@apiarchitect/gi, "")
    .replace(/@frontendexpert/gi, "")
    .replace(/@dependecymanager/gi, "")
    .replace(/@coderefactorer/gi, "")
    .replace(/@codeoptimizer/gi, "")
    .replace(/@generalcoordinator/gi, "")
    .trim();
}

function includesAgentTag(input: string) {
  return /@neo\.pm\s*ai|@planning\s+agent|@graphicdesigner|@feengineer|@backendengineer|@backendarchitect|@neuraloverclocker|@projectsuggester|@promptnavigator|@growthstrategist|@content\s+strategist|@criticalconsultant|@performanceprofiler|@devopsexpert|@quantumdeugger|@errorfixer|@testingarchitect|@securitysentinel|@automationexpert|@mlarchitect|@stackbridge|@databasearchitect|@apiarchitect|@frontendexpert|@dependecymanager|@coderefactorer|@codeoptimizer|@generalcoordinator/i.test(
    input,
  );
}

function smartCaption(topic: string) {
  const captions = generateAutoSocialCaptions(topic, ["twitter"]);
  const text = String(captions.twitter || "").trim();
  const hashtags = text.match(/#[A-Za-z0-9_]+/g) || [];
  const unique = Array.from(new Set(hashtags));
  return { text, hashtags: unique };
}

function simplePromptUpgrade(topic: string) {
  const t = topic.trim();
  if (!t) return "";
  const add = [
    "High detail, clean composition, balanced lighting, no text, no watermark, no logo.",
    "Avoid artifacts, avoid distortion, avoid blurry output.",
  ].join(" ");
  const merged = `${t}\n\n${add}`.trim();
  return merged;
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => ({}));
  const b = isRecord(body) ? body : {};
  const user = typeof b.user === "string" && b.user.trim() ? b.user.trim() : "Guest";
  const text = typeof b.text === "string" ? b.text.trim() : "";
  const assetUrl = typeof b.assetUrl === "string" && b.assetUrl.trim() ? b.assetUrl.trim() : undefined;

  if (!text && !assetUrl) return fail("validation_error", 400, ["text or assetUrl required"]);

  const msg = {
    id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
    time: new Date().toISOString(),
    user,
    text,
    assetUrl,
  };
  addMessage(msg);

  if (text && includesAgentTag(text)) {
    const topic = stripAgentTags(text);
    const upgraded = simplePromptUpgrade(topic);
    const caption = topic ? smartCaption(topic) : { text: "", hashtags: [] as string[] };
    const replyParts: string[] = [];
    if (!topic) {
      replyParts.push("AI Agents ready. Add a topic after the tags to generate content/prompt improvements.");
    } else {
      if (caption.text) replyParts.push(caption.text);
      if (upgraded) replyParts.push(`\nPrompt upgrade:\n${upgraded}`);
    }
    addMessage({
      id: globalThis.crypto?.randomUUID?.() || String(Date.now() + 1),
      time: new Date().toISOString(),
      user: "AI Agents",
      text: replyParts.join("\n").trim(),
    });
  }

  return ok({ message: msg });
}
