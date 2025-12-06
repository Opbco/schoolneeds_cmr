import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, BookOpen, School, ArrowLeft, Clock } from 'lucide-react';
import api from '../services/api';


// --- SUB-COMPONENT: TIMETABLE GRID ---
const TimetableGrid = ({ schedule }) => {
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8]; // Assuming 8 periods from DB seed

  const getSlotContent = (day, slotNum) => {
    // Check if break
    if (slotNum === 3 || slotNum === 6) return { isBreak: true };
    
    // Find course in this slot
    const course = schedule.find(s => s.day_of_week === day && s.time_slot_number === slotNum);
    return course || null;
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-6 gap-1 mb-1">
          <div className="bg-gray-100 p-3 rounded font-bold text-gray-500 text-xs text-center uppercase tracking-wider">Time / Day</div>
          {days.map(d => (
            <div key={d} className="bg-indigo-600 text-white p-3 rounded font-bold text-xs text-center uppercase tracking-wider">
              {d.substring(0, 3)}
            </div>
          ))}
        </div>

        {periods.map(period => {
          const isBreak = period === 3 || period === 6;
          const label = isBreak ? 'BREAK' : `Period ${period}`;
          
          return (
            <div key={period} className="grid grid-cols-6 gap-1 mb-1">
              <div className={`p-3 rounded text-xs font-bold flex items-center justify-center ${isBreak ? 'bg-amber-50 text-amber-600' : 'bg-white border text-gray-500'}`}>
                {label}
              </div>
              
              {days.map(day => {
                const content = getSlotContent(day, period);
                
                if (content?.isBreak) {
                  return <div key={`${day}-${period}`} className="bg-amber-50/50 rounded flex items-center justify-center relative">
                    <div className="h-1 w-full bg-amber-200 absolute top-1/2"></div>
                  </div>;
                }

                if (!content) {
                  return <div key={`${day}-${period}`} className="bg-white border border-gray-100 rounded"></div>;
                }

                return (
                  <div key={`${day}-${period}`} className="bg-indigo-50 border border-indigo-200 p-2 rounded flex flex-col justify-center text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                    <span className="text-xs font-bold text-indigo-700 block truncate" title={content.subject_name}>
                      {content.subject_name}
                    </span>
                    <span className="text-[10px] text-gray-500 block truncate">
                      by {content.provider_name}
                    </span>
                    <div className="hidden group-hover:block absolute z-10 bg-black text-white text-xs p-2 rounded shadow-lg -mt-10 ml-4 w-48 text-left">
                      <p className="font-bold">{content.subject_name}</p>
                      <p>Provider: {content.provider_name}</p>
                      <p>{content.start_time} - {content.end_time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
const NetworkDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview'); // overview, courses, timetable

  const { data: network, isLoading } = useQuery({
    queryKey: ['network', id],
    queryFn: async () => (await api.get(`schools/networks/${id}`)).data
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Network Details...</div>;
  if (!network) return <div className="p-8 text-center text-red-500">Network not found.</div>;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      {/* Breadcrumb */}
      <Link to="/networks" className="flex items-center text-sm text-gray-500 hover:text-indigo-600 mb-6 w-fit">
        <ArrowLeft size={16} className="mr-1" /> Back to Networks
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{network.name}</h1>
            <p className="text-gray-500 mt-1">
              Simulation Radius: <span className="font-medium text-gray-800">{network.simulation_radius_km} km</span> • Status: <span className="font-medium text-indigo-600">{network.status}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('timetable')}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <Calendar size={16} className="mr-2"/> View Timetable
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-8 border-b border-gray-100">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Overview & Members
          </button>
          <button 
            onClick={() => setActiveTab('courses')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'courses' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Virtual Courses
          </button>
          <button 
            onClick={() => setActiveTab('timetable')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'timetable' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Network Timetable
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="animate-in fade-in duration-300">
        
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Card */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Network Summary</h3>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">Total Schools</span>
                  <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{network.members.length}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">Virtual Classes</span>
                  <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{network.virtual_courses.length}</span>
                </div>
              </div>
            </div>

            {/* Members List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <School size={18} className="text-indigo-500"/> Participating Schools
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {network.members.map(member => (
                    <div key={member.school_id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <Link to={`/school/${member.school_id}`} className="font-medium text-indigo-600 hover:underline">
                          {member.school_name}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">{member.region} - {member.division}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        member.role === 'PROVIDER' ? 'bg-green-50 text-green-700 border-green-200' :
                        member.role === 'RECEIVER' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: COURSES */}
        {activeTab === 'courses' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-500"/> Virtual Course Catalog
              </h3>
              <span className="text-xs text-gray-500">{network.virtual_courses.length} courses active</span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-4 font-medium">Subject</th>
                  <th className="p-4 font-medium">Class Level</th>
                  <th className="p-4 font-medium">Provider School</th>
                  <th className="p-4 font-medium text-center">Hours/Week</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {network.virtual_courses.map(vc => (
                  <tr key={vc.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{vc.subject_name}</td>
                    <td className="p-4 text-gray-600">{vc.class_level_name}</td>
                    <td className="p-4 text-indigo-600 font-medium">{vc.provider_school_name}</td>
                    <td className="p-4 text-center font-bold text-gray-700">{vc.hours_per_week}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: TIMETABLE */}
        {activeTab === 'timetable' && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Clock size={18} className="text-indigo-500"/> Multimedia Room Schedule
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-3 h-3 rounded-sm bg-indigo-50 border border-indigo-200 inline-block"></span> Virtual Class
                <span className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-200 inline-block ml-2"></span> Break
              </div>
            </div>
            
            {network.schedule && network.schedule.length > 0 ? (
              <TimetableGrid schedule={network.schedule} />
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-lg">
                <p className="text-gray-400 mb-2">No schedule generated yet.</p>
                <p className="text-sm text-gray-500">Go to the Networks List page to generate timetables.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default NetworkDetail;