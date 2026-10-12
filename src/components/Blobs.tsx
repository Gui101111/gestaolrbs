import { cn } from "@/lib/utils";

/** Mancha orgânica inspirada nas manchas da identidade Berry's. */
export function Spot({ className, variant = 0 }: { className?: string; variant?: 0 | 1 | 2 }) {
  const paths = [
    "M43.6,-58.9C55.8,-50.3,64.1,-36,68.4,-20.6C72.7,-5.2,73,11.2,66.3,24.3C59.6,37.4,45.9,47.1,31.4,55.2C16.9,63.3,1.6,69.8,-14.6,68.9C-30.8,68,-47.9,59.8,-58.6,46.5C-69.3,33.2,-73.6,14.8,-71,-2.2C-68.4,-19.2,-58.9,-34.8,-46,-43.6C-33.1,-52.4,-16.6,-54.4,-0.4,-53.9C15.8,-53.4,31.4,-67.5,43.6,-58.9Z",
    "M38.9,-49.4C50.3,-37.9,59.3,-25.3,63.6,-10.3C67.9,4.7,67.5,22.1,59.1,34.1C50.7,46.1,34.3,52.7,17.4,58.6C0.5,64.5,-16.9,69.7,-31.4,64.5C-45.9,59.3,-57.6,43.7,-63.8,26.4C-70,9.1,-70.7,-9.9,-63.4,-24.6C-56.1,-39.3,-40.8,-49.7,-26,-60.4C-11.2,-71.1,3.1,-82.1,15.6,-79.4C28.1,-76.7,27.5,-60.9,38.9,-49.4Z",
    "M47.1,-61.8C59.7,-53.6,67.2,-37.3,69.9,-20.7C72.6,-4.1,70.5,12.8,63.1,26.7C55.7,40.6,43,51.5,28.6,58.4C14.2,65.3,-1.9,68.2,-18.7,65.3C-35.5,62.4,-53,53.7,-62.5,39.6C-72,25.5,-73.5,6,-68.4,-10.7C-63.3,-27.4,-51.6,-41.3,-37.9,-49.4C-24.2,-57.5,-8.5,-59.8,7.9,-60.9C24.3,-62,34.5,-70,47.1,-61.8Z",
  ];
  return (
    <svg viewBox="-80 -80 160 160" aria-hidden="true" className={cn("pointer-events-none", className)}>
      <path d={paths[variant]} fill="currentColor" />
    </svg>
  );
}

export function Wave({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("pointer-events-none block w-full", flip && "rotate-180", className)}
    >
      <path d="M0 40C180 80 360 0 540 24s360 56 540 40 270-48 360-40v56H0Z" fill="currentColor" />
    </svg>
  );
}
