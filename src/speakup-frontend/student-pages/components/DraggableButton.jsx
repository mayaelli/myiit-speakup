import { useState, useRef, useEffect } from "react";

export default function DraggableButton({ isOpen, toggleSidebar }) {
  const btnRef = useRef(null);
  const pos = useRef({ x: 20, y: 150 });
  const pointerOffset = useRef({ x: 0, y: 0 });
  const [isDragging, setDragging] = useState(false);

  // Smooth animation frame
  const raf = useRef(null);

  useEffect(() => {
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const startDrag = (e) => {
    setDragging(true);

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = btnRef.current.getBoundingClientRect();
    pointerOffset.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const onDrag = (e) => {
    if (!isDragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    pos.current.x = clientX - pointerOffset.current.x;
    pos.current.y = clientY - pointerOffset.current.y;

    smoothUpdate();
  };

  const stopDrag = () => {
    if (!isDragging) return;
    setDragging(false);

    // Snap to nearest edge
    const screenW = window.innerWidth;
    const btnWidth = btnRef.current.offsetWidth;
    const targetX = pos.current.x < screenW / 2 ? 10 : screenW - btnWidth - 10;

    animateTo(targetX);
  };

  const smoothUpdate = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      btnRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
    });
  };

  // Smooth edge-snapping animation
  const animateTo = (targetX) => {
    const speed = 0.2;

    const animate = () => {
      const dx = targetX - pos.current.x;

      if (Math.abs(dx) < 1) {
        pos.current.x = targetX;
        smoothUpdate();
        return;
      }

      pos.current.x += dx * speed;
      smoothUpdate();
      raf.current = requestAnimationFrame(animate);
    };

    animate();
  };

  return (
    <button
      ref={btnRef}
      onMouseDown={startDrag}
      onMouseMove={onDrag}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onTouchStart={startDrag}
      onTouchMove={onDrag}
      onTouchEnd={stopDrag}
      onClick={toggleSidebar}
      className="
        lg:hidden 
        fixed 
        z-[9999]
        p-4
        rounded-full
        bg-gradient-to-br 
        from-[#8B1538] 
        to-[#5C0A0A] 
        text-white 
        shadow-xl 
        border 
        border-rose-700/50 
        opacity-60
        hover:opacity-100
        active:scale-90
        transition-opacity
        duration-200
      "
      style={{
        transform: `translate(${pos.current.x}px, ${pos.current.y}px)`,
        touchAction: "none", // prevents weird scrolling on mobile
      }}
    >
      <i className={`fa-solid ${isOpen ? "fa-times" : "fa-bars"} text-xl`} />
    </button>
  );
}
