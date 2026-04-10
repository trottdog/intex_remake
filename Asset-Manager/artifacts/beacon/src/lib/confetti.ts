import confetti from "canvas-confetti";

type DonationConfettiVariant = "standard" | "cascade";

export function triggerDonationConfetti(variant: DonationConfettiVariant = "standard") {
  const colors = ["#2a9d72", "#0e2118", "#52c89a", "#a8edcb", "#f4e04d", "#ffffff"];

  if (variant === "cascade") {
    const fire = (originX: number, particleCount: number, delayMs: number) => {
      window.setTimeout(() => {
        confetti({
          particleCount,
          spread: 120,
          origin: { x: originX, y: 0 },
          colors,
          startVelocity: 52,
          gravity: 0.82,
          scalar: 1.15,
          ticks: 360,
        });
      }, delayMs);
    };

    fire(0.12, 160, 0);
    fire(0.32, 170, 120);
    fire(0.5, 190, 220);
    fire(0.68, 170, 320);
    fire(0.88, 160, 420);
    return;
  }

  confetti({
    particleCount: 120,
    spread: 80,
    origin: { x: 0.3, y: 0 },
    colors,
    startVelocity: 45,
    gravity: 0.9,
    ticks: 300,
  });

  confetti({
    particleCount: 120,
    spread: 80,
    origin: { x: 0.7, y: 0 },
    colors,
    startVelocity: 45,
    gravity: 0.9,
    ticks: 300,
  });
}
