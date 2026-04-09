import confetti from "canvas-confetti";

export function triggerDonationConfetti() {
  const colors = ["#2a9d72", "#0e2118", "#52c89a", "#a8edcb", "#f4e04d", "#ffffff"];

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
