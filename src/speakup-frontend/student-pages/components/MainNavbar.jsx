import React, { useState, useEffect, useRef } from 'react'; 
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/authContext';
import "@fortawesome/fontawesome-free/css/all.min.css"; 
import { useNotifications } from '../../../contexts/notificationsContext';
import { doSignOut } from "../../../firebase/auth";

const MainNavbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, userRole } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Extract first name for greeting message
    const firstName = currentUser?.displayName?.split(" ")[0] || 
                      currentUser?.email?.split("@")[0] || 
                      "User";

    // Extract full name or default to email prefix
    const userName = currentUser ? currentUser.displayName || currentUser.email.split('@')[0] : "Guest";
    
    const getUserInitials = () => {
        if (!currentUser) return "GU";
        
        if (currentUser.displayName) {
            const nameParts = currentUser.displayName.trim().split(" ");
            
            if (nameParts.length === 1) {
                return nameParts[0].charAt(0).toUpperCase();
            }
            
            const firstInitial = nameParts[0].charAt(0).toUpperCase();
            const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
            
            return firstInitial + lastInitial;
        }
        
        const emailPrefix = currentUser.email.split('@')[0];
        return emailPrefix.substring(0, 2).toUpperCase();
    };
    
    const { unreadCount } = useNotifications();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    const getPageTitle = (path) => {
        const normalizedPath = path.toLowerCase().replace(/^\/|\/$/g, '');
        
        switch (normalizedPath) {
            case "dashboard":
                return "Dashboard";
            case "file-complaint":
                return "File Complaint";
            case "history":
                return "Complaint History";
            case "notifications":
                return "Notifications";
            case "student/login":
            case "login":
                return "Login";
            default:
                if (normalizedPath.startsWith('history/')) {
                    return "Complaint Details"; 
                }
                return "";
        }
    };

    const handleFileComplaint = () => navigate("/file-complaint"); 
    const handleNotifications = () => navigate("/notifications"); 

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    return (
        <nav className="
            student-main-navbar fixed top-0 right-0 z-[999] 
            lg:left-[300px] 
            md:left-[300px] 
            sm:left-0
            left-0
            h-16 sm:h-18 md:h-20 lg:h-[90px]
            bg-white border-b border-slate-200
            shadow-sm
            font-['Poppins']
        ">
            <div className="h-full px-3 sm:px-4 md:px-6 lg:px-10 flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
        
                {/* Left: Page Title Group */}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <p className="text-[0.65rem] sm:text-s lg:text-sm font-medium text-slate-500 -mb-1">
                        {getGreeting()}, {firstName}
                    </p>
                    <h1 className="text-base sm:text-3xl md:text-2xl lg:text-3xl font-bold text-slate-800 truncate">
                        {getPageTitle(location.pathname)}
                    </h1>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4">
                    
                    {/* Notification Bell */}
                    <button 
                        onClick={handleNotifications}
                        className="relative 
                            w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 
                            rounded-lg
                            bg-slate-50 border border-slate-200
                            flex items-center justify-center
                            text-slate-600 
                            text-base sm:text-lg lg:text-xl
                            transition-colors duration-200
                            hover:bg-slate-100 hover:text-[#8B1538]
                            focus:outline-none focus:ring-2 focus:ring-[#8B1538]/20
                            active:bg-slate-200"
                        aria-label={`You have ${unreadCount} unread notifications`}>
                        <i className="fas fa-bell"></i>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 
                                bg-[#8B1538] text-white 
                                text-[0.6rem] sm:text-[0.65rem] font-semibold
                                min-w-[15px] sm:min-w-[16px] 
                                h-[15px] sm:h-[16px] 
                                px-1 rounded-full flex items-center justify-center
                                border-2 border-white">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* File Complaint Button */}
                    <button 
                        onClick={handleFileComplaint}
                        className="flex items-center justify-center gap-1.5 sm:gap-2
                            h-10 sm:h-11 lg:h-12 
                            px-3 sm:px-4 lg:px-6
                            bg-[#8B1538] text-white font-semibold 
                            text-xs sm:text-sm
                            rounded-lg
                            transition-colors duration-200
                            hover:bg-[#6B1129]
                            focus:outline-none focus:ring-2 focus:ring-[#8B1538]/20
                            active:bg-[#5C0A0A]
                            whitespace-nowrap">
                        <i className="fas fa-plus-circle text-xs sm:text-sm lg:text-base"></i>
                        <span className="hidden sm:inline">File New Complaint</span>
                        <span className="sm:hidden">File</span>
                    </button>

                    {/* User Profile Pill with Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={toggleDropdown}
                            className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 
                                px-2 sm:px-3 lg:px-4 
                                py-1.5 sm:py-2 lg:py-2.5 
                                rounded-lg
                                bg-slate-50 border border-slate-200
                                transition-colors duration-200
                                hover:bg-slate-100 hover:border-slate-300
                                focus:outline-none focus:ring-2 focus:ring-[#8B1538]/20
                                active:bg-slate-200">
                            
                            <div className="hidden md:flex flex-col items-end gap-0 min-w-0">
                                <span className="text-xs lg:text-sm font-semibold text-slate-800 
                                    truncate max-w-[80px] lg:max-w-[120px] xl:max-w-[150px]">
                                    {userName}
                                </span>
                                <span className="text-[0.65rem] lg:text-xs font-medium text-slate-500">
                                    {userRole || "Student"}
                                </span>
                            </div>
                            
                            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full
                                bg-[#8B1538] text-white font-bold 
                                text-xs sm:text-sm
                                flex items-center justify-center
                                border-2 border-white shadow-sm">
                                <span>{getUserInitials()}</span>
                            </div>

                            <i className={`fas fa-chevron-down text-[0.6rem] sm:text-xs text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 
                                w-[calc(100vw-2rem)] sm:w-64 
                                max-w-[280px]
                                bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50">
                                {/* User Info Section */}
                                <div className="px-4 py-3 border-b border-slate-100">
                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                        {currentUser?.displayName || 'User'}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                        {currentUser?.email || 'user@example.com'}
                                    </p>
                                </div>

                                {/* Logout Button */}
                                <button
                                    onClick={handleLogout}
                                    className="w-full px-4 py-3 flex items-center gap-3 
                                        text-sm font-medium text-red-600
                                        hover:bg-red-50 transition-colors duration-200
                                        focus:outline-none focus:bg-red-50
                                        active:bg-red-100">
                                    <i className="fas fa-right-from-bracket text-base"></i>
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default MainNavbar;