import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import SchoolMap from '../components/SchoolMap';
import useSchoolDistance from '../hooks/useSchoolDistance';
import { Map, List, Search, Ruler, RefreshCw, CircleDashed, BookOpen, TrendingDown, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [viewMode, setViewMode] = useState('list');
  // Sorting State
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [filters, setFilters] = useState({
    region: '',
    division: '',
    search: '',
    subject_id: '',
    balance_status: '' // 'deficit' | 'surplus'
  });

  // Updated Hook Destructuring
  const {
    isMeasuring,
    startMeasuring,
    stopMeasuring,
    resetAnchor,
    anchorSchool,
    targetSchool,
    distance,
    radius,
    setRadius,
    selectSchool
  } = useSchoolDistance();

  // 1. Fetch Domains for Filter Dropdown
  const { data: domains = [] } = useQuery({
    queryKey: ['domains'],
    queryFn: async () => (await api.get('schools/domaines')).data,
    staleTime: 1000 * 60 * 60 // 1 hour
  });

  // 2. Fetch Schools (Now passing ALL filters to backend)
  const { data: schools = [], isLoading, error } = useQuery({
    queryKey: ['schools', filters.region, filters.division, filters.subject_id, filters.balance_status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.region) params.append('region', filters.region);
      if (filters.division) params.append('division', filters.division);
      if (filters.subject_id) params.append('subject_id', filters.subject_id);
      if (filters.balance_status) params.append('balance_status', filters.balance_status);
      
      const response = await api.get(`/schools?${params.toString()}`);
      return response.data;
    },
    keepPreviousData: true
  });

  const regions = useMemo(() => {
    if (!schools) return [];
    return [...new Set(schools.map(s => s.region))].filter(Boolean).sort();
  }, [schools]);

  const divisions = useMemo(() => {
    if (!schools) return [];
    let filtered = schools;
    if (filters.region) {
      filtered = schools.filter(s => s.region === filters.region);
    }
    return [...new Set(filtered.map(s => s.division))].filter(Boolean).sort();
  }, [schools, filters.region]);

  const filteredSchools = useMemo(() => {
    if (!Array.isArray(schools)) return [];
    if (!filters.search) return schools;
    return schools.filter(school => 
      school.name.toLowerCase().includes(filters.search.toLowerCase())
    );
  }, [schools, filters.search]);

  const sortedSchools = useMemo(() => {
    if (!Array.isArray(schools)) return [];
    
    // 1. Filter by Search
    let processed = schools;
    if (filters.search) {
        processed = processed.filter(school => 
            school.name.toLowerCase().includes(filters.search.toLowerCase())
        );
    }

    // 2. Sort Data
    if (sortConfig.key) {
        processed = [...processed].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Handle numeric sorting for balance
            if (sortConfig.key === 'filtered_subject_balance') {
                // Treat undefined/null as 0 for sorting purposes
                aValue = aValue !== undefined && aValue !== null ? Number(aValue) : -Infinity;
                bValue = bValue !== undefined && bValue !== null ? Number(bValue) : -Infinity;
            } else if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return processed;
  }, [schools, filters.search, sortConfig]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'region' ? { division: '' } : {})
    }));
  };

  const handleResetFilters = () => {
    setFilters({ region: '', division: '', search: '', subject_id: '', balance_status: '' });
    setSortConfig({ key: 'name', direction: 'asc' });
  };

   // --- CSV EXPORT LOGIC ---
  const handleExportCSV = () => {
    if (sortedSchools.length === 0) return;

    // Define Headers
    let csvContent = "School Code,School Name,Region,Division";
    if (filters.subject_id) {
        csvContent += `,Subject,Hours Balance`;
    }
    csvContent += "\n";

    // Define Rows
    sortedSchools.forEach(school => {
        let row = `"${school.code}","${school.name}","${school.region}","${school.division}"`;
        
        if (filters.subject_id) {
            const subjectName = school.filtered_subject_name || "N/A";
            const balance = school.filtered_subject_balance !== undefined ? school.filtered_subject_balance : 0;
            row += `,"${subjectName}","${balance}"`;
        }
        csvContent += row + "\n";
    });

    // Create Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `schools_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Helper for Balance Badge
  const BalanceBadge = ({ balance }) => {
    if (balance === undefined || balance === null) return null;
    const isDeficit = balance < 0;
    const colorClass = isDeficit ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
    const Icon = isDeficit ? TrendingDown : TrendingUp;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${colorClass}`}>
        <Icon size={12} className="mr-1"/>
        {balance > 0 ? `+${balance}` : balance} hrs
      </span>
    );
  };

  // Helper for Sort Icon
  const SortIndicator = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 text-gray-300 inline" />;
    return sortConfig.direction === 'asc' 
        ? <ArrowUp size={14} className="ml-1 text-indigo-600 inline" />
        : <ArrowDown size={14} className="ml-1 text-indigo-600 inline" />;
  };


  if (isLoading) return <div className="p-10 text-center">Loading Data...</div>;
  if (error) return <div className="p-10 text-center text-red-500">Error loading schools.</div>;

    return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Carte Scolaire</h1>
            <p className="text-sm text-gray-500">
              Showing {sortedSchools.length} schools
              {filters.subject_id && ` matching pedagogic criteria`}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0 items-center">
            <button
                onClick={handleExportCSV}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 shadow-sm transition-colors mr-2"
                disabled={sortedSchools.length === 0}
            >
                <Download size={16} className="mr-2" /> Export CSV
            </button>

            <div className="bg-white border rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <List size={16} className="mr-2" /> List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'map' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Map size={16} className="mr-2" /> Map
              </button>
            </div>

            {viewMode === 'map' && (
              <button
                onClick={isMeasuring ? stopMeasuring : startMeasuring}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold border shadow-sm transition-all ${
                  isMeasuring 
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Ruler size={16} className="mr-2" />
                {isMeasuring ? 'Exit Measure Mode' : 'Measure Distance'}
              </button>
            )}

            {viewMode === 'map' && isMeasuring && anchorSchool && (
              <div className="flex items-center bg-white border border-blue-200 rounded-lg shadow-sm px-3 py-1.5">
                <CircleDashed size={16} className="text-blue-500 mr-2" />
                <span className="text-xs font-bold text-gray-600 mr-2 uppercase">Radius (km):</span>
                <input 
                  type="number" 
                  min="1" 
                  max="500"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-16 p-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            {viewMode === 'map' && isMeasuring && anchorSchool && (
              <button
                onClick={resetAnchor}
                className="flex items-center px-4 py-2 rounded-lg text-sm font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 shadow-sm"
              >
                <RefreshCw size={16} className="mr-2" />
                Reset Anchor
              </button>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
          
          <div className="w-full md:w-auto flex-grow grid grid-cols-2 gap-4 border-r border-gray-100 pr-4 mr-2">
             <div className="w-full">
                <label className="block text-xs font-semibold text-indigo-600 mb-1 uppercase flex items-center">
                  <BookOpen size={12} className="mr-1"/> Subject
                </label>
                <select
                  name="subject_id"
                  value={filters.subject_id}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-indigo-100 rounded-md bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                >
                  <option value="">-- Any Subject --</option>
                  {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
             </div>
             <div className="w-full">
                <label className="block text-xs font-semibold text-indigo-600 mb-1 uppercase">Condition</label>
                <select
                  name="balance_status"
                  value={filters.balance_status}
                  onChange={handleFilterChange}
                  disabled={!filters.subject_id}
                  className="w-full p-2 border border-indigo-100 rounded-md bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm disabled:opacity-50"
                >
                  <option value="">All Records</option>
                  <option value="deficit">Needs Only (Deficit)</option>
                  <option value="surplus">Excess Only (Surplus)</option>
                </select>
             </div>
          </div>

          <div className="w-full md:w-1/5">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Region</label>
            <select
              name="region"
              value={filters.region}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded-md bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            >
              <option value="">All Regions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="w-full md:w-1/5">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Division</label>
            <select
              name="division"
              value={filters.division}
              onChange={handleFilterChange}
              disabled={!divisions.length}
              className="w-full p-2 border rounded-md bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm disabled:opacity-50"
            >
              <option value="">All Divisions</option>
              {divisions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="w-full md:w-1/4 flex-grow">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                name="search"
                placeholder="School name..."
                value={filters.search}
                onChange={handleFilterChange}
                className="w-full pl-9 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          <button 
            onClick={handleResetFilters}
            className="px-4 py-2 text-sm text-gray-500 hover:text-red-600 underline"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-[600px]">
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="p-4 border-b font-semibold text-gray-700 w-24 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => requestSort('code')}
                  >
                    Code <SortIndicator columnKey="code" />
                  </th>
                  <th 
                    className="p-4 border-b font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => requestSort('name')}
                  >
                    School Name <SortIndicator columnKey="name" />
                  </th>
                  
                  {/* DYNAMIC SORTABLE COLUMN FOR BALANCE */}
                  {filters.subject_id && (
                    <th 
                      className="p-4 border-b font-semibold text-indigo-700 bg-indigo-50 cursor-pointer hover:bg-indigo-100 transition-colors"
                      onClick={() => requestSort('filtered_subject_balance')}
                    >
                      Pedagogic Balance <SortIndicator columnKey="filtered_subject_balance" />
                    </th>
                  )}

                  <th 
                    className="p-4 border-b font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => requestSort('region')}
                  >
                    Region <SortIndicator columnKey="region" />
                  </th>
                  <th 
                    className="p-4 border-b font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => requestSort('division')}
                  >
                    Division <SortIndicator columnKey="division" />
                  </th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSchools.map((school) => (
                  <tr key={school.id} onClick={() => selectSchool(school)} className={`hover:bg-gray-50 border-b last:border-0 group ${isMeasuring && anchorSchool?.id === school.id ? 'bg-blue-50' : ''}`}>
                    <td className="p-4 text-gray-600 text-sm font-mono">{school.code}</td>
                    <td className="p-4 font-medium text-gray-800">
                      {school.name}
                      {filters.subject_id && school.filtered_subject_name && (
                        <div className="text-xs text-indigo-500 mt-1">
                          {school.filtered_subject_name}
                        </div>
                      )}
                    </td>
                    
                    {filters.subject_id && (
                      <td className="p-4 bg-indigo-50/30">
                        <BalanceBadge balance={school.filtered_subject_balance} />
                      </td>
                    )}

                    <td className="p-4 text-gray-600">{school.region}</td>
                    <td className="p-4 text-gray-600">{school.division}</td>
                    <td className="p-4 text-right">
                      <Link to={`/school/${school.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
                {sortedSchools.length === 0 && (
                  <tr>
                    <td colSpan={filters.subject_id ? 6 : 5} className="p-8 text-center text-gray-500 italic">
                      No schools found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <SchoolMap
            schools={sortedSchools}
            isMeasuring={isMeasuring}
            anchorSchool={anchorSchool}
            targetSchool={targetSchool}
            radius={radius} 
            onSchoolClick={selectSchool}
            distance={distance}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;