import * as React from "react";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | { src: string };
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  placeholder?: string;
  blurDataURL?: string;
  unoptimized?: boolean;
};

export default function Image({ src, fill, priority, quality: _q, placeholder: _p, blurDataURL: _b, unoptimized: _u, style, sizes: _sizes, ...rest }: Props) {
  const raw = typeof src === "string" ? src : src.src;
  const resolved = raw.startsWith("/") ? raw.slice(1) : raw;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={resolved}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style}
    />
  );
}
