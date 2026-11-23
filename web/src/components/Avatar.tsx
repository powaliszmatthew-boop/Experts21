const COLORS: Record<string, string> = {
  purple: "var(--c-purple)",
  blue: "var(--c-blue)",
  cyan: "var(--c-cyan)",
  green: "var(--c-green)",
  orange: "var(--c-orange)",
  pink: "var(--c-pink)",
  red: "var(--c-red)",
  yellow: "var(--c-yellow)",
};

export function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.42, background: COLORS[color] ?? "var(--c-gray)" }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function ModelBadge({ label }: { label: string }) {
  const tier = label.toLowerCase().split(" ")[0];
  return <span className={`badge badge-${tier}`}>{label}</span>;
}
