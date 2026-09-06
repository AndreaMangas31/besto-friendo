/** Huecos fijos: un random en cada mount haría saltar las partículas al cambiar de modo. */
const SLOTS = [
  { left: "4%", delay: "-1s", duration: "13s" },
  { left: "11%", delay: "-7s", duration: "10s" },
  { left: "18%", delay: "-3s", duration: "16s" },
  { left: "24%", delay: "-11s", duration: "12s" },
  { left: "31%", delay: "-5s", duration: "14s" },
  { left: "38%", delay: "-9s", duration: "11s" },
  { left: "45%", delay: "-2s", duration: "15s" },
  { left: "52%", delay: "-8s", duration: "13s" },
  { left: "59%", delay: "-4s", duration: "17s" },
  { left: "66%", delay: "-12s", duration: "10s" },
  { left: "73%", delay: "-6s", duration: "14s" },
  { left: "80%", delay: "-1.5s", duration: "12s" },
  { left: "87%", delay: "-10s", duration: "16s" },
  { left: "93%", delay: "-3.5s", duration: "11s" },
  { left: "8%", delay: "-14s", duration: "18s" },
  { left: "28%", delay: "-0.8s", duration: "9s" },
  { left: "48%", delay: "-6.5s", duration: "19s" },
  { left: "68%", delay: "-13s", duration: "8s" },
  { left: "84%", delay: "-4.2s", duration: "15s" },
  { left: "41%", delay: "-15s", duration: "12s" },
] as const;

export function ShellParticles() {
  return (
    <div className="conversation-shell-particles" aria-hidden>
      {SLOTS.map((slot) => (
        <span
          key={slot.left + slot.delay}
          style={{
            left: slot.left,
            animationDelay: slot.delay,
            animationDuration: slot.duration,
          }}
        />
      ))}
    </div>
  );
}
