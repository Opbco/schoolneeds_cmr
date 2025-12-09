import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Share2, Plus, ArrowRight, Loader, Settings, MapPin, Calendar, CheckCircle } from 'lucide-react';
import api from '../services/api';

const Networks = () => {
  const queryClient = useQueryClient();
  const [radius, setRadius] = useState(50.0);
  
  // Track specific loading states
  const [isGeneratingNetworks, setIsGeneratingNetworks] = useState(false);
  const [isGeneratingSchedules, setIsGeneratingSchedules] = useState(false);
  
  // Success message state
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch Networks
  const { data: networks = [], isLoading } = useQuery({
    queryKey: ['networks'],
    queryFn: async () => (await api.get('schools/networks')).data
  });

  // Generate Networks Mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      setIsGeneratingNetworks(true);
      setSuccessMessage(null);
      // Simulate slight delay for UX if API is instant
      await new Promise(r => setTimeout(r, 800)); 
      const res = await api.post('schools/networks/generate', { radius });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['networks']);
      setIsGeneratingNetworks(false);
      setSuccessMessage('Networks generated successfully! Drafts are ready for review.');
      setTimeout(() => setSuccessMessage(null), 5000); // Hide after 5s
    },
    onError: () => {
      setIsGeneratingNetworks(false);
      alert("Failed to generate networks. Please try again.");
    }
  });

  // Generate Timetables Mutation
  const scheduleMutation = useMutation({
    mutationFn: async () => {
      setIsGeneratingSchedules(true);
      setSuccessMessage(null);
      await new Promise(r => setTimeout(r, 800));
      await api.post('schools/networks/timetable');
    },
    onSuccess: () => {
      setIsGeneratingSchedules(false);
      setSuccessMessage('Timetables generated for all active draft networks.');
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: () => {
      setIsGeneratingSchedules(false);
      alert("Failed to generate timetables.");
    }
  });

  // Check if any action is pending
  const isBusy = isGeneratingNetworks || isGeneratingSchedules;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Share2 className="text-indigo-600" /> School Networks
          </h1>
          <p className="text-gray-500 mt-1">Manage complementary school clusters and resource sharing.</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Controls Container */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 px-2 border-r border-gray-200 mr-2">
              <Settings size={16} className="text-gray-400"/>
              <span className="text-xs font-semibold text-gray-500 uppercase">Radius (km):</span>
              <input 
                type="number" 
                value={radius}
                onChange={(e) => setRadius(parseFloat(e.target.value))}
                className="w-16 p-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                min="1" max="100" step="0.5"
                disabled={isBusy}
              />
            </div>
            
            <button
              onClick={() => generateMutation.mutate()}
              disabled={isBusy}
              className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-all min-w-[160px] ${
                isGeneratingNetworks 
                  ? 'bg-indigo-100 text-indigo-700 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
              } disabled:opacity-70`}
            >
              {isGeneratingNetworks ? (
                <>
                  <Loader className="animate-spin mr-2" size={16}/> Computing...
                </>
              ) : (
                <>
                  <Plus className="mr-2" size={16}/> Generate Networks
                </>
              )}
            </button>

            <button
              onClick={() => scheduleMutation.mutate()}
              disabled={isBusy || networks.length === 0}
              className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-all border min-w-[160px] ${
                isGeneratingSchedules
                  ? 'bg-amber-50 text-amber-700 border-amber-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-indigo-600'
              } disabled:opacity-50`}
            >
              {isGeneratingSchedules ? (
                <>
                  <Loader className="animate-spin mr-2" size={16}/> Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="mr-2" size={16}/> Update Schedules
                </>
              )}
            </button>
          </div>

          {/* Success Notification Toast */}
          {successMessage && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-md border border-green-200 animate-in slide-in-from-top-2 fade-in duration-300">
              <CheckCircle size={16} /> {successMessage}
            </div>
          )}
        </div>
      </div>

      {/* Network Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader className="animate-spin text-indigo-400 h-10 w-10 mb-4" />
          <p className="text-gray-400">Loading existing networks...</p>
        </div>
      ) : networks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Share2 className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No Networks Generated</h3>
          <p className="text-gray-500 max-w-sm mx-auto mt-2">
            Set a radius distance and click <strong>"Generate Networks"</strong> to automatically cluster schools based on complementary needs and excesses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {networks.map((network) => (
            <Link 
              to={`/networks/${network.id}`} 
              key={network.id}
              className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-indigo-300 transition-all block relative overflow-hidden"
            >
              {/* Card Status Indicator Stripe */}
              <div className={`absolute top-0 left-0 w-1 h-full ${network.status === 'VALIDATED' ? 'bg-green-500' : 'bg-amber-400'}`}></div>

              <div className="flex justify-between items-start mb-4 pl-2">
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                  {network.name.split('-')[1] || 'N'}
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                  network.status === 'VALIDATED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {network.status}
                </span>
              </div>
              
              <div className="pl-2">
                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                  {network.name}
                </h3>
                
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <MapPin size={14} className="mr-1" />
                  Radius: {network.simulation_radius_km} km
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                  <span className="text-gray-500 group-hover:text-gray-700">View Details</span>
                  <div className="bg-gray-50 text-gray-400 p-2 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <ArrowRight size={16} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Networks;