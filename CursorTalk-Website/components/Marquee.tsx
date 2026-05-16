const items = [
  { label: 'Gmail',        icon: '/logos/gmail.svg' },
  { label: 'Slack',        icon: '/logos/slack.svg' },
  { label: 'Notion',       icon: '/logos/notion.svg' },
  { label: 'VS Code',      icon: '/logos/vscode.svg' },
  { label: 'Cursor',       icon: '/logos/cursor.svg' },
  { label: 'Teams',        icon: '/logos/teams.svg' },
  { label: 'Figma',        icon: '/logos/figma.svg' },
  { label: 'Outlook',      icon: '/logos/outlook.svg' },
  { label: 'Google Docs',  icon: '/logos/google-docs.svg' },
  { label: 'Apple Notes',  icon: '/logos/notes.svg' },
  { label: 'iMessage',     icon: '/logos/imessage.svg' },
  { label: 'Grammarly',    icon: '/logos/grammarly.svg' },
  { label: 'Terminal',     icon: '/logos/terminal.svg' },
  { label: 'Obsidian',     icon: '/logos/obsidian.svg' },
  { label: 'Discord',      icon: '/logos/discord.svg' },
  { label: 'Linear',       icon: '/logos/linear.svg' },
  { label: 'Jira',         icon: '/logos/jira.svg' },
  { label: 'Zoom',         icon: '/logos/zoom.svg' },
  { label: 'Salesforce',   icon: '/logos/salesforce.svg' },
  { label: 'ChatGPT',      icon: '/logos/openai.svg' },
  { label: 'X (Twitter)',  icon: '/logos/x.svg' },
]

export function Marquee() {
  const doubled = [...items, ...items]

  return (
    <section className="py-14 border-t border-b border-border bg-surface overflow-hidden">
      <p className="font-mono text-center text-[10px] text-dim tracking-[0.15em] mb-8">
        WORKS IN EVERY APP
      </p>
      <div
        className="overflow-hidden"
        style={{
          maskImage:
            'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
        }}
      >
        <div className="flex gap-8 w-max animate-marquee">
          {doubled.map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2 w-[72px] flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.icon}
                alt={item.label}
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
              />
              <span className="font-sans text-[11px] font-medium text-muted text-center leading-tight whitespace-normal">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
