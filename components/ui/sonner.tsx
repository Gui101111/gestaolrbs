"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/components/theme/theme-provider";

/** Toasts de vidro com borda neon; acompanham o tema Grafite/Claro. */
function Toaster(props: ToasterProps) {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={theme === "claro" ? "light" : "dark"}
      position="top-center"
      offset={20}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border !border-cyan/30 !bg-popover/95 !text-fg !shadow-[0_0_0_1px_color-mix(in_oklab,var(--cyan)_12%,transparent),0_0_28px_-10px_var(--cyan),var(--shadow-pop)] !backdrop-blur-xl !font-sans",
          title: "!text-[0.875rem] !font-semibold",
          description: "!text-fg-2 !text-[0.8125rem]",
          success: "[&_[data-icon]]:!text-cyan",
          error: "!border-destructive/40 [&_[data-icon]]:!text-destructive",
          actionButton: "!bg-gold !text-[#1a1306] !rounded-full",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
