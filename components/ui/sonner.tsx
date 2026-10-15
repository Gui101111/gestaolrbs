"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      offset={20}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border !border-gold/20 !bg-[#0d1117]/95 !text-ivory !shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] !backdrop-blur-xl !font-sans",
          title: "!text-[0.875rem] !font-semibold",
          description: "!text-mist !text-[0.8125rem]",
          success: "[&_[data-icon]]:!text-gold",
          error: "!border-destructive/40 [&_[data-icon]]:!text-[#ec8a80]",
          actionButton: "!bg-gold !text-ink !rounded-full",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
