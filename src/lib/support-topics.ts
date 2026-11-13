// Chat texts shared by the customer panel, Admin → Inbox and the API (client-safe, no secrets).
import { TOPICS, type TopicId } from "@/lib/booking";

export const GREETING = "Hi! What can we help you with?";

/** Text put in the message box when the customer taps a topic chip. */
export const TOPIC_ASK = "I'd like to ask about {topic}.";

/** Automatic reply to a topic: one line about the topic, then the booking line. */
export const AUTO_REPLY: Record<TopicId, string> = {
  inspection: "We help teams get through technical inspection: checklists, common fail points and a pre-check of your car.",
  electrical: "We can review your wiring, HV/LV layout and PCB design, and point out issues before you build.",
  powertrain: "We can go through your motor, inverter, VCU and BMS setup with you, including tuning and safety logic.",
  compliance: "We can check your documents against the rules and help you prepare reports and forms.",
  design: "We can review your design or a part you want to change and suggest modifications.",
  other: "Tell us a bit more here, and we will point you to the right engineer.",
};
export const AUTO_BOOK = "The best way to go deeper is a 90-minute meetup/call with our engineers. Book a consultation and we will prepare for your topic.";

export const isTopic = (v: unknown): v is TopicId => typeof v === "string" && TOPICS.some((x) => x.id === v);

export type ProductCard = { slug: string; name: string; priceUsd: number; image: string | null };
export type ChatKind = "text" | "topic" | "auto" | "product";
export type ChatMessage = {
  id: string;
  sender: "customer" | "staff";
  staffName: string | null;
  body: string;
  at: string;
  kind: ChatKind;
  topic: TopicId | null;
  product: ProductCard | null;
};

/** Window events between the chat and the booking form on the Consulting page. */
export const OPEN_CHAT = "anargya:open-chat";
export const BOOK_TOPIC = "anargya:book-topic";
