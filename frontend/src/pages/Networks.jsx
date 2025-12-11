import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Share2, Plus, ArrowRight, Loader, Search, Filter, BookOpen, CheckCircle } from 'lucide-react';
import api from '../services/api';


const Networks = () => {
  const queryClient = useQueryClient();
  
  // State for Filters & UI
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // 1. Fetch Domains for Filter
  const { data: domains = [] } = useQuery({
    queryKey: ['domains'],
    queryFn: async () => (await api.get('/domaines')).data,
    staleTime: 1000 * 60 * 60
  });

  // 2. Fetch Networks (Filtered)
  const { data: networks = [], isLoading } = useQuery({
    queryKey: ['networks', selectedDomain, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDomain) params.append('teaching_domain_id', selectedDomain);
      if (searchTerm) params.append('search', searchTerm);
      
      const res = await api.get(`/schools/networks?${params.toString()}`);
      return res.data;
    },
    keepPreviousData: true
  });

  // Generate Mutation (No Radius needed now)
  const generateMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      setSuccessMessage(null);
      // Simulate delay for UX
      await new Promise(r => setTimeout(r, 1000)); 
      const res = await api.post('/schools/networks/generate');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['networks']);
      setIsGenerating(false);
      setSuccessMessage('Networks generated based on capacity optimization!');
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: () => {
      setIsGenerating(false);
      alert("Failed to generate networks.");
    }
  });

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Share2 className="text-indigo-600" /> Resource Networks
          </h1>
          <p className="text-gray-500 mt-1">Optimization of school clusters by Teaching Domain.</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={isGenerating}
            className={`flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm ${
              isGenerating 
                ? 'bg-indigo-100 text-indigo-700 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader className="animate-spin mr-2" size={18}/> Optimizing Resources...
              </>
            ) : (
              <>
                <Plus className="mr-2" size={18}/> Generate Optimization
              </>
            )}
          </button>

          {successMessage && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-md border border-green-200 animate-in fade-in slide-in-from-top-2">
              <CheckCircle size={16} /> {successMessage}
            </div>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search networks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        
        <div className="md:w-1/3 relative">
          <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none bg-white"
          >
            <option value="">All Domains</option>
            {domains.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Network Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader className="animate-spin text-indigo-400 h-10 w-10 mb-4" />
          <p className="text-gray-400">Retrieving optimizations...</p>
        </div>
      ) : networks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Share2 className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No Networks Found</h3>
          <p className="text-gray-500 max-w-sm mx-auto mt-2">
            Try adjusting your filters or click <strong>Generate Optimization</strong> to create new resource groups.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {networks.map((network) => (
            <Link 
              to={`/networks/${network.id}`} 
              key={network.id}
              className="group bg-white rounded-xl border border-gray-200 p-0 hover:shadow-lg hover:border-indigo-300 transition-all block relative overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-indigo-600"/>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">{network.domain_name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    network.is_valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {network.is_valid ? 'Balanced' : 'Deficit'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate" title={network.name}>
                  {network.name}
                </h3>
              </div>
              
              {/* Card Stats */}
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-500 text-xs">Total Capacity</p>
                    <p className="font-bold text-gray-900">{network.total_hours_available} hrs</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Max Need</p>
                    <p className="font-bold text-gray-900">{network.max_single_need} hrs</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-400">Created: {new Date(network.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center text-indigo-600 text-sm font-medium gap-1 group-hover:translate-x-1 transition-transform">
                    View <ArrowRight size={14} />
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