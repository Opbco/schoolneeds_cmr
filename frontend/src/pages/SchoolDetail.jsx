import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Trash2, ArrowUpDown, AlertCircle, Save, Users, Briefcase, Activity, UserCog } from 'lucide-react';

// --- SUB-COMPONENT: SCHOOL PERSONNEL LIST & MANAGEMENT ---
const SchoolPersonnelList = ({ schoolId }) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);

  // 1. Fetch staff posted to this specific school
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['schoolPersonnel', schoolId],
    queryFn: async () => {
      // Endpoint updated: /personnel?school_id=...
      const res = await api.get(`/personnel?school_id=${schoolId}`);
      return res.data;
    }
  });

  const staff = staffData?.data || staffData || [];

  // 2. Fetch Reference for Admin Positions
  const { data: adminPositions = [] } = useQuery({ 
    queryKey: ['adminPositions'], 
    queryFn: async () => (await api.get('/schools/admin-positions')).data 
  });

  // 3. Fetch Statuses dynamically
  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => (await api.get('/personnel/statuses')).data
  });

  // 4. Mutation to update staff status/position
  const mutation = useMutation({
    mutationFn: (values) => {
     const matricule = values.matricule; 
     delete values.matricule;
     return api.put(`/personnel/${matricule}`, values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['schoolPersonnel', schoolId]);
      queryClient.invalidateQueries(['schoolReport', schoolId]); 
      setEditingId(null);
      alert('Staff position updated. Needs analysis recalculated.');
    },
    onError: (err) => alert("Failed to update: " + err.message)
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading staff list...</div>;

  return (
    <div className="space-y-4">
      {/* Context Banner */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
        <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-bold">Impact on Pedagogic Balance</p>
          <p>
            Changing a staff member's status (e.g., to "Sick Leave") will automatically 
            exclude their teaching hours from the "Available" pool in the Needs Analysis tab.
          </p>
        </div>
      </div>

      {/* Staff Table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name / Matricule</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teaching Specialty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Function</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status (Position)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {staff.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">No personnel posted to this school.</td></tr>
            ) : (
              staff.map((person) => (
                <tr key={person.matricule} className={editingId === person.matricule ? "bg-yellow-50" : "hover:bg-gray-50 transition-colors"}>
                  {/* Column 1: Identity */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{person.full_name}</div>
                    <div className="text-xs font-mono text-gray-500">{person.matricule}</div>
                  </td>
                  
                  {/* Column 2: Specialty */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {person.domain_name || 'General'}
                    <div className="text-xs text-gray-400">{person.grade_code}</div>
                  </td>

                  {/* Column 2: Specialty */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {person.admin_position_code || 'Teacher'}
                  </td>
                  
                  {editingId === person.matricule ? (
                    // --- EDIT MODE ---
                    <td colSpan="2" className="px-6 py-4">
                      <Formik
                        initialValues={{
                          matricule: person.matricule,
                          full_name: person.full_name,
                          grade_code: person.grade_code || '',
                          teaching_domain_id: person.teaching_domain_id || '',
                          date_of_birth: person.date_of_birth.split('T')[0] || '',
                          status_code: person.status_code || '',
                        }}
                        onSubmit={(values) => mutation.mutate(values)}
                      >
                        {({ isSubmitting }) => (
                          <Form className="flex flex-col sm:flex-row items-center gap-3 w-full">
                            <div className="flex-1 w-full">
                              <label className="block text-xs font-bold text-gray-600 mb-1">Status</label>
                              <Field as="select" name="status_code" className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 bg-white">
                                <option value="">-- Select Status --</option>
                                {statuses.map(s => (
                                  <option key={s.code || s.id} value={s.code || s.id} >
                                    {s.name || s.label}
                                  </option>
                                ))}
                              </Field>
                            </div>

                            <div className="flex gap-2 mt-4 sm:mt-0 self-end">
                              <button 
                                type="submit" 
                                disabled={isSubmitting} 
                                className="bg-green-600 text-white px-3 py-2 rounded text-xs font-medium hover:bg-green-700 shadow-sm"
                              >
                                Save
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setEditingId(null)} 
                                className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded text-xs font-medium hover:bg-gray-50 shadow-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </Form>
                        )}
                      </Formik>
                    </td>
                  ) : (
                    // --- VIEW MODE ---
                    <>
                      {/* Column 3: Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          person.status_code === 'ACTIVE' || person.status === 'Normal Activity' ? 'bg-green-100 text-green-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {person.status_name || person.status || person.status_code}
                        </span>
                      </td>

                      {/* Column 5: Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => setEditingId(person.matricule)} 
                          className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end gap-1 ml-auto"
                        >
                          <UserCog size={16} /> Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: NEEDS CHART ---
const NeedsChart = ({ reportData }) => {
  const processData = () => {
    if (!reportData || !reportData.report) return [];
    let chartData = [];
    Object.keys(reportData.report).forEach(status => {
      reportData.report[status].forEach(item => {
        chartData.push({
          name: item.domain_name,
          needed: item.hours_needed,
          available: item.hours_available,
          balance: item.balance
        });
      });
    });
    return chartData;
  };
  
  const data = processData();
  if (data.length === 0) return <div className="text-gray-500 p-8 text-center bg-gray-50 rounded">No report data generated yet.</div>;
  
  return (
    <div className="h-96 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} fontSize={12} />
          <YAxis />
          <Tooltip />
          <Legend verticalAlign="top"/>
          <ReferenceLine y={0} stroke="#000" />
          <Bar dataKey="needed" fill="#8884d8" name="Hours Needed" />
          <Bar dataKey="available" fill="#82ca9d" name="Hours Available" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- SUB-COMPONENT: STRUCTURE TABLE ---
const StructureTable = ({ data, onDelete }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'class_level_id', direction: 'asc' });
  
  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };
  
  const SortIcon = () => <ArrowUpDown size={14} className="ml-1 inline text-gray-400" />;
  
  if (data.length === 0) return <div className="p-8 text-center bg-gray-50 border rounded text-gray-500">No classes defined for this school structure yet.</div>;

  return (
    <div className="overflow-x-auto border rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th onClick={() => requestSort('class_level_id')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">Class Level <SortIcon /></th>
            <th onClick={() => requestSort('serieCode')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">Series <SortIcon /></th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cycle</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Divisions</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedData.map((row, idx) => (
            <tr key={`${row.class_level_id}-${row.series_id}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.className}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{row.serieCode}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{row.cycle}</td>
              <td className="px-6 py-4 text-sm text-gray-900 text-center font-bold">{row.number_of_divisions}</td>
              <td className="px-6 py-4 text-right text-sm font-medium">
                <button onClick={() => onDelete(row)} className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
const SchoolDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('needs'); // 'needs', 'structure', 'personnel'

  // 1. Fetch School Basic Info
  const { data: school, isLoading: schoolLoading } = useQuery({
    queryKey: ['school', id],
    queryFn: async () => (await api.get(`/schools/${id}`)).data
  });

  // 2. Fetch Needs Report (Only if tab is active)
  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['schoolReport', id],
    queryFn: async () => (await api.get(`/reports/school/${id}/needs`)).data,
    enabled: activeTab === 'needs'
  });

  // 3. Fetch Structure (Only if tab is active)
  const { data: structure = [], isLoading: structureLoading } = useQuery({
    queryKey: ['schoolStructure', id],
    queryFn: async () => (await api.get(`/schools/${id}/structure`)).data,
    enabled: activeTab === 'structure'
  });

  // 4. Reference Data for Structure Form
  const { data: classLevels = [] } = useQuery({ queryKey: ['classLevels'], queryFn: async () => (await api.get('/schools/classes')).data });
  const { data: seriesList = [] } = useQuery({ queryKey: ['seriesList'], queryFn: async () => (await api.get('/schools/series')).data });

  // Mutations for Structure
  const mutation = useMutation({
    mutationFn: (values) => api.post(`/schools/${id}/structure`, values),
    onSuccess: () => { 
        queryClient.invalidateQueries(['schoolStructure', id]); 
        queryClient.invalidateQueries(['schoolReport', id]); 
    },
    onError: (err) => alert("Error updating structure: " + err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (row) => api.delete(`/schools/${id}/structure`, { data: { class_level_id: row.class_level_id, series_id: row.series_id } }),
    onSuccess: () => { 
        queryClient.invalidateQueries(['schoolStructure', id]); 
        queryClient.invalidateQueries(['schoolReport', id]); 
    }
  });

  if (schoolLoading) return <div className="p-10 text-center text-gray-500 font-medium">Loading School Data...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* School Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{school?.name}</h1>
        <div className="text-gray-500 mt-2 flex items-center space-x-2">
           <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">{school?.code}</span>
           <span>{school?.region} • {school?.division}</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'needs', label: 'Needs Analysis', icon: Activity },
            { id: 'structure', label: 'Structure Management', icon: Briefcase },
            { id: 'personnel', label: 'School Personnel', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
        
        {/* TAB 1: NEEDS */}
        {activeTab === 'needs' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Pedagogic Balance</h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">Real-time Calculation</span>
            </div>
            {reportLoading ? (
              <div className="animate-pulse h-64 bg-gray-50 rounded w-full flex items-center justify-center text-gray-400">Loading Report...</div>
            ) : (
              <NeedsChart reportData={report} />
            )}
            {/* Simple Summary Table for Report */}
            {report?.report && (
              <div className="mt-8 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Department</th>
                      <th className="px-4 py-2 text-right">Needed (Hrs)</th>
                      <th className="px-4 py-2 text-right">Available (Hrs)</th>
                      <th className="px-4 py-2 text-right">Balance</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(report.report).map(status => (
                      report.report[status].map((row, idx) => (
                        <tr key={`${status}-${idx}`} className="border-b">
                          <td className="px-4 py-2 font-medium">{row.domain_name}</td>
                          <td className="px-4 py-2 text-right">{row.hours_needed}</td>
                          <td className="px-4 py-2 text-right">{row.hours_available}</td>
                          <td className={`px-4 py-2 text-right font-bold ${row.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {row.balance > 0 ? `+${row.balance}` : row.balance}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              row.balance < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STRUCTURE */}
        {activeTab === 'structure' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Add Class Form */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 shadow-sm">
              <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center"><Save className="mr-2" size={20}/> Add / Update Class</h3>
              <Formik
                initialValues={{ class_level_id: '', series_id: '', number_of_divisions: 1 }}
                validationSchema={Yup.object({ 
                    class_level_id: Yup.number().required('Required'), 
                    series_id: Yup.number().required('Required'), 
                    number_of_divisions: Yup.number().min(1).required('At least 1') 
                })}
                onSubmit={(values, { resetForm }) => { mutation.mutate(values); resetForm(); }}
              >
                {({ isSubmitting }) => (
                  <Form className="flex flex-wrap gap-4 items-end">
                    <div className="w-full sm:w-64">
                      <label className="block text-xs font-bold text-blue-800 mb-1">Class Level</label>
                      <Field as="select" name="class_level_id" className="p-2 border rounded w-full bg-white focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Select --</option>
                        {classLevels.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                      </Field>
                    </div>
                    <div className="w-full sm:w-64">
                      <label className="block text-xs font-bold text-blue-800 mb-1">Series</label>
                      <Field as="select" name="series_id" className="p-2 border rounded w-full bg-white focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Select --</option>
                        {seriesList.map(ser => <option key={ser.id} value={ser.id}>{ser.code} - {ser.name}</option>)}
                      </Field>
                    </div>
                    <div className="w-full sm:w-24">
                      <label className="block text-xs font-bold text-blue-800 mb-1">Divisions</label>
                      <Field name="number_of_divisions" type="number" className="p-2 border rounded w-full bg-white" min="1" />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 shadow-sm">
                        {isSubmitting ? '...' : 'Save'}
                    </button>
                  </Form>
                )}
              </Formik>
            </div>
            
            {/* List */}
            <StructureTable data={structure} onDelete={(row) => deleteMutation.mutate(row)} />
          </div>
        )}

        {/* TAB 3: PERSONNEL (NEW) */}
        {activeTab === 'personnel' && (
          <div className="animate-in fade-in duration-300">
             <SchoolPersonnelList schoolId={id} />
          </div>
        )}

      </div>
    </div>
  );
};

export default SchoolDetail;