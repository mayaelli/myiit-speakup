import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SideBar from "../student-pages/components/SideBar";
import MainNavbar from "./components/MainNavbar";
import { useAuth } from "../../contexts/authContext";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase/firebase";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
 
  const [complaints, setComplaints] = useState([]);
  const [complaintsCount, setComplaintsCount] = useState({
    filed: 0,
    pending: 0,
    resolved: 0,
    inProgress: 0,
    closed: 0,
  });
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleComplaintClick = (complaint) => {
    setSelectedComplaint(complaint);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedComplaint(null);
  };

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.log("No user logged in");
          return;
        }

        const complaintsRef = collection(db, "complaints");
        const querySnapshot = await getDocs(complaintsRef);
        
        const complaintList = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter(complaint => complaint.userId === user.uid)
          .sort((a, b) => {
            if (!a.submissionDate) return 1;
            if (!b.submissionDate) return -1;
            return b.submissionDate.toDate() - a.submissionDate.toDate();
          });

        setComplaints(complaintList);

        const statusCounts = {
          filed: 0,
          pending: 0,
          resolved: 0,
          inProgress: 0,
          closed: 0,
        };

        complaintList.forEach((complaint) => {
          // FIX: Default to "pending" if status is missing to match the visual table
          const rawStatus = complaint.status || "pending"; 
          const status = rawStatus.toLowerCase().trim();

          if (status === "filed") statusCounts.filed++;
          else if (status === "closed") statusCounts.closed++;
          else if (status === "resolved") statusCounts.resolved++;
          else if (status === "in-progress") statusCounts.inProgress++;
          else statusCounts.pending++; // Counts "pending" and any other unknown status
        });

        setComplaintsCount(statusCounts);
      } catch (error) {
        console.error("Error fetching complaints:", error);
      }
    };

    fetchComplaints();
  }, [currentUser]);

  const getResolutionRate = () => {
    if (complaints.length === 0) return 0;
    const resolved = complaintsCount.resolved + complaintsCount.closed;
    return Math.round((resolved / complaints.length) * 100);
  };

  const getCategoryBreakdown = () => {
    const categories = {};
    complaints.forEach(complaint => {
      const cat = complaint.category || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  };

  const getAverageResolutionDays = () => {
    const resolvedComplaints = complaints.filter(
      c => (c.status?.toLowerCase() === 'resolved' || c.status?.toLowerCase() === 'closed')
      && c.submissionDate && c.dateResolved
    );
   
    if (resolvedComplaints.length === 0) return null;
   
    const totalDays = resolvedComplaints.reduce((sum, complaint) => {
      const startDate = complaint.submissionDate?.toDate();
      const endDate = complaint.dateResolved?.toDate();
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
   
    return Math.round(totalDays / resolvedComplaints.length);
  };

  const categoryBreakdown = getCategoryBreakdown();
  const avgDays = getAverageResolutionDays();
  const resolutionRate = getResolutionRate();

  const getGradientColors = (index) => {
    const gradients = [
      "from-[#8B0000] to-[#A52A2A]",
      "from-[#FF6B35] to-[#F7931E]",
      "from-[#10B981] to-[#059669]",
      "from-[#6366F1] to-[#8B5CF6]"
    ];
    return gradients[index] || gradients[0];
  };

  const getStatusStyles = (status) => {
    // FIX: Handle missing status gracefully in styles
    const statusLower = (status || 'pending').toLowerCase();
    switch(statusLower) {
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-orange-100 text-orange-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'filed':
        return 'bg-purple-100 text-purple-800';
      case 'closed':
        return 'bg-gray-200 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="flex min-h-screen font-['Inter']">
      <SideBar />

      <div className="flex-1 mt-[90px] p-[30px_50px] overflow-y-auto bg-white">
        <MainNavbar />

        {/* Welcome Section */}
        <div className="mb-5">
          <h3 className="text-base font-semibold text-[#1a1a1a] mb-0.5 tracking-tight">
            Track your complaints and stay updated on their progress
          </h3>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-5">
          {/* Total Complaints */}
          <div className="p-[18px_20px] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] bg-gradient-to-br from-[#8B0000] to-[#A52A2A]">
            <div className="text-[13px] opacity-85 mb-1.5 font-medium uppercase tracking-wider">
              Total Complaints
            </div>
            <div className="text-[35px] font-bold mb-1 leading-none">
              {complaints.length}
            </div>
            <div className="text-xs opacity-80">
              {complaints.length === 0 ? "No complaints filed" :
               complaints.length === 1 ? "1 complaint filed" :
               `${complaints.length} complaints filed`}
            </div>
          </div>

          {/* In Progress */}
          <div className="p-[18px_20px] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] bg-gradient-to-br from-[#FF6B35] to-[#F7931E]">
            <div className="text-[13px] opacity-85 mb-1.5 font-medium uppercase tracking-wider">
              In Progress
            </div>
            <div className="text-[35px] font-bold mb-1 leading-none">
              {complaintsCount.inProgress + complaintsCount.pending + complaintsCount.filed}
            </div>
            <div className="text-xs opacity-80">Currently being reviewed</div>
          </div>

          {/* Resolved */}
          <div className="p-[18px_20px] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] bg-gradient-to-br from-[#10B981] to-[#059669]">
            <div className="text-[13px] opacity-85 mb-1.5 font-medium uppercase tracking-wider">
              Resolved
            </div>
            <div className="text-[35px] font-bold mb-1 leading-none">
              {complaintsCount.resolved + complaintsCount.closed}
            </div>
            <div className="text-xs opacity-80">{resolutionRate}% success rate</div>
          </div>
        </div>

       {/* Recent Complaints Section */}
<div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-200 mb-5">
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-5 border-b border-gray-200">
    <h2 className="text-2xl sm:text-xl lg:text-3xl font-semibold text-gray-900 m-0 tracking-tight">
      Recent Complaints
    </h2>
    {complaints.length > 3 && (
      <button
        onClick={() => navigate('/history')}
        className="px-5 py-2.5 bg-[#8B0000] text-white rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-[#6d0000] hover:shadow-md active:scale-95 whitespace-nowrap"
      >
        View All History
      </button>
    )}
  </div>

  {complaints.length === 0 ? (
    // Empty State
    <div className="text-center py-20 lg:py-24">
      <div className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-5 bg-gray-100 rounded-2xl flex items-center justify-center">
        <i className="fas fa-inbox text-3xl lg:text-4xl text-gray-400"></i>
      </div>
      <h3 className="mb-2 font-semibold text-lg lg:text-xl text-gray-800">
        No complaints yet
      </h3>
      <p className="m-0 text-sm text-gray-500">
        Your submitted complaints will appear here
      </p>
    </div>
  ) : (
    // Complaints Table - Desktop
    <>
      <div className="hidden lg:block overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Description
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[180px]">
                Category
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[140px]">
                Date Filed
              </th>
              <th className="text-center px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider w-[140px]">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {complaints.slice(0, 3).map((complaint, index) => (
              <tr
                key={complaint.id}
                onClick={() => handleComplaintClick(complaint)}
                className="cursor-pointer transition-all duration-150 hover:bg-gray-50 group"
              >
                <td className="px-6 py-4 text-gray-700 font-normal max-w-[500px]">
                  <div className="overflow-hidden text-ellipsis line-clamp-2 leading-relaxed text-sm">
                    {complaint.concernDescription ||
                      complaint.otherDescription ||
                      complaint.incidentDescription ||
                      complaint.facilityDescription ||
                      complaint.concernFeedback ||
                      "No description provided"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200">
                    {complaint.category || "Uncategorized"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-calendar text-gray-400 text-xs"></i>
                    {complaint.submissionDate?.toDate().toLocaleDateString() || "—"}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1.5 rounded-md text-xs font-medium inline-block uppercase tracking-wide ${getStatusStyles(complaint.status)}`}>
                    {complaint.status || "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {complaints.slice(0, 3).map((complaint, index) => (
          <div
            key={complaint.id}
            onClick={() => handleComplaintClick(complaint)}
            className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            <div className="flex justify-between items-start mb-4 gap-3 flex-wrap">
              <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 uppercase tracking-wide">
                {complaint.category || "Uncategorized"}
              </span>
              <span className={`px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wide ${getStatusStyles(complaint.status)}`}>
                {complaint.status || "Pending"}
              </span>
            </div>
            
            <p className="text-sm text-gray-700 font-normal leading-relaxed mb-4 line-clamp-3">
              {complaint.concernDescription ||
                complaint.otherDescription ||
                complaint.incidentDescription ||
                complaint.facilityDescription ||
                complaint.concernFeedback ||
                "No description provided"}
            </p>
            
            <div className="flex items-center text-sm text-gray-600 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <i className="fas fa-calendar text-gray-400 text-xs"></i>
                <span className="text-xs font-medium">{complaint.submissionDate?.toDate().toLocaleDateString() || "—"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )}
</div>

        {/* Secondary Info Grid */}
        {complaints.length > 0 && (
          <div className="grid grid-cols-[2fr_1fr] gap-4">
            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <h3 className="text-sm font-semibold text-[#1a1a1a] m-0 mb-4">
                  Complaints by Category
                </h3>
                <div className="flex flex-col gap-3">
                  {categoryBreakdown.map(([category, count], index) => (
                    <div key={category}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[15px] text-[#333] font-medium">
                          {category}
                        </span>
                        <span className="text-xs text-[#666] font-semibold">
                          {count} ({Math.round((count / complaints.length) * 100)}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#f0f0f0] rounded overflow-hidden">
                        <div 
                          className={`h-full rounded transition-all duration-500 bg-gradient-to-r ${getGradientColors(index)}`}
                          style={{ width: `${(count / complaints.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-semibold text-[#1a1a1a] m-0 mb-4">
                Quick Stats
              </h3>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-[13px] text-[#999] mb-1">
                    Avg. Resolution Time
                  </div>
                  <div className="text-xl font-bold text-[#333]">
                    {avgDays !== null ? `${avgDays} days` : "N/A"}
                  </div>
                </div>
                <div className="h-px bg-[#f0f0f0]"></div>
                <div>
                  <div className="text-[13px] text-[#999] mb-1">
                    Success Rate
                  </div>
                  <div className={`text-xl font-bold ${
                    resolutionRate >= 70 ? 'text-[#10B981]' : 
                    resolutionRate >= 40 ? 'text-[#F7931E]' : 'text-[#EF4444]'
                  }`}>
                    {resolutionRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Complaint Details Modal */}
{showModal && selectedComplaint && (
  <div 
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-5 animate-[fadeIn_0.2s_ease]"
    onClick={closeModal}
  >
    <div 
      className="bg-gradient-to-br from-white to-[#f8f9fa] rounded-xl sm:rounded-2xl max-w-[650px] w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-[slideUp_0.3s_ease] border border-black/5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-[#8B0000] to-[#6d0000] p-4 sm:p-5 flex justify-between items-center">
        <div>
          <h2 className="m-0 mb-1 text-sm sm:text-base font-bold text-white tracking-wide">
            Complaint Details
          </h2>
          <p className="m-0 text-[10px] sm:text-xs text-white/80 font-medium">
            ID: {selectedComplaint.id.slice(-8).toUpperCase()}
          </p>
        </div>
        <button 
          className="bg-white/15 border border-white/20 text-xl sm:text-2xl cursor-pointer text-white p-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full transition-all duration-200 font-light hover:bg-white/25 hover:rotate-90 active:scale-95"
          onClick={closeModal}
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 lg:p-6 overflow-y-auto max-h-[calc(90vh-140px)] sm:max-h-[calc(85vh-140px)]">
        {/* Status & Category Badges */}
        <div className="flex gap-2 sm:gap-2.5 mb-4 sm:mb-5 flex-wrap">
          <span className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold inline-block tracking-wide uppercase ${getStatusStyles(selectedComplaint.status)}`}>
            {selectedComplaint.status || "Pending"}
          </span>
          <span className="text-[10px] sm:text-xs px-3 sm:px-3.5 py-1.5 sm:py-2 bg-[#f0f0f0] text-[#555] rounded-lg sm:rounded-xl font-semibold tracking-wide uppercase">
            {selectedComplaint.category || "Uncategorized"}
          </span>
        </div>

        {/* Description */}
        <div className="bg-white p-4 sm:p-5 rounded-lg sm:rounded-xl mb-4 sm:mb-5 border border-[#e8e8e8] shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
          <div className="text-[9px] sm:text-[10px] text-[#999] uppercase tracking-[0.8px] mb-2 sm:mb-2.5 font-bold">
            Description
          </div>
          <div className="text-xs sm:text-sm text-[#2a2a2a] leading-relaxed">
            {selectedComplaint.concernDescription ||
              selectedComplaint.otherDescription ||
              selectedComplaint.incidentDescription ||
              selectedComplaint.facilityDescription ||
              selectedComplaint.concernFeedback ||
              "No description provided"}
          </div>
        </div>

        {/* Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 mb-4 sm:mb-5">
          {/* Date Filed */}
          <div className="bg-white p-4 sm:p-5 rounded-lg sm:rounded-xl border border-[#e8e8e8]">
            <div className="text-[9px] sm:text-[10px] text-[#999] uppercase tracking-[0.8px] mb-2 font-bold">
              Date Filed
            </div>
            <div className="text-xs sm:text-sm text-[#2a2a2a] font-semibold">
              {selectedComplaint.submissionDate?.toDate().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }) || "—"}
            </div>
            <div className="text-[9px] sm:text-[10px] text-[#777] mt-1">
              {selectedComplaint.submissionDate?.toDate().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          {/* Status Card */}
          {(selectedComplaint.status?.toLowerCase() === 'resolved' || selectedComplaint.dateResolved) ? (
            <div className="p-4 sm:p-5 rounded-lg sm:rounded-xl text-white bg-gradient-to-br from-[#10B981] to-[#059669]">
              <div className="text-[9px] sm:text-[10px] opacity-90 uppercase tracking-[0.8px] mb-2 font-bold">
                ✓ Resolved
              </div>
              <div className="text-xs sm:text-sm font-semibold">
                {selectedComplaint.dateResolved ? 
                  selectedComplaint.dateResolved.toDate().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : "Date Not Available"
                }
              </div>
              <div className="text-[9px] sm:text-[10px] opacity-90 mt-1">
                {selectedComplaint.dateResolved ? 
                  selectedComplaint.dateResolved.toDate().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : "Details Missing"
                }
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-lg sm:rounded-xl text-white bg-gradient-to-br from-[#FF6B35] to-[#F7931E]">
              <div className="text-[9px] sm:text-[10px] opacity-90 uppercase tracking-[0.8px] mb-2 font-bold">
                Status
              </div>
              <div className="text-xs sm:text-sm font-semibold capitalize">
                {selectedComplaint.status || "Pending"}
              </div>
              <div className="text-[9px] sm:text-[10px] opacity-90 mt-1">
                {selectedComplaint.status === 'In Progress' ? "Being reviewed" : "Current Status"}
              </div>
            </div>
          )}
        </div>

        {/* Additional Notes */}
        {selectedComplaint.additionalNotes && (
          <div className="bg-white p-4 sm:p-5 rounded-lg sm:rounded-xl mb-4 sm:mb-5 border border-[#e8e8e8] shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
            <div className="text-[9px] sm:text-[10px] text-[#999] uppercase tracking-[0.8px] mb-2 sm:mb-2.5 font-bold">
              Additional Notes
            </div>
            <div className="text-xs sm:text-sm text-[#2a2a2a] leading-relaxed">
              {selectedComplaint.additionalNotes}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 sm:p-5 border-t border-[#e8e8e8] bg-white flex justify-end">
        <button 
          className="px-5 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-br from-[#8B0000] to-[#6d0000] text-white border-none rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all duration-200 tracking-wider uppercase shadow-[0_2px_8px_rgba(139,0,0,0.2)] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(139,0,0,0.3)] active:scale-95"
          onClick={closeModal}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;