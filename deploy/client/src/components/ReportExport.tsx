import React from "react";
import { Download, FileSpreadsheet, Calendar } from "lucide-react";

interface ReportExportProps {
  data: any[];
  filename: string;
  title?: string;
}

export const ReportExport: React.FC<ReportExportProps> = ({ data, filename, title = "Export Report" }) => {
  
  const exportToCSV = (period: 'daily' | 'monthly' | 'yearly') => {
    if (!data || data.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        if (typeof val === "string" && val.includes(",")) return `"${val}"`;
        return val;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = (period: 'daily' | 'monthly' | 'yearly') => {
    if (!data || data.length === 0) {
      alert("No data to export");
      return;
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      period,
      recordCount: data.length,
      data
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${period}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
        <Download className="w-4 h-4" /> Export:
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => exportToCSV('daily')}
          className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center gap-1"
        >
          <Calendar className="w-3 h-3" /> Daily
        </button>
        <button
          onClick={() => exportToCSV('monthly')}
          className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 flex items-center gap-1"
        >
          <FileSpreadsheet className="w-3 h-3" /> Monthly
        </button>
        <button
          onClick={() => exportToCSV('yearly')}
          className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 rounded hover:bg-purple-200 dark:hover:bg-purple-800 flex items-center gap-1"
        >
          <FileSpreadsheet className="w-3 h-3" /> Yearly
        </button>
      </div>
    </div>
  );
};

export default ReportExport;
