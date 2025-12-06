import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Share2, Plus, ArrowRight, Loader, Settings, MapPin, Trash2 } from 'lucide-react';
import api from '../services/api';

const Networks = () => {
  const queryClient = useQueryClient();
  const [radius, setRadius] = useState(5.0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch Networks
  const { data: networks = [], isLoading } = useQuery({
    queryKey: ['networks'],
    queryFn: async () => (await api.get('schools/networks')).data
  });

  // Generate Mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const res = await api.post('schools/networks/generate', { radius });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['networks']);
      setIsGenerating(false);
    },
    onError: () => setIsGenerating(false)
  });

  // Timetable Gen Mutation
  const scheduleMutation = useMutation({
    mutationFn: async () => await api.post('schools/networks/timetable'),
    onSuccess: () => alert('Timetables generated for all draft networks!')
  });

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

        <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 px-2 border-r border-gray-200 mr-2">
            <Settings size={16} className="text-gray-400"/>
            <span className="text-xs font-semibold text-gray-500 uppercase">Radius (km):</span>
            <input 
              type="number" 
              value={radius}
              onChange={(e) => setRadius(parseFloat(e.target.value))}
              className="w-16 p-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              min="1" max="50" step="0.5"
            />
          </div>
          
          <button
            onClick={() => generateMutation.mutate()}
            disabled={isGenerating}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-70 transition-colors"
          >
            {isGenerating ? <Loader className="animate-spin mr-2" size={16}/> : <Plus className="mr-2" size={16}/>}
            {isGenerating ? 'Computing...' : 'Generate Networks'}
          </button>

          <button
            onClick={() => scheduleMutation.mutate()}
            className="flex items-center justify-center px-4 py-2 bg-white text-indigo-700 border border-indigo-200 text-sm font-medium rounded-md hover:bg-indigo-50 transition-colors"
          >
            Generate Schedules
          </button>
        </div>
      </div>

      {/* Network Grid */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Loading networks...</div>
      ) : networks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <Share2 className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Networks Generated</h3>
          <p className="text-gray-500">Adjust the radius and click "Generate Networks" to cluster schools.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {networks.map((network) => (
            <Link 
              to={`/networks/${network.id}`} 
              key={network.id}
              className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-indigo-300 transition-all block"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                  {network.name.substring(4, 6)}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  network.status === 'VALIDATED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {network.status}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                {network.name}
              </h3>
              
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <MapPin size={14} className="mr-1" />
                Radius: {network.simulation_radius_km} km
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-500">View Details</span>
                <div className="bg-indigo-50 text-indigo-600 p-2 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <ArrowRight size={16} />
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