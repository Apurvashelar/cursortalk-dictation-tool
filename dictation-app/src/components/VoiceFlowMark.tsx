type VoiceFlowMarkProps = {
  className?: string;
};

export function VoiceFlowMark({ className = "h-5 w-5" }: VoiceFlowMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        height="17"
        rx="6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
        width="12"
        x="10"
        y="3"
      />
      <path
        d="M6 17a10 10 0 0 0 20 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
      <line
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
        x1="16"
        x2="16"
        y1="27"
        y2="30"
      />
      <line
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
        x1="13"
        x2="13"
        y1="9.5"
        y2="13"
      />
      <line
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
        x1="15"
        x2="15"
        y1="8"
        y2="14.5"
      />
      <line
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
        x1="17"
        x2="17"
        y1="8.5"
        y2="14"
      />
      <line
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
        x1="19"
        x2="19"
        y1="10"
        y2="13"
      />
    </svg>
  );
}
