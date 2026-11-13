import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  Download,
  Trash2,
  Package,
  Search,
  FileText,
  Archive,
  HardDrive,
  Calendar,
} from 'lucide-react';
import { getAllExportedFiles, deleteExportedFile, type StoredFile } from '../lib/fileStorage';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedFiles = await getAllExportedFiles();
      setFiles(storedFiles);
    } catch (err) {
      console.error('Failed to load local vault history:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
      setSearchQuery('');
    }
  }, [isOpen, loadFiles]);

  const handleDownload = (file: StoredFile) => {
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Permanently delete this assignment export from your local vault?')) {
      try {
        await deleteExportedFile(id);
        setFiles((prev) => prev.filter((f) => f.id !== id));
      } catch (err) {
        console.error('Failed to delete file:', err);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-[#131722] border border-[#2a344d] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden relative z-10"
          >
            {/* Header with macOS style dots */}
            <div className="p-4 sm:p-5 border-b border-[#1f2536] bg-[#0f121a] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex gap-1.5 mr-1">
                  <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                  <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                  <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                </div>
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                  <HardDrive size={18} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                    IndexedDB History Vault
                  </h2>
                  <p className="text-xs text-slate-400">
                    Your generated PDF &amp; ZIP assignments stored 100% locally on your machine
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-[#1a2133] rounded-lg transition-all"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Bar Section */}
            <div className="px-5 py-3 bg-[#0d1017] border-b border-[#1f2536] shrink-0">
              <div className="relative flex items-center gap-2.5 px-3 py-2 bg-[#131722] rounded-xl border border-[#262d42] focus-within:border-blue-500 transition-colors">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search previously exported assignments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-full text-slate-200 placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Content List Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Clock className="w-8 h-8 animate-spin text-blue-400 mb-2" />
                  <p className="text-xs">Loading vault from browser storage...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-center px-4">
                  <Package className="w-10 h-10 text-slate-600 mb-2.5" />
                  <p className="text-sm font-medium text-slate-300">No exported assignments yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    {searchQuery
                      ? 'No files matching your search term.'
                      : 'When you export a PDF or ZIP from the canvas, it will automatically be backed up here for instant re-download.'}
                  </p>
                </div>
              ) : (
                filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3.5 bg-[#181d2a] hover:bg-[#1c2233] border border-[#262d42] hover:border-blue-500/40 rounded-xl flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          file.type === 'pdf'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {file.type === 'pdf' ? <FileText size={18} /> : <Archive size={18} />}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {file.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                          <span className="uppercase font-bold text-blue-400">{file.type}</span>
                          <span>•</span>
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {formatDate(file.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleDownload(file)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                        title="Download Again"
                      >
                        <Download size={13} />
                        <span className="hidden sm:inline">Download</span>
                      </button>

                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete from local vault"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-[#0d1017] border-t border-[#1f2536] flex items-center justify-between text-[11px] text-slate-400 px-5">
              <span>{files.length} saved assignment{files.length === 1 ? '' : 's'}</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Zero Cloud Uploads • Private
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
