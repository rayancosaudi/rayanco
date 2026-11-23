const CHANNELS: Record<string, { label: string; cls: string }> = {
  whatsapp_click: { label: "WhatsApp", cls: "bg-accent-500/10 text-accent-700" },
  call_click: { label: "Call", cls: "bg-sky-500/10 text-sky-700" },
  form: { label: "Form", cls: "bg-steel-900/[0.07] text-steel-700" },
};

export const CHANNEL_OPTIONS = Object.entries(CHANNELS).map(([value, c]) => ({ value, label: c.label }));

export function ChannelPill({ channel }: { channel: string }) {
  const c = CHANNELS[channel] ?? { label: channel, cls: "bg-steel-100 text-steel-600" };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${c.cls}`}>{c.label}</span>;
}
