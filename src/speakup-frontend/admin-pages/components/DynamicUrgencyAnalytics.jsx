import React, { useEffect, useState } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { analyzeComplaintUrgency } from "../../../services/aiUrgencyService";

const URGENCY_CONFIG = {
  critical: {
    label: 'Critical',
    color: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
  },
  high: {
    label: 'High',
    color: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
  },
  medium: {
    label: 'Medium',
    color: 'linear-gradient(135deg, #ca8a04 0%, #facc15 100%)',
  },
  low: {
    label: 'Low',
    color: 'linear-gradient(135deg, #9ca3af 0%, #d1d5db 100%)',
  },
};

const DynamicUrgencyAnalytics = () => {
  const [urgencyCounts, setUrgencyCounts] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUrgencyData = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'complaints'));
        const counts = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        };

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          
          // Extract text from various fields
          const text =
            data.concernDescription?.toString() ||
            data.incidentDescription?.toString() ||
            data.facilityDescription?.toString() ||
            data.concernFeedback?.toString() ||
            data.otherDescription?.toString() ||
            data.additionalContext?.toString() ||
            data.additionalNotes?.toString() ||
            data.impactExperience?.toString() ||
            data.facilitySafety?.toString() ||
            '';

          // Analyze urgency
          const analysis = await analyzeComplaintUrgency(text);
          
          if (analysis && analysis.urgency) {
            const urgencyKey = analysis.urgency.toLowerCase();
            if (counts.hasOwnProperty(urgencyKey)) {
              counts[urgencyKey]++;
            }
          } else {
            // Default to low if no analysis available
            counts.low++;
          }
        }

        setUrgencyCounts(counts);
      } catch (err) {
        console.error('Error fetching urgency data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUrgencyData();
  }, []);

  // Calculate max value for scaling
  const maxUrgencyValue = Math.max(...Object.values(urgencyCounts), 1);

  if (loading) {
    return (
      <section className="bg-white rounded-2xl p-6 md:p-8 lg:p-10 shadow-lg">
        <header className="mb-6 md:mb-8 pb-6 border-b-2 border-gray-100">
          <h2 className="text-2xl md:text-2xl font-bold text-gray-900 mb-2">
            Urgency Breakdown
          </h2>
          <p className="text-gray-500 text-sm font-medium">Priority distribution</p>
        </header>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800"></div>
            <span className="text-sm font-medium text-gray-500">
              Analyzing complaints...
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl p-6 md:p-8 lg:p-10 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <header className="mb-6 md:mb-8 pb-6 border-b-2 border-gray-100">
        <h2 className="text-2xl md:text-2xl font-bold text-gray-900 mb-2">
          Urgency Breakdown
        </h2>
        <p className="text-gray-500 text-sm font-medium">Priority distribution</p>
      </header>

      <div className="flex items-end justify-around h-64 gap-4 md:gap-8 p-4 md:p-8 bg-gradient-to-b from-gray-50 to-white rounded-xl">
        {Object.entries(URGENCY_CONFIG).map(([key, config]) => (
          <div
            key={key}
            className="flex-1 flex flex-col items-center h-full max-w-24 md:max-w-32"
          >
            <div
              className="w-full max-w-14 md:max-w-20 rounded-t-xl transition-all duration-500 min-h-2 relative shadow-lg hover:shadow-xl hover:-translate-y-2 hover:scale-105"
              style={{
                height: `${(urgencyCounts[key] / maxUrgencyValue) * 100}%`,
                background: config.color,
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-xl"></div>
            </div>
            <p className="mt-4 md:mt-6 text-2xl md:text-3xl font-extrabold text-gray-900">
              {urgencyCounts[key]}
            </p>
            <p className="mt-1 md:mt-2 text-xs md:text-sm font-semibold text-gray-600">
              {config.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DynamicUrgencyAnalytics;