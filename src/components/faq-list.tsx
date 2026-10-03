import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

export const FAQ = [
  { q: "Can FraudShield AI tell me for certain whether something is a scam?", a: "No. It gives an AI-assisted risk assessment with the evidence behind it. It can be wrong in both directions, so always verify through official channels before acting on anything important." },
  { q: "Do you open the links I submit?", a: "Never. Links are analyzed as text only — their structure, domain and spelling. QR codes are decoded on your device and the destination is shown without opening it." },
  { q: "How is the risk score calculated?", a: "We combine deterministic rule checks (urgency language, payment requests, look-alike domains, sender mismatches and more) with an AI model's assessment. The final level is computed centrally on our servers. It's an estimate, not a precise measurement." },
  { q: "Can it detect AI-generated scams?", a: "It may point out possible AI-manipulation indicators, but no tool can reliably prove content was AI-generated, and we never claim that." },
  { q: "What happens to the content I submit?", a: "It's sent to our AI provider server-side for analysis. If history is on, the (redacted) text or image is stored privately in your account. You can turn history off, choose a retention period, and delete individual items or everything at any time." },
  { q: "Do you use threat-intelligence feeds or check domain reputation?", a: "Not yet. Results rely on content analysis and a small built-in list of official brand domains. Threat-intelligence integrations are on our roadmap." },
  { q: "Is FraudShield monitoring my inbox?", a: "No. FraudShield only analyzes what you submit. Monitored inboxes and email integrations are planned but not available." },
  { q: "How do paid plans work?", a: "Paid plans are coming soon. Billing isn't enabled and we don't collect payment details. Everyone starts on the Free plan." },
];

export function FaqList() {
  return (
    <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-5">
      {FAQ.map((f, i) => (
        <AccordionItem key={i} value={`q${i}`}>
          <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
