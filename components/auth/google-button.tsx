"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/brand/social-icons";
import { signInWithGoogleAction } from "@/lib/actions/auth";

export function GoogleButton({ next, label = "Continuar com Google" }: { next?: string; label?: string }) {
  const [pending, start] = React.useTransition();
  return (
    <Button
      type="button"
      variant="subtle"
      size="lg"
      className="w-full normal-case tracking-normal"
      loading={pending}
      onClick={() => start(() => signInWithGoogleAction(next))}
    >
      {!pending && <GoogleIcon className="size-[18px]" />}
      {label}
    </Button>
  );
}
