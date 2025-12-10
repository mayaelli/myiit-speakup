import { useState, useRef } from "react";

function DraggableButton({ isOpen, toggleSidebar }) {
  const buttonRef = useRef(null);
  const [pos, setPos] = useState({ x: 20, y: 100 });
  const [dragging, setDragging] = useState(false);

  const startDrag = (e) => {
    setDragging(true);
  };

  const stopDrag = () => {
    setDragging(false);
  };

  const onDrag = (e) => {
    if (!dragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    setPos({ x: clientX - 30, y: clientY - 30 }); // button center offset
  };

  return (
    <button
      ref={buttonRef}
      onMouseDown={startDrag}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onMouseMove={onDrag}
      onTouchStart={startDrag}
      onTouchEnd={stopDrag}
      onTouchMove={onDrag}
      onClick={toggleSidebar}
      style={{
        left: pos.x,
        top: pos.y,
      }}
      className="
        lg:hidden 
        fixed 
        z-[100] 
        p-3 
        rounded-full 
        bg-gradient-to-br 
        from-[#8B1538] 
        to-[#5C0A0A] 
        text-white 
        shadow-lg 
        border 
        border-rose-700/50 
        opacity-70
        hover:opacity-100
        active:scale-90
        transition-all
        duration-200
        cursor-pointer
      "
    >
      <i
        className={`fa-solid ${
          isOpen ? "fa-times" : "fa-bars"
        } text-xl`}
      ></i>
    </button>
  );
}

export default DraggableButton;