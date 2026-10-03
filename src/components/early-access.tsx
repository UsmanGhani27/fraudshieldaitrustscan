import { toast } from "sonner";
import { useState } from "react";
import { Button } from "./ui/button";

/** Honest "Join Early Access" — records interest locally in the session only; no payment, no fake checkout. */
export function EarlyAccessButton({ plan }: { plan: string }) {
  const [joined, setJoined] = useState(false);
  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={joined}
      onClick={() => {
        setJoined(true);
        toast.success(`Thanks! ${plan} is coming soon — billing isn't live yet, so there's nothing to pay.`);
      }}
    >
      {joined ? "Interest noted" : "Join Early Access"}
    </Button>
  );
}
