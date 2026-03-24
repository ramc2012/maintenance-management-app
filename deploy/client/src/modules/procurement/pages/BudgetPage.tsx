import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ProcurementLayout } from '../components/ProcurementLayout';
import { useAuth } from '../../../context/AuthContext';
import { useTheme, getColorClass } from '../../../context/ThemeContext';
import { DollarSign, Plus, X, Folder } from 'lucide-react';

interface Department { id: string; name: string; }
interface Company { id: string; name: string; departments: Department[]; }
interface Budget {
  id: string;
  departmentId?: string;
  department?: { id: string; name: string };
  fy: string;
  category: string;
  amount: number;
}

const CATEGORIES = ['STORES', 'SPARES', 'SERVICES', 'CAPITAL', 'PETTY'];
const FY_OPTIONS = ['2023-24', '2024-25', '2025-26'];

export const BudgetPage = () => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [orgData, setOrgData] = useState<Company | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedFY, setSelectedFY] = useState('2024-25');
    
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [budgetAmounts, setBudgetAmounts] = useState<Record<string, string>>({
        STORES: '', SPARES: '', SERVICES: '', CAPITAL: '', PETTY: ''
    });

    const { token } = useAuth();
    const { accentColor } = useTheme();

    useEffect(() => {
        if (token) { fetchBudgets(); fetchOrg(); }
    }, [token, selectedFY]);

    const fetchBudgets = async () => {
        try {
            const response = await axios.get('/api/budgets', { params: { fy: selectedFY } });
            setBudgets(response.data);
        } catch (error) { console.error(error); }
    };

    const fetchOrg = async () => {
        try {
            const response = await axios.get('/api/org/hierarchy');
            setOrgData(response.data);
        } catch (error) { console.error(error); }
    };

    const handleSaveBudgets = async () => {
        try {
            for (const [category, amount] of Object.entries(budgetAmounts)) {
                if (amount && parseFloat(amount) > 0) {
                    await axios.post('/api/budgets', {
                        fy: selectedFY, category, amount: parseFloat(amount),
                        departmentId: selectedDeptId,
                    });
                }
            }
            setShowModal(false);
            setBudgetAmounts({ STORES: '', SPARES: '', SERVICES: '', CAPITAL: '', PETTY: '' });
            setSelectedDeptId('');
            fetchBudgets();
        } catch (error) { console.error(error); alert("Failed to save budgets"); }
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    const buildPivotData = () => {
        const pivot: Record<string, { name: string; budgets: Record<string, number>; total: number }> = {};
        budgets.forEach(b => {
            if (!b.department) return;
            const entityKey = `dept_${b.departmentId}`;
            if (!pivot[entityKey]) pivot[entityKey] = { name: b.department.name, budgets: {}, total: 0 };
            pivot[entityKey].budgets[b.category] = (pivot[entityKey].budgets[b.category] || 0) + b.amount;
            pivot[entityKey].total += b.amount;
        });
        return Object.values(pivot);
    };

    const pivotData = buildPivotData();
    const grandTotals = CATEGORIES.reduce((acc, cat) => { acc[cat] = pivotData.reduce((sum, row) => sum + (row.budgets[cat] || 0), 0); return acc; }, {} as Record<string, number>);
    const grandTotal = Object.values(grandTotals).reduce((a, b) => a + b, 0);

    return (
        <ProcurementLayout>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <DollarSign className="w-6 h-6 mr-2 text-green-500" />
                        Budget Management {orgData && `- ${orgData.name}`}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <select value={selectedFY} onChange={e => setSelectedFY(e.target.value)} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white">
                        {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                    </select>
                    <button onClick={() => setShowModal(true)} className={`${getColorClass(accentColor)} text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center hover:opacity-90`}>
                        <Plus className="w-4 h-4 mr-1" /> Add Budget
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50">
                                <th className="text-left px-4 py-3 font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Department</th>
                                {CATEGORIES.map(cat => <th key={cat} className="text-right px-3 py-3 font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">{cat}</th>)}
                                <th className="text-right px-4 py-3 font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-600">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pivotData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                    <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center">
                                            <Folder className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                                            <span className="font-medium text-gray-900 dark:text-white">{row.name}</span>
                                        </div>
                                    </td>
                                    {CATEGORIES.map(cat => <td key={cat} className="text-right px-3 py-3 border-b border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-mono text-xs">{row.budgets[cat] ? formatCurrency(row.budgets[cat]) : '-'}</td>)}
                                    <td className="text-right px-4 py-3 border-b border-gray-100 dark:border-gray-700 font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/30 font-mono text-xs">{formatCurrency(row.total)}</td>
                                </tr>
                            ))}
                            {pivotData.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">No budgets for FY {selectedFY}</td></tr>}
                        </tbody>
                        {pivotData.length > 0 && (
                            <tfoot>
                                <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                                    <td className="px-4 py-3 text-gray-900 dark:text-white">Grand Total</td>
                                    {CATEGORIES.map(cat => <td key={cat} className="text-right px-3 py-3 text-gray-900 dark:text-white font-mono text-xs">{formatCurrency(grandTotals[cat])}</td>)}
                                    <td className="text-right px-4 py-3 text-green-600 dark:text-green-400 font-mono">{formatCurrency(grandTotal)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Allocate Budget - FY {selectedFY}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-4">
                            {/* Department Selection */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Select Department</label>
                                <select value={selectedDeptId} onChange={e => setSelectedDeptId(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white">
                                    <option value="">-- Select --</option>
                                    {orgData?.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            {/* Budget Amounts */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Enter Amounts (INR)</label>
                                <div className="space-y-2">
                                    {CATEGORIES.map(cat => (
                                        <div key={cat} className="flex items-center gap-2">
                                            <span className="text-xs font-semibold w-16 text-gray-600 dark:text-gray-400">{cat}</span>
                                            <input type="number" value={budgetAmounts[cat]} onChange={e => setBudgetAmounts(prev => ({ ...prev, [cat]: e.target.value }))} placeholder="0" className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium">Cancel</button>
                                <button onClick={handleSaveBudgets} disabled={!selectedDeptId} className={`flex-1 ${getColorClass(accentColor)} text-white px-4 py-2 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50`}>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ProcurementLayout>
    );
};
