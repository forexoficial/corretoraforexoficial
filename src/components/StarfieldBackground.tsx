import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
}

interface Meteor {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  angle: number;
}

export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Create stars
    const stars: Star[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    // Create meteors
    const meteors: Meteor[] = [];
    const createMeteor = () => {
      meteors.push({
        x: Math.random() * canvas.width,
        y: -50,
        length: Math.random() * 80 + 40,
        speed: Math.random() * 3 + 2,
        opacity: Math.random() * 0.5 + 0.3,
        angle: Math.random() * 30 + 15, // 15-45 degrees
      });
    };

    // Animation loop
    let animationFrame: number;
    let lastMeteorTime = 0;
    const meteorInterval = 3000; // Create meteor every 3 seconds

    const animate = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw and update stars
      stars.forEach((star) => {
        star.opacity += star.twinkleSpeed;
        if (star.opacity > 0.8 || star.opacity < 0.2) {
          star.twinkleSpeed *= -1;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
      });

      // Create new meteors periodically
      if (timestamp - lastMeteorTime > meteorInterval) {
        createMeteor();
        lastMeteorTime = timestamp;
      }

      // Draw and update meteors
      meteors.forEach((meteor, index) => {
        const radians = (meteor.angle * Math.PI) / 180;
        const dx = Math.cos(radians) * meteor.speed;
        const dy = Math.sin(radians) * meteor.speed;

        meteor.x += dx;
        meteor.y += dy;

        // Draw meteor trail
        const gradient = ctx.createLinearGradient(
          meteor.x,
          meteor.y,
          meteor.x - Math.cos(radians) * meteor.length,
          meteor.y - Math.sin(radians) * meteor.length
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${meteor.opacity})`);
        gradient.addColorStop(0.5, `rgba(200, 220, 255, ${meteor.opacity * 0.5})`);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.moveTo(meteor.x, meteor.y);
        ctx.lineTo(
          meteor.x - Math.cos(radians) * meteor.length,
          meteor.y - Math.sin(radians) * meteor.length
        );
        ctx.stroke();

        // Remove meteors that are off screen
        if (meteor.y > canvas.height + 100 || meteor.x > canvas.width + 100) {
          meteors.splice(index, 1);
        }
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none opacity-40"
      style={{ zIndex: 0 }}
    />
  );
}
