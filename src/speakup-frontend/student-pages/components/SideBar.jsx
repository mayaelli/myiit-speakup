import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doSignOut } from "../../../firebase/auth";
import DraggableButton from "./DraggableButton";

const SideBar = () => {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(window.innerWidth >= 1024);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const handleLogout = async () => {
    try {
      await doSignOut();
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      clearSession();
      navigate("/login", { replace: true });
    }
  };

  const handleNavigation = (page) => {
    if (window.innerWidth < 1024) setIsOpen(false);

    switch (page) {
      case "dashboard":
        navigate("/dashboard");
        break;
      case "file-complaint":
        navigate("/file-complaint");
        break;
      case "history":
        navigate("/history");
        break;
      case "notifications":
        navigate("/notifications");
        break;
      case "logout":
        const confirmLogout = window.confirm("Are you sure you want to log out?");
        if (confirmLogout) handleLogout();
        break;
    }
  };

  const isActive = (path) =>
    window.location.pathname === path ? "active" : "";

  return (
    <>
      {/* Mobile Toggle Button */}
      <DraggableButton isOpen={isOpen} toggleSidebar={toggleSidebar} />

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <nav
        className={`
          fixed top-0 left-0 h-full 
          w-[260px] lg:w-[300px]
          bg-gradient-to-br from-[#8B1538] via-[#6B1129] to-[#5C0A0A]
          text-white z-[1000]
          shadow-2xl border-r border-rose-800/30
          backdrop-blur-xl
          transform transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="flex flex-col h-full py-6 lg:py-8 px-3 overflow-y-auto custom-scroll">
            
            {/* LOGO SECTION */}
            <div className="px-4 pb-6 mb-6 border-b border-rose-700/40">
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-300/20 blur-xl rounded-full"></div>
                  <img 
                    src="/speakup_logo.png" 
                    alt="SpeakUp Logo" 
                    className="relative w-16 h-16 lg:w-20 lg:h-20 object-contain drop-shadow-2xl"
                    onError={(e) => { 
                      if (e.target.src.endsWith('.png')) {
                        e.target.src = '/speakup_logo.svg';
                      } else if (e.target.src.endsWith('.svg')) {
                        e.target.src = '/speakup_logo.jpg';
                      } else {
                        e.target.style.display = 'none';
                      }
                    }} 
                  />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent drop-shadow-lg">
                    SpeakUp
                  </h1>
                  <p className="text-xs text-rose-200/80 mt-1 font-medium tracking-wide">
                    My.IIT Complaint System
                  </p>
                </div>
              </div>
            </div>

            {/* NAVIGATION LINKS */}
            <ul className="flex flex-col space-y-2 px-2">
              {/* DASHBOARD */}
              <li
                onClick={() => handleNavigation("dashboard")}
                className={`
                  group relative flex items-center gap-3 lg:gap-4 cursor-pointer 
                  px-4 py-3 lg:py-3.5 rounded-xl font-medium text-sm lg:text-base
                  transition-all duration-300
                  ${isActive("/dashboard")
                    ? "bg-gradient-to-r from-amber-400/25 to-yellow-500/15 border-l-4 border-amber-400 text-white shadow-lg shadow-amber-500/20"
                    : "text-rose-100/90 hover:text-white hover:bg-rose-900/30 border-l-4 border-transparent hover:border-rose-600/50"
                  }
                `}
              >
                <i
                  className={`
                    fa-solid fa-home text-lg lg:text-xl transition-all
                    ${isActive("/dashboard") 
                      ? "text-amber-300 scale-110" 
                      : "text-rose-300/70 group-hover:text-amber-300 group-hover:scale-105"
                    }
                  `}
                ></i>
                <span className="font-semibold">Dashboard</span>
              </li>

              {/* FILE COMPLAINT */}
              <li
                onClick={() => handleNavigation("file-complaint")}
                className={`
                  group relative flex items-center gap-3 lg:gap-4 cursor-pointer 
                  px-4 py-3 lg:py-3.5 rounded-xl font-medium text-sm lg:text-base
                  transition-all duration-300
                  ${isActive("/file-complaint")
                    ? "bg-gradient-to-r from-amber-400/25 to-yellow-500/15 border-l-4 border-amber-400 text-white shadow-lg shadow-amber-500/20"
                    : "text-rose-100/90 hover:text-white hover:bg-rose-900/30 border-l-4 border-transparent hover:border-rose-600/50"
                  }
                `}
              >
                <i
                  className={`
                    fa-solid fa-pen-to-square text-lg lg:text-xl transition-all
                    ${isActive("/file-complaint") 
                      ? "text-amber-300 scale-110" 
                      : "text-rose-300/70 group-hover:text-amber-300 group-hover:scale-105"
                    }
                  `}
                ></i>
                <span className="font-semibold">File Complaint</span>
              </li>

              {/* HISTORY */}
              <li
                onClick={() => handleNavigation("history")}
                className={`
                  group relative flex items-center gap-3 lg:gap-4 cursor-pointer 
                  px-4 py-3 lg:py-3.5 rounded-xl font-medium text-sm lg:text-base
                  transition-all duration-300
                  ${isActive("/history")
                    ? "bg-gradient-to-r from-amber-400/25 to-yellow-500/15 border-l-4 border-amber-400 text-white shadow-lg shadow-amber-500/20"
                    : "text-rose-100/90 hover:text-white hover:bg-rose-900/30 border-l-4 border-transparent hover:border-rose-600/50"
                  }
                `}
              >
                <i
                  className={`
                    fa-solid fa-clock-rotate-left text-lg lg:text-xl transition-all
                    ${isActive("/history") 
                      ? "text-amber-300 scale-110" 
                      : "text-rose-300/70 group-hover:text-amber-300 group-hover:scale-105"
                    }
                  `}
                ></i>
                <span className="font-semibold">Complaint History</span>
              </li>

              {/* NOTIFICATIONS */}
              <li
                onClick={() => handleNavigation("notifications")}
                className={`
                  group relative flex items-center gap-3 lg:gap-4 cursor-pointer 
                  px-4 py-3 lg:py-3.5 rounded-xl font-medium text-sm lg:text-base
                  transition-all duration-300
                  ${isActive("/notifications")
                    ? "bg-gradient-to-r from-amber-400/25 to-yellow-500/15 border-l-4 border-amber-400 text-white shadow-lg shadow-amber-500/20"
                    : "text-rose-100/90 hover:text-white hover:bg-rose-900/30 border-l-4 border-transparent hover:border-rose-600/50"
                  }
                `}
              >
                <i
                  className={`
                    fa-solid fa-bell text-lg lg:text-xl transition-all
                    ${isActive("/notifications") 
                      ? "text-amber-300 scale-110" 
                      : "text-rose-300/70 group-hover:text-amber-300 group-hover:scale-105"
                    }
                  `}
                ></i>
                <span className="font-semibold">Notifications</span>
              </li>
            </ul>

            {/* LOGOUT - At bottom */}
            <div className="mt-auto pt-6 px-2 border-t border-rose-700/40">
              <div
                onClick={() => handleNavigation("logout")}
                className="
                  group flex items-center gap-3 lg:gap-4 cursor-pointer 
                  px-4 py-3 lg:py-3.5 rounded-xl font-medium text-sm lg:text-base
                  transition-all duration-300
                  text-rose-100/90
                  bg-rose-950/40 border border-red-400/40
                  hover:bg-gradient-to-r hover:from-red-500/25 hover:to-red-600/15
                  hover:border-red-400/70
                  hover:shadow-lg hover:shadow-red-500/20
                  hover:text-white
                "
              >
                <i className="fa-solid fa-right-from-bracket text-lg lg:text-xl text-red-300/80 group-hover:text-red-200 transition-all group-hover:scale-105"></i>
                <span className="font-semibold">Logout</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Spacer */}
      <div className="hidden lg:block lg:w-[300px]"></div>
    </>
  );
};

export default SideBar;