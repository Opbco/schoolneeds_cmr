import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, School, ArrowLeft, Map, CheckCircle, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../services/api';
import NetworkMap from '../components/NetworkMap';


// --- MAIN PAGE ---
const NetworkDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview'); // overview, map

  const { data: network, isLoading } = useQuery({
    queryKey: ['network', id],
    queryFn: async () => (await api.get(`/schools/networks/${id}`)).data
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Analysis...</div>;
  if (!network) return <div className="p-8 text-center text-red-500">Network not found.</div>;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      {/* Breadcrumb */}
      <Link to="/networks" className="flex items-center text-sm text-gray-500 hover:text-indigo-600 mb-6 w-fit">
        <ArrowLeft size={16} className="mr-1" /> Back to Networks
      </Link>

      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{network.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                network.is_valid 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {network.is_valid ? 'Valid Group' : 'Insufficient Capacity'}
              </span>
            </div>
            <p className="text-gray-500 flex items-center gap-2">
              Domain: <span className="font-medium text-gray-900">{network.domain_name}</span>
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 text-center">
              <span className="block text-xs text-indigo-600 font-bold uppercase">Members</span>
              <span className="text-xl font-bold text-gray-900">{network.members.length}</span>
            </div>
            <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100 text-center">
              <span className="block text-xs text-green-600 font-bold uppercase">Capacity</span>
              <span className="text-xl font-bold text-gray-900">{network.total_hours_available} h</span>
            </div>
            <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-100 text-center">
              <span className="block text-xs text-red-600 font-bold uppercase">Max Need</span>
              <span className="text-xl font-bold text-gray-900">{network.max_single_need} h</span>
            </div>
          </div>
        </div>

        {/* Validation Message */}
        <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${network.is_valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {network.is_valid ? <CheckCircle className="text-green-600 shrink-0" /> : <AlertCircle className="text-red-600 shrink-0" />}
          <div>
            <h4 className={`text-sm font-bold ${network.is_valid ? 'text-green-800' : 'text-red-800'}`}>
              {network.is_valid ? 'Network Logic Satisfied' : 'Capacity Shortage'}
            </h4>
            <p className={`text-xs mt-1 ${network.is_valid ? 'text-green-700' : 'text-red-700'}`}>
              Total available hours ({network.total_hours_available}) are {network.is_valid ? 'greater than' : 'less than'} the highest single need ({network.max_single_need}).
              {network.is_valid ? ' Resource pooling is viable.' : ' Additional providers needed.'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-8 border-b border-gray-100">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <div className="flex items-center gap-2"><Users size={16}/> Member Schools</div>
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'map' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <div className="flex items-center gap-2"><Map size={16}/> Geographic Map</div>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="animate-in fade-in duration-300">
        
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <School size={18} className="text-indigo-500"/> Participating Schools
              </h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">School Name</th>
                  <th className="p-4 font-medium">Location</th>
                  <th className="p-4 font-medium text-right">Hrs Needed</th>
                  <th className="p-4 font-medium text-right">Hrs Available</th>
                  <th className="p-4 font-medium text-right">Net Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {network.members.map(member => {
                  const balance = member.hours_available - member.hours_needed;
                  return (
                    <tr key={member.school_id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                          member.role === 'PROVIDER' ? 'bg-green-100 text-green-700 border-green-200' :
                          'bg-red-100 text-red-700 border-red-200'
                        }`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-indigo-600">
                        <Link to={`/school/${member.school_id}`} className="hover:underline">
                          {member.school_name}
                        </Link>
                        <div className="text-gray-400 text-xs font-mono">{member.code}</div>
                      </td>
                      <td className="p-4 text-gray-600">
                        {member.division} <span className="text-gray-300">•</span> {member.region}
                      </td>
                      <td className="p-4 text-right text-gray-600">{member.hours_needed}</td>
                      <td className="p-4 text-right text-gray-600">{member.hours_available}</td>
                      <td className="p-4 text-right font-bold">
                        <span className={`flex items-center justify-end gap-1 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {balance >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                          {balance > 0 ? `+${balance}` : balance}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: MAP */}
        {activeTab === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <NetworkMap members={network.members} />
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm h-fit">
              <h4 className="text-sm font-bold text-gray-800 mb-3">Geographic Analysis</h4>
              <p className="text-xs text-gray-500 mb-4">
                This visualization plots the relative position of the schools in the network based on GPS coordinates.
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded border border-gray-100">
                  <span className="text-xs text-gray-400 uppercase block mb-1">Spread</span>
                  <span className="text-sm font-medium text-gray-700">Localized Cluster</span>
                </div>
                <div className="p-3 bg-gray-50 rounded border border-gray-100">
                  <span className="text-xs text-gray-400 uppercase block mb-1">Optimization Strategy</span>
                  <span className="text-sm font-medium text-gray-700">Capacity Pooling (Non-Distance)</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default NetworkDetail;