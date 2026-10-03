// Synthetic, clearly fictional examples for demos. No real people, numbers, or credentials.
import type { InputType } from "./risk";

export type DemoExample = {
  id: string;
  label: string;
  type: InputType;
  text?: string;
  sender?: string;
  replyTo?: string;
  subject?: string;
  attachments?: string;
  claimedBrand?: string;
  url?: string;
};

export const DEMO_EXAMPLES: DemoExample[] = [
  {
    id: "delivery",
    label: "Fake delivery refund",
    type: "message",
    sender: "+1 (555) 010-0199",
    claimedBrand: "DHL",
    text: "DHL: Your package #DH-88213 could not be delivered due to an unpaid customs fee of $1.99. A refund of your previous charge is also pending. Update your details within 24 hours or the parcel will be returned: http://dhl-redelivery-support.top/refund",
  },
  {
    id: "bank",
    label: "Bank verification phishing",
    type: "message",
    sender: "SECURE-ALERT",
    claimedBrand: "Chase",
    text: "Chase ALERT: Unusual sign-in detected. Your account has been temporarily locked. To restore access, verify your identity immediately at https://chase-secure-verify.co/login and reply with the one-time code we send you. Failure to act will result in permanent suspension.",
  },
  {
    id: "brand-email",
    label: "Brand impersonation email",
    type: "email",
    sender: "Netflix Billing <billing@netflix-support-team.net>",
    replyTo: "accounts@renew-membership.xyz",
    subject: "Action required: Your membership is on hold",
    attachments: "Invoice_0921.html",
    claimedBrand: "Netflix",
    text: "Dear Customer,\n\nWe were unable to process your last payment. To avoid interruption of service, please update your payment information within 48 hours.\n\n[Update Payment Method] -> https://bit.ly/nflx-billing-update\n\nIf you do not update, your account and viewing history will be deleted.\n\nThank you,\nThe Netflix Team",
  },
  {
    id: "job",
    label: "Suspicious job offer",
    type: "message",
    sender: "Recruiter Ava (via chat app)",
    claimedBrand: "Contoso Logistics",
    text: "Hi! I'm a recruiter at Contoso Logistics. Your profile matches our remote Package Inspector role: $45/hour, flexible hours, no interview needed. You just need to buy a $120 starter kit via gift card, which will be reimbursed in your first paycheck. Reply YES and send a photo of your ID to get started today! Please keep this offer confidential.",
  },
];
