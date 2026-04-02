import { Package } from "lucide-react";

export default function ProductThumb({
  src,
  size = 36,
}: {
  src?: string | null;
  size?: number;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="rounded-lg object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <Package size={size * 0.44} />
    </div>
  );
}
