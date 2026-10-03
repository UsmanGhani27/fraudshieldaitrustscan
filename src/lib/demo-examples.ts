// Synthetic, clearly fictional examples for demos. No real people, numbers, or credentials.
import type { InputType } from "./risk";

export type DemoExample = { id: string; label: string; type: InputType; text?: string; sender?: string; claimedBrand?: string; url?: string };

export const DEMO_EXAMPLES: DemoExample[] = [
  {
    id: "delivery",
    label: "Fake delivery refund",
    type: "message",
    sender: "+1 (555) 010-0199",
    claimedBrand: "ParcelPost Express",
    text: "ParcelPost: Your package #PP-88213 could not be delivered due to an unpaid customs fee of $1.99. A refund of your previous charge is also pending. Update your details within 24 hours or the parcel will be returned: http://parcelpost-redelivery.top/refund",
  },
  {
    id: "bank",
    label: "Bank verification phishing",
    type: "message",
    sender: "SECURE-ALERT",
    claimedBrand: "Northwind Bank",
    text: "Northwind Bank ALERT: Unusual sign-in detected. Your account has been temporarily locked. To restore access, verify your identity immediately at https://northwind-bank-verify.co/login and reply with the one-time code we send you. Failure to act will result in permanent suspension.",
  },
  {
    id: "brand-email",
    label: "Brand impersonation email",
    type: "email",
    sender: "Streamflix Billing <billing@streamflix-support-team.net>",
    claimedBrand: "Streamflix",
    text: "Subject: Action required: Your membership is on hold\n\nDear Customer,\n\nWe were unable to process your last payment. To avoid interruption of service, please update your payment information within 48 hours.\n\n[Update Payment Method] -> https://bit.ly/streamflix-billing-update\n\nIf you do not update, your account and viewing history will be deleted.\n\nThank you,\nThe Streamflix Team",
  },
  {
    id: "job",
    label: "Suspicious job offer",
    type: "message",
    sender: "Recruiter Ava (via chat app)",
    claimedBrand: "Contoso Logistics",
    text: "Hi! I'm a recruiter at Contoso Logistics. Your profile matches our remote Package Inspector role: $45/hour, flexible hours, no interview needed. You just need to buy a $120 starter kit via gift card, which will be reimbursed in your first paycheck. Reply YES and send a photo of your ID to get started today!",
  },
];
