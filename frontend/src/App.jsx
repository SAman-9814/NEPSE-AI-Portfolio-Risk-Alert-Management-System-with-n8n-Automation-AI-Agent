import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import { 
  LayoutDashboard, 
  Eye, 
  History, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Moon, 
  Sun, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  Sparkles,
  RefreshCw,
  Search,
  Send,
  MessageSquare,
  Info,
  Menu
} from 'lucide-react';
import { format } from 'date-fns';

// Genuine NEPSE Stocks List
const NEPSE_SYMBOLS = [
  'ADBL', 'AHPC', 'AKJCL', 'AKPL', 'ALICL', 'API', 'AVU', 'BARUN', 'BBC', 'BFC', 
  'BFL', 'BHDC', 'BHRINGI', 'BISHAL', 'BOKL', 'BPCL', 'BSHFL', 'BSL', 'CBBL', 'CBL', 
  'CFCL', 'CGH', 'CHCL', 'CHL', 'CIT', 'CLBSL', 'CORBL', 'CZBIL', 'DDBL', 'DHPL', 
  'DLBSL', 'DODL', 'EBL', 'EDBL', 'EIC', 'FHL', 'FMDBL', 'FOWAD', 'GBIME', 'GBLBS', 
  'GCIL', 'GDBL', 'GHL', 'GIC', 'GIMES1', 'GLBSL', 'GMFBS', 'GPCL', 'GRDBL', 'GUFL', 
  'GVL', 'HAMRO', 'HATHY', 'HBL', 'HDHPC', 'HDL', 'HGI', 'HIDCL', 'HPPL', 'HRL', 
  'HURJA', 'ICFC', 'IGI', 'ILBS', 'JBBL', 'JALPA', 'JEFL', 'JFL', 'JOSHI', 'JSUSD', 
  'JYOTI', 'KBC', 'KBL', 'KDBL', 'KEF', 'KKHC', 'KLBSL', 'KPCL', 'KRBL', 'KSBBL', 
  'LBBL', 'LBL', 'LEC', 'LEMF', 'LGI', 'LICN', 'LLBS', 'LSL', 'MDB', 'MEGA', 
  'MEN', 'MERO', 'MFI', 'MHCL', 'MHL', 'MILD', 'MKJC', 'MLBL', 'MMF1', 'MNBBL', 
  'MNHL', 'MPFL', 'MSBBL', 'MSL', 'MUTUAL', 'NABIL', 'NIB', 'NICA', 'NICGF', 'NICL', 
  'NICLBSL', 'NID', 'NIFRA', 'NIL', 'NIMB', 'NLIC', 'NLICL', 'NMB', 'NMB50', 'NMBHF1', 
  'NMFBS', 'NTC', 'NUBL', 'OLHL', 'PCBL', 'PFL', 'PIC', 'PICL', 'PLI', 'PMHPL', 
  'PRIN', 'PRVU', 'RADHI', 'RBCL', 'RDPL', 'RHGCL', 'RHPL', 'RIHN', 'RLFL', 'RMF1', 
  'RSDC', 'RURU', 'SABSL', 'SADBL', 'SAHAS', 'SANIMA', 'SAPDBL', 'SBDN', 'SBI', 'SBL', 
  'SCB', 'SDESI', 'SEC', 'SFCL', 'SGI', 'SGL', 'SGIC', 'SHINE', 'SHIVM', 'SHL', 
  'SHPC', 'SICL', 'SIFC', 'SIGS2', 'SILS', 'SINDHU', 'SJCL', 'SKBBL', 'SLBBL', 'SLBSL', 
  'SMATA', 'SMFDB', 'SMHL', 'SPDL', 'SRBL', 'SSHL', 'STC', 'SWBHC', 'TBI', 'TPPC', 
  'TRH', 'UAIL', 'UCCL', 'UDL', 'UIDFL', 'UMHL', 'UNHPL', 'UNL', 'UPCL', 'UPPER', 
  'USHEC', 'USHL', 'WNLB', 'YHL'
];

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function App() {
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dbStatus, setDbStatus] = useState('connecting');
  const [isMockMode, setIsMockMode] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Input States
  const [newSymbol, setNewSymbol] = useState('');
  const [newSellPrice, setNewSellPrice] = useState('');
  const [newLossPrice, setNewLossPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Autocomplete Suggestions States
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef(null);

  // Toast State
  const [toasts, setToasts] = useState([]);

  // Floating Gemini Chat Assistant State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Namaste! I am your NEPSE AI Analyst. Ask me anything about your watchlist, recent triggers, or historical logs!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatBottomRef = useRef(null);

  // Filtering / Search / Pagination
  const [alertSearch, setAlertSearch] = useState('');
  const [alertFilter, setAlertFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Selected Item for Details Panel
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Sync dark theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Click outside listener for suggestions
  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll chat window
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  // Mock data definitions
  const mockWatchlist = [
    { _id: '1', symbol: 'NABIL', targetSellPrice: 580, targetLossPrice: 420, status: 'pending' },
    { _id: '2', symbol: 'AHPC', targetSellPrice: 280, targetLossPrice: 200, status: 'triggered', triggeredAt: '2026-06-25T09:10:00.000Z' },
    { _id: '3', symbol: 'SHL', targetSellPrice: 410, targetLossPrice: 310, status: 'pending' },
    { _id: '4', symbol: 'HDL', targetSellPrice: 2500, targetLossPrice: 1900, status: 'pending' }
  ];

  const mockAlerts = [
    {
      _id: 'a1',
      symbol: 'AHPC',
      targetSellPrice: 280,
      targetLossPrice: 200,
      triggerPrice: 282.5,
      triggerType: 'Take Profit 📈',
      triggerTarget: 280,
      recommendation: 'SELL. AHPC reached the target sell price of Rs. 280. The daily volume is tapering off, indicating the upward momentum might slow down. Secure your profits now.',
      timestamp: '2026-06-25T09:10:00.000Z'
    },
    {
      _id: 'a2',
      symbol: 'NICA',
      targetSellPrice: 650,
      targetLossPrice: 510,
      triggerPrice: 508.0,
      triggerType: 'Stop Loss 📉',
      triggerTarget: 510,
      recommendation: 'CUT LOSS. NICA crossed below the Stop Loss threshold of Rs. 510 on high selling volume. The downward pressure is strong; exit to protect capital.',
      timestamp: '2026-06-24T13:45:00.000Z'
    }
  ];

  // Helper to trigger Toast Notifications
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Fetch Data Function
  const fetchData = async () => {
    setLoading(true);
    try {
      const statusRes = await axios.get(`${API_BASE}/api/status`);
      setDbStatus(statusRes.data.database);
      setIsMockMode(false);

      const [watchlistRes, alertsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/watchlist`),
        axios.get(`${API_BASE}/api/alerts`)
      ]);
      setWatchlist(watchlistRes.data);
      setAlerts(alertsRes.data);
    } catch (err) {
      console.warn('Backend unavailable, falling back to mock mode.', err);
      setDbStatus('disconnected');
      setIsMockMode(true);
      setWatchlist(mockWatchlist);
      setAlerts(mockAlerts);
      addToast('Backend offline. Displaying mock data.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    addToast('Dashboard data refreshed.', 'success');
  };

  // Autocomplete change handler
  const handleSymbolChange = (val) => {
    setNewSymbol(val);
    if (!val) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = NEPSE_SYMBOLS.filter(sym => 
      sym.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 6);
    setSuggestions(filtered);
    setShowSuggestions(true);
  };

  // Add Item to Watchlist
  const handleAddStock = async (e) => {
    e.preventDefault();

    if (!newSymbol) {
      addToast('Please enter a stock symbol.', 'error');
      return;
    }

    const cleanSymbol = newSymbol.toUpperCase().trim();

    if (!NEPSE_SYMBOLS.includes(cleanSymbol)) {
      addToast(`"${cleanSymbol}" is not a recognized NEPSE symbol. Please select a valid code.`, 'error');
      return;
    }

    setSubmitting(true);
    const parsedSell = newSellPrice ? parseFloat(newSellPrice) : null;
    const parsedLoss = newLossPrice ? parseFloat(newLossPrice) : null;

    if (isMockMode) {
      const newMockItem = {
        _id: Math.random().toString(),
        symbol: cleanSymbol,
        targetSellPrice: parsedSell,
        targetLossPrice: parsedLoss,
        status: 'pending'
      };

      if (watchlist.some(item => item.symbol === cleanSymbol)) {
        addToast(`Stock ${cleanSymbol} is already in your watchlist.`, 'error');
        setSubmitting(false);
        return;
      }

      setWatchlist([newMockItem, ...watchlist]);
      addToast(`Added ${cleanSymbol} to Watchlist (Mock Mode).`, 'success');
      setNewSymbol('');
      setNewSellPrice('');
      setNewLossPrice('');
      setSuggestions([]);
      setShowSuggestions(false);
      setSubmitting(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/api/watchlist`, {
        symbol: cleanSymbol,
        targetSellPrice: parsedSell,
        targetLossPrice: parsedLoss
      });
      setWatchlist([response.data, ...watchlist]);
      addToast(`Added ${response.data.symbol} to live watchlist!`, 'success');
      setNewSymbol('');
      setNewSellPrice('');
      setNewLossPrice('');
      setSuggestions([]);
      setShowSuggestions(false);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save stock watchlist item.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Item from Watchlist
  const handleDeleteStock = async (id, symbol) => {
    if (isMockMode) {
      setWatchlist(watchlist.filter(item => item._id !== id));
      addToast(`Removed ${symbol} from watchlist.`, 'info');
      return;
    }

    try {
      await axios.delete(`${API_BASE}/api/watchlist/${id}`);
      setWatchlist(watchlist.filter(item => item._id !== id));
      addToast(`Removed ${symbol} from watchlist.`, 'success');
    } catch (err) {
      addToast('Failed to delete stock from watchlist.', 'error');
    }
  };

  // Delete Alert from History
  const handleDeleteAlert = async (id, symbol, e) => {
    e.stopPropagation();
    if (isMockMode) {
      setAlerts(alerts.filter(item => item._id !== id));
      if (selectedAlert?._id === id) setSelectedAlert(null);
      addToast(`Deleted ${symbol} alert log.`, 'info');
      return;
    }

    try {
      await axios.delete(`${API_BASE}/api/alerts/${id}`);
      setAlerts(alerts.filter(item => item._id !== id));
      if (selectedAlert?._id === id) setSelectedAlert(null);
      addToast(`Deleted ${symbol} alert history log.`, 'success');
    } catch (err) {
      addToast('Failed to delete alert history log.', 'error');
    }
  };

  // Floating AI Chat Submission
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setSendingChat(true);

    if (isMockMode) {
      setTimeout(() => {
        let aiReply = "I am currently in Mock Mode because the backend API is disconnected. Connect the Express server to get direct live answers about your real watchlist.";
        if (userMsg.toLowerCase().includes('nabil')) {
          aiReply = "NABIL bank is currently pending in your watchlist. Target profit is Rs. 580 and Stop Loss is Rs. 420. The last live transaction is within normal limits.";
        } else if (userMsg.toLowerCase().includes('alerts') || userMsg.toLowerCase().includes('triggered')) {
          aiReply = "You have 2 triggered alerts logged in your mock history: AHPC (Take Profit at Rs. 280) and NICA (Stop Loss at Rs. 510).";
        }
        setChatMessages(prev => [...prev, { sender: 'ai', text: aiReply }]);
        setSendingChat(false);
      }, 800);
      return;
    }

    try {
      const chatRes = await axios.post(`${API_BASE}/api/chat`, { message: userMsg });
      setChatMessages(prev => [...prev, { sender: 'ai', text: chatRes.data.reply }]);
    } catch (err) {
      addToast('Chat error. Check GEMINI_API_KEY settings.', 'error');
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Connection failed. Please ensure GEMINI_API_KEY is configured in backend/.env' }]);
    } finally {
      setSendingChat(false);
    }
  };

  // KPI calculations
  const totalWatchlist = watchlist.length;
  const activeAlertsCount = alerts.length;
  const pendingProfitCount = watchlist.filter(item => item.status === 'pending' && item.targetSellPrice).length;
  const pendingLossCount = watchlist.filter(item => item.status === 'pending' && item.targetLossPrice).length;

  // Filter Alerts
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.symbol.toLowerCase().includes(alertSearch.toLowerCase());
    const matchesFilter = 
      alertFilter === 'all' ||
      (alertFilter === 'profit' && alert.triggerType.includes('Profit')) ||
      (alertFilter === 'loss' && alert.triggerType.includes('Loss'));
    return matchesSearch && matchesFilter;
  });

  // Alert Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAlerts = filteredAlerts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);

  // ECharts Option
  const getChartOption = (alert) => {
    const accentColor = {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: '#efd5ff' },
        { offset: 1, color: '#515ada' }
      ]
    };
    
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        top: '15%',
        left: '5%',
        right: '5%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['Target Loss', 'Trigger/Live Price', 'Target Profit'],
        axisLine: { lineStyle: { color: isDark ? '#27272a' : '#e4e4e7' } },
        axisLabel: { color: isDark ? '#71717a' : '#71717a', fontSize: 10, fontFamily: 'Inter' }
      },
      yAxis: {
        type: 'value',
        name: 'Price (Rs.)',
        nameTextStyle: { color: isDark ? '#71717a' : '#71717a', fontSize: 10, fontFamily: 'Inter' },
        axisLine: { lineStyle: { color: isDark ? '#27272a' : '#e4e4e7' } },
        axisLabel: { color: isDark ? '#71717a' : '#71717a', fontSize: 10, fontFamily: 'Inter' },
        splitLine: { lineStyle: { color: isDark ? '#18181b' : '#f4f4f5' } }
      },
      series: [
        {
          name: 'Price Metric',
          type: 'bar',
          barWidth: '35%',
          data: [
            {
              value: alert.targetLossPrice || 0,
              itemStyle: { color: '#ef4444' } // Red for Loss target
            },
            {
              value: alert.triggerPrice,
              itemStyle: { color: accentColor, borderRadius: [4, 4, 0, 0] }
            },
            {
              value: alert.targetSellPrice || 0,
              itemStyle: { color: '#10b981' } // Green for profit target
            }
          ],
          label: {
            show: true,
            position: 'top',
            formatter: 'Rs. {c}',
            color: isDark ? '#fafafa' : '#09090b',
            fontFamily: 'JetBrains Mono',
            fontSize: 11
          }
        }
      ]
    };
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-[#08060c] text-zinc-950 dark:text-zinc-50 transition-colors duration-300 relative bg-mesh overflow-hidden">
      
      {/* ==================== Custom Toast Notifications Layer ==================== */}
      <div className="fixed top-4 right-4 z-55 flex flex-col gap-2.5 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`pointer-events-auto bg-white/80 dark:bg-[#130d22]/90 backdrop-blur-md border rounded-2xl shadow-xl p-4 max-w-sm flex items-center gap-3 animate-slide-in transition-all duration-300 ${
              toast.type === 'success' ? 'border-blue-500/30 dark:border-blue-500/20 shadow-blue-500/5' : 
              toast.type === 'error' ? 'border-rose-500/20 dark:border-rose-500/10 shadow-rose-500/5' : 
              toast.type === 'warning' ? 'border-amber-500/20 dark:border-amber-500/10 shadow-amber-500/5' : 
              'border-zinc-200/50 dark:border-zinc-800/40 shadow-blue-500/5'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />}
            
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">
              {toast.message}
            </span>
          </div>
        ))}
      </div>

      {/* Sidebar Backdrop Overlay on Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ==================== 1. Premium Glass Sidebar (Deep Blue Theme) ==================== */}
      <aside className={`w-64 glass-panel border-y-0 border-l-0 flex flex-col justify-between z-40 md:z-10 fixed md:static inset-y-0 left-0 transition-transform duration-300 transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div>
          {/* Logo Section */}
          <div className="p-6 border-b border-zinc-200/40 dark:border-zinc-800/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-blue-600/10 hover:scale-105 transition-transform duration-300 flex-shrink-0">
                <img src="/kairos_logo.png" alt="NEPSE AI Logo" className="w-full h-full object-cover scale-110" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-brand-gradient">
                  NEPSE AI
                </h1>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Risk Manager v1.0</p>
              </div>
            </div>
            {/* Mobile Close Button */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 hover:bg-zinc-950/5 dark:hover:bg-white/5 rounded-lg text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 md:hidden cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative ${
                activeTab === 'dashboard'
                  ? 'bg-zinc-950/5 dark:bg-white/5 text-zinc-950 dark:text-zinc-50 border border-zinc-200/30 dark:border-zinc-700/20 shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-950/2 dark:hover:bg-white/2 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              {activeTab === 'dashboard' && <span className="absolute left-1.5 w-1 h-5 bg-blue-600 rounded-full"></span>}
              <LayoutDashboard className="w-4 h-4" />
              Overview Dashboard
            </button>
            <button
              onClick={() => { setActiveTab('watchlist'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative ${
                activeTab === 'watchlist'
                  ? 'bg-zinc-950/5 dark:bg-white/5 text-zinc-950 dark:text-zinc-50 border border-zinc-200/30 dark:border-zinc-700/20 shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-950/2 dark:hover:bg-white/2 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              {activeTab === 'watchlist' && <span className="absolute left-1.5 w-1 h-5 bg-blue-600 rounded-full"></span>}
              <Eye className="w-4 h-4" />
              Watchlist Manager
            </button>
            <button
              onClick={() => { setActiveTab('history'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative ${
                activeTab === 'history'
                  ? 'bg-zinc-950/5 dark:bg-white/5 text-zinc-950 dark:text-zinc-50 border border-zinc-200/30 dark:border-zinc-700/20 shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-950/2 dark:hover:bg-white/2 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              {activeTab === 'history' && <span className="absolute left-1.5 w-1 h-5 bg-blue-600 rounded-full"></span>}
              <History className="w-4 h-4" />
              Alert History Log
            </button>
          </nav>
        </div>

        {/* Database Status Panel */}
        <div className="p-4 border-t border-zinc-200/40 dark:border-zinc-800/30 space-y-3 bg-zinc-50/20 dark:bg-zinc-950/10">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" /> Database:
            </span>
            <span className={`flex items-center gap-1.5 ${
              dbStatus === 'connected' ? 'text-emerald-505' : 'text-rose-500'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50' : 'bg-rose-500'
              }`}></span>
              {dbStatus}
            </span>
          </div>

          {isMockMode && (
            <div className="bg-amber-500/5 border border-amber-500/10 text-amber-500 text-[10px] p-2.5 rounded-xl flex flex-col gap-1">
              <span className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> MOCK MODE
              </span>
              <span className="leading-normal">Connected to local simulated database.</span>
            </div>
          )}
        </div>
      </aside>

      {/* ==================== 2. Main Page Area ==================== */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Glass Header Row */}
        <header className="h-16 glass-panel border-x-0 border-t-0 px-4 sm:px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 hover:bg-zinc-950/5 dark:hover:bg-white/5 rounded-lg text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 md:hidden cursor-pointer mr-1"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-extrabold tracking-tight">
              {activeTab === 'dashboard' ? 'Market Overview' : activeTab === 'watchlist' ? 'Watchlist Manager' : 'Alert Logs'}
            </h2>
            <button 
              onClick={handleRefresh}
              className={`p-1.5 hover:bg-zinc-950/5 dark:hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 ${
                refreshing ? 'animate-spin' : ''
              }`}
              title="Refresh database data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 hover:bg-zinc-950/5 dark:hover:bg-white/5 rounded-xl text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div className="flex-1 flex overflow-hidden relative">
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 w-full transition-all duration-300">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-semibold text-zinc-500">Retrieving system states...</span>
              </div>
            ) : (
              <>
                {/* A. OVERVIEW DASHBOARD */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-8 animate-fade-in-up">
                    
                    {/* KPI Glass Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="glass-card rounded-2xl p-5 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300 hover:shadow-blue-500/5">
                        <div>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Watched Stocks</span>
                          <h3 className="text-3xl font-extrabold mt-1 font-mono tracking-tight">{totalWatchlist}</h3>
                        </div>
                        <div className="bg-blue-600/10 text-blue-500 p-3 rounded-xl"><Eye className="w-5 h-5" /></div>
                      </div>

                      <div className="glass-card rounded-2xl p-5 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300 hover:shadow-blue-500/5">
                        <div>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Triggered Alerts</span>
                          <h3 className="text-3xl font-extrabold mt-1 font-mono tracking-tight text-cyan-500">{activeAlertsCount}</h3>
                        </div>
                        <div className="bg-cyan-500/10 text-cyan-500 p-3 rounded-xl"><History className="w-5 h-5" /></div>
                      </div>

                      <div className="glass-card rounded-2xl p-5 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300 hover:shadow-blue-500/5">
                        <div>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Profit Targets</span>
                          <h3 className="text-3xl font-extrabold mt-1 font-mono tracking-tight text-emerald-500">{pendingProfitCount}</h3>
                        </div>
                        <div className="bg-emerald-500/10 text-emerald-500 p-3 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                      </div>

                      <div className="glass-card rounded-2xl p-5 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300 hover:shadow-blue-500/5">
                        <div>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Stop Loss Targets</span>
                          <h3 className="text-3xl font-extrabold mt-1 font-mono tracking-tight text-rose-550">{pendingLossCount}</h3>
                        </div>
                        <div className="bg-rose-500/10 text-rose-500 p-3 rounded-xl"><TrendingDown className="w-5 h-5" /></div>
                      </div>
                    </div>

                    {/* Dashboard Sections split */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left: Autocomplete Add Stock Panel */}
                      <div className="glass-card rounded-2xl p-6 space-y-5">
                        <div className="border-b border-zinc-200/40 dark:border-zinc-800/30 pb-4">
                          <h3 className="text-lg font-bold tracking-tight">Fast Watchlist Add</h3>
                          <p className="text-xs text-zinc-500 mt-1">Configure take profit and stop loss boundaries.</p>
                        </div>
                        <form onSubmit={handleAddStock} className="space-y-4">
                          <div className="relative" ref={suggestionRef}>
                            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Stock Symbol</label>
                            <input 
                              type="text" 
                              value={newSymbol}
                              onChange={(e) => handleSymbolChange(e.target.value)}
                              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                              placeholder="Type NEPSE symbol (e.g. NABIL, AHPC)..."
                              className="w-full bg-[#ffffff] dark:bg-[#151124]/50 border border-zinc-200/60 dark:border-zinc-800/50 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 dark:text-zinc-50 mt-1.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all duration-300"
                            />
                            
                            {/* Autocomplete dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                              <ul className="absolute left-0 right-0 z-30 mt-1 bg-white dark:bg-[#130d22] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 max-h-48 overflow-y-auto">
                                {suggestions.map(suggestion => (
                                  <li 
                                    key={suggestion}
                                    onClick={() => {
                                      setNewSymbol(suggestion);
                                      setShowSuggestions(false);
                                    }}
                                    className="px-4 py-2 text-xs font-semibold font-mono hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-800 dark:text-zinc-200"
                                  >
                                    {suggestion}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Take Profit (Rs.)</label>
                              <input 
                                type="number" 
                                value={newSellPrice}
                                onChange={(e) => setNewSellPrice(e.target.value)}
                                placeholder="Target Profit..."
                                className="w-full bg-[#ffffff] dark:bg-[#151124]/50 border border-zinc-200/60 dark:border-zinc-800/50 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 dark:text-zinc-50 mt-1.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all duration-300"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Stop Loss (Rs.)</label>
                              <input 
                                type="number" 
                                value={newLossPrice}
                                onChange={(e) => setNewLossPrice(e.target.value)}
                                placeholder="Stop Loss..."
                                className="w-full bg-[#ffffff] dark:bg-[#151124]/50 border border-zinc-200/60 dark:border-zinc-800/50 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 dark:text-zinc-50 mt-1.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all duration-300"
                              />
                            </div>
                          </div>

                          <button 
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-brand-gradient hover:opacity-90 active:scale-98 text-white py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-700/15 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            {submitting ? 'Processing...' : 'Add to watch list'}
                          </button>
                        </form>
                      </div>

                      {/* Right: Quick Instructions Guide */}
                      <div className="glass-card rounded-2xl p-6 space-y-4">
                        <div className="border-b border-zinc-200/40 dark:border-zinc-800/30 pb-4">
                          <h3 className="text-lg font-bold tracking-tight">Risk Management Guide</h3>
                          <p className="text-xs text-zinc-500 mt-1">Understanding stock alert triggers.</p>
                        </div>
                        <ul className="space-y-4 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                          <li className="flex gap-3">
                            <span className="text-blue-500 font-bold font-mono text-sm">1.</span>
                            <span className="leading-relaxed">**Take Profit targets** trigger instant green email and WhatsApp messages once the stock price meets or exceeds the target.</span>
                          </li>
                          <li className="flex gap-3">
                            <span className="text-rose-500 font-bold font-mono text-sm">2.</span>
                            <span className="leading-relaxed">**Stop Loss boundaries** alert you instantly in red when the price drops below your protection threshold.</span>
                          </li>
                          <li className="flex gap-3">
                            <span className="text-cyan-500 font-bold font-mono text-sm">3.</span>
                            <span className="leading-relaxed">**Gemini Stock Analyst** automatically writes dynamic recommendations (Sell, Hold, Cut-Loss) based on momentum data.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* B. WATCHLIST MANAGER */}
                {activeTab === 'watchlist' && (
                  <div className="space-y-6 animate-fade-in-up">
                    {/* Add Form Card */}
                    <div className="glass-card rounded-2xl p-6" ref={suggestionRef}>
                      <div className="border-b border-zinc-200/40 dark:border-zinc-800/30 pb-4 mb-5">
                        <h3 className="text-lg font-bold tracking-tight">Add Watchlist Target</h3>
                        <p className="text-xs text-zinc-500 mt-1">Configure take profit and stop loss prices for a NEPSE stock.</p>
                      </div>
                      <form onSubmit={handleAddStock} className="flex flex-col md:flex-row gap-4 items-end relative">
                        <div className="flex-1 w-full relative">
                          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Stock Symbol</label>
                          <input 
                            type="text" 
                            value={newSymbol}
                            onChange={(e) => handleSymbolChange(e.target.value)}
                            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                            placeholder="Type NEPSE symbol (e.g. NABIL, AHPC)..."
                            className="w-full bg-[#ffffff] dark:bg-[#151124]/50 border border-zinc-200/60 dark:border-zinc-800/50 rounded-xl px-3.5 py-2 text-xs text-zinc-950 dark:text-zinc-50 mt-1.5 outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          
                          {/* Suggestions dropdown */}
                          {showSuggestions && suggestions.length > 0 && (
                            <ul className="absolute left-0 right-0 z-30 mt-1 bg-white dark:bg-[#130d22] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 max-h-48 overflow-y-auto">
                              {suggestions.map(suggestion => (
                                <li 
                                  key={suggestion}
                                  onClick={() => {
                                    setNewSymbol(suggestion);
                                    setShowSuggestions(false);
                                  }}
                                  className="px-4 py-2 text-xs font-semibold font-mono hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-800 dark:text-zinc-200"
                                >
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="w-full md:w-56">
                          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Take Profit (Rs.)</label>
                          <input 
                            type="number" 
                            value={newSellPrice}
                            onChange={(e) => setNewSellPrice(e.target.value)}
                            placeholder="Target Profit"
                            className="w-full bg-[#ffffff] dark:bg-[#151124]/50 border border-zinc-200/60 dark:border-zinc-800/50 rounded-xl px-3.5 py-2 text-xs text-zinc-950 dark:text-zinc-50 mt-1.5 outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div className="w-full md:w-56">
                          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Stop Loss (Rs.)</label>
                          <input 
                            type="number" 
                            value={newLossPrice}
                            onChange={(e) => setNewLossPrice(e.target.value)}
                            placeholder="Stop Loss"
                            className="w-full bg-[#ffffff] dark:bg-[#151124]/50 border border-zinc-200/60 dark:border-zinc-800/50 rounded-xl px-3.5 py-2 text-xs text-zinc-950 dark:text-zinc-50 mt-1.5 outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <button 
                          type="submit"
                          disabled={submitting}
                          className="w-full md:w-auto bg-brand-gradient hover:opacity-90 active:scale-98 text-white px-6 py-2.5 h-[37px] rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/5"
                        >
                          <Plus className="w-4 h-4" />
                          {submitting ? 'Saving...' : 'Add'}
                        </button>
                      </form>
                    </div>

                    {/* Watchlist Table Card */}
                    <div className="glass-card rounded-2xl shadow-md overflow-hidden">
                      <div className="p-5 border-b border-zinc-200/40 dark:border-zinc-800/30 flex justify-between items-center">
                        <h3 className="text-md font-bold tracking-tight">Active Watchlist</h3>
                        <span className="text-[10px] font-bold font-mono bg-zinc-950/5 dark:bg-white/5 border border-zinc-200/40 dark:border-zinc-800/30 px-2 py-1 rounded-lg text-zinc-500">
                          {watchlist.length} active stocks
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-50/30 dark:bg-zinc-950/10 text-zinc-500 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-200/40 dark:border-zinc-800/30">
                              <th className="px-6 py-4">Stock Symbol</th>
                              <th className="px-6 py-4">Take Profit</th>
                              <th className="px-6 py-4">Stop Loss</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200/40 dark:divide-zinc-800/30 text-xs font-semibold">
                            {watchlist.length === 0 ? (
                              <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-zinc-400">
                                  No stocks in your watchlist. Fill the form above to add your first stock.
                                </td>
                              </tr>
                            ) : (
                              watchlist.map(stock => (
                                <tr key={stock._id} className="hover:bg-zinc-950/2 dark:hover:bg-white/2 transition-colors">
                                  <td className="px-6 py-4 font-bold font-mono text-sm tracking-tight">{stock.symbol}</td>
                                  <td className="px-6 py-4 font-mono text-emerald-500">
                                    {stock.targetSellPrice ? `Rs. ${stock.targetSellPrice}` : '—'}
                                  </td>
                                  <td className="px-6 py-4 font-mono text-rose-500">
                                    {stock.targetLossPrice ? `Rs. ${stock.targetLossPrice}` : '—'}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wide ${
                                      stock.status === 'pending' 
                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    }`}>
                                      {stock.status === 'pending' ? 'Pending Target' : 'Triggered'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button 
                                      onClick={() => handleDeleteStock(stock._id, stock.symbol)}
                                      className="p-1 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                                      title="Delete stock"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* C. ALERT HISTORY LOG */}
                {activeTab === 'history' && (
                  <div className="space-y-6 animate-fade-in-up">
                    {/* Filters Toolbar */}
                    <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                      {/* Search */}
                      <div className="relative w-full md:w-72">
                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          placeholder="Search stock symbol..."
                          value={alertSearch}
                          onChange={(e) => { setAlertSearch(e.target.value); setCurrentPage(1); }}
                          className="w-full bg-[#ffffff] dark:bg-[#151124]/50 border border-zinc-200/60 dark:border-zinc-800/50 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      
                      {/* Filter Controls */}
                      <div className="bg-zinc-100 dark:bg-zinc-950/20 p-1 rounded-xl flex gap-1 border border-zinc-200/50 dark:border-zinc-800/40 w-full md:w-auto">
                        <button
                          onClick={() => { setAlertFilter('all'); setCurrentPage(1); }}
                          className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            alertFilter === 'all' 
                              ? 'bg-white dark:bg-zinc-800 text-blue-500 shadow-sm border border-zinc-200/40 dark:border-zinc-700/20' 
                              : 'text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                          }`}
                        >
                          All Alerts
                        </button>
                        <button
                          onClick={() => { setAlertFilter('profit'); setCurrentPage(1); }}
                          className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            alertFilter === 'profit' 
                              ? 'bg-white dark:bg-zinc-800 text-blue-500 shadow-sm border border-zinc-200/40 dark:border-zinc-700/20' 
                              : 'text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                          }`}
                        >
                          Take Profit
                        </button>
                        <button
                          onClick={() => { setAlertFilter('loss'); setCurrentPage(1); }}
                          className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            alertFilter === 'loss' 
                              ? 'bg-white dark:bg-zinc-800 text-cyan-500 shadow-sm border border-zinc-200/40 dark:border-zinc-700/20' 
                              : 'text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                          }`}
                        >
                          Stop Loss
                        </button>
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="glass-card rounded-2xl shadow-md overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-50/30 dark:bg-zinc-950/10 text-zinc-500 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-200/40 dark:border-zinc-800/30">
                              <th className="px-6 py-4">Symbol</th>
                              <th className="px-6 py-4">Trigger Type</th>
                              <th className="px-6 py-4">Trigger Price</th>
                              <th className="px-6 py-4">Trigger Target</th>
                              <th className="px-6 py-4">Date/Time</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200/40 dark:divide-zinc-800/30 text-xs font-semibold">
                            {currentAlerts.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-zinc-400">
                                  No triggered alerts found matching your criteria.
                                </td>
                              </tr>
                            ) : (
                              currentAlerts.map(alert => (
                                <tr 
                                  key={alert._id} 
                                  onClick={() => setSelectedAlert(alert)}
                                  className={`cursor-pointer hover:bg-zinc-955/2 dark:hover:bg-white/2 transition-colors ${
                                    selectedAlert?._id === alert._id ? 'bg-blue-500/5 dark:bg-blue-500/5' : ''
                                  }`}
                                >
                                  <td className="px-6 py-4 font-bold font-mono text-sm tracking-tight">{alert.symbol}</td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wide ${
                                      alert.triggerType.includes('Profit') 
                                        ? 'bg-blue-500/10 text-blue-500 border border-blue-600/20' 
                                        : 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
                                    }`}>
                                      {alert.triggerType}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 font-mono font-bold">Rs. {alert.triggerPrice}</td>
                                  <td className="px-6 py-4 font-mono text-zinc-500">Rs. {alert.triggerTarget}</td>
                                  <td className="px-6 py-4 text-[10px] text-zinc-400 font-medium">
                                    {format(new Date(alert.timestamp), 'MMM dd, yyyy - hh:mm a')}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button 
                                      onClick={(e) => handleDeleteAlert(alert._id, alert.symbol, e)}
                                      className="p-1 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                                      title="Delete log entry"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="p-4 border-t border-zinc-200/40 dark:border-zinc-800/30 flex items-center justify-between">
                          <span className="text-xs text-zinc-400 font-medium">
                            Page {currentPage} of {totalPages}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setCurrentPage(1)}
                              disabled={currentPage === 1}
                              className="p-1.5 border border-zinc-200/60 dark:border-zinc-800/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-955/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <ChevronsLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="p-1.5 border border-zinc-200/60 dark:border-zinc-800/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-955/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              className="p-1.5 border border-zinc-200/60 dark:border-zinc-800/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-955/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setCurrentPage(totalPages)}
                              disabled={currentPage === totalPages}
                              className="p-1.5 border border-zinc-200/60 dark:border-zinc-800/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-955/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <ChevronsRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Premium Dashboard Footer */}
                <footer className="mt-12 pt-6 border-t border-zinc-200/30 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-zinc-500 font-bold tracking-wide uppercase">
                  <div className="flex items-center gap-1.5">
                    <span>© {new Date().getFullYear()} NEPSE AI.</span>
                    <span className="text-zinc-400">|</span>
                    <span>All Rights Reserved.</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> API: Connected</span>
                    <span className="text-zinc-400">|</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Gmail Alerts: Active</span>
                    <span className="text-zinc-400">|</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> WhatsApp alerts: Active</span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400 hover:text-zinc-500 transition-colors">
                    <span>Powered by</span>
                    <span className="text-brand-gradient ml-1">Gemini AI</span>
                  </div>
                </footer>
              </>
            )}
          </div>

          {/* D. SLIDE-OUT INVESTIGATION/DETAILS SIDE PANEL */}
          {selectedAlert && (
            <>
              {/* Backdrop overlay for closing details panel when clicking outside */}
              <div 
                className="fixed inset-0 bg-black/30 backdrop-blur-xs z-30"
                onClick={() => setSelectedAlert(null)}
              />
              <div className="fixed md:absolute inset-y-0 right-0 w-full sm:w-[450px] border-l border-zinc-200/40 dark:border-zinc-800/30 glass-panel flex flex-col justify-between overflow-y-auto h-full p-6 shadow-2xl z-40 animate-slide-in">
                
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-zinc-200/40 dark:border-zinc-800/30 pb-4">
                    <div>
                      <h3 className="text-md font-bold tracking-tight">Alert Details</h3>
                      <p className="text-xs text-zinc-500 mt-1">Deep analysis for {selectedAlert.symbol}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedAlert(null)}
                      className="p-1.5 hover:bg-zinc-955/5 dark:hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 cursor-pointer"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  {/* Core Stock Details Box */}
                  <div className="bg-zinc-955/2 dark:bg-zinc-955/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-4.5 space-y-3.5 font-semibold text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Stock Symbol:</span>
                      <span className="font-bold font-mono text-sm">{selectedAlert.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Trigger Type:</span>
                      <span className={`font-bold ${
                        selectedAlert.triggerType.includes('Profit') ? 'text-blue-500' : 'text-cyan-600'
                      }`}>{selectedAlert.triggerType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Execution Price:</span>
                      <span className="font-bold font-mono text-zinc-900 dark:text-zinc-50">Rs. {selectedAlert.triggerPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Target Threshold:</span>
                      <span className="font-bold font-mono text-zinc-650 dark:text-zinc-400">Rs. {selectedAlert.triggerTarget}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Target Profit Set:</span>
                      <span className="font-mono">{selectedAlert.targetSellPrice ? `Rs. ${selectedAlert.targetSellPrice}` : 'Not Set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Target Stop Loss Set:</span>
                      <span className="font-mono">{selectedAlert.targetLossPrice ? `Rs. ${selectedAlert.targetLossPrice}` : 'Not Set'}</span>
                    </div>
                  </div>

                  {/* Price Comparison Chart */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Price Comparison</h4>
                    <div className="border border-zinc-200/50 dark:border-zinc-800/40 rounded-2xl p-3 bg-zinc-950/2 dark:bg-zinc-950/40 h-64 shadow-inner">
                      <ReactECharts 
                        option={getChartOption(selectedAlert)} 
                        style={{ height: '100%', width: '100%' }}
                        opts={{ renderer: 'svg' }}
                      />
                    </div>
                  </div>

                  {/* Gemini Recommendation Block */}
                  <div className="bg-blue-500/10 dark:bg-blue-500/5 border border-blue-500/20 dark:border-blue-500/10 rounded-2xl p-4.5 space-y-2 shadow-sm shadow-blue-500/2">
                    <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" /> AI Analyst recommendation
                    </h4>
                    <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed font-medium">
                      {selectedAlert.recommendation || 'No recommendation logged for this alert.'}
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button 
                  onClick={() => setSelectedAlert(null)}
                  className="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors mt-6 border border-zinc-200 dark:border-zinc-750 cursor-pointer"
                >
                  Close Details Panel
                </button>
              </div>
            </>
          )}

        </div>
      </main>

      {/* ==================== 3. Floating Gemini AI Assistant Chat Drawer ==================== */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-3.5">
        {/* Chat window drawer */}
        {isChatOpen && (
          <div className="w-[calc(100vw-32px)] sm:w-96 h-[460px] glass-panel rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in border-zinc-200/70 dark:border-zinc-800/60">
            {/* Header */}
            <div className="bg-brand-gradient text-white px-4 py-3.5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="font-extrabold text-sm tracking-tight">NEPSE AI Analyst Chat</span>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-1 hover:bg-blue-600 rounded-lg transition-colors text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-zinc-950/2 dark:bg-zinc-950/15 text-xs font-semibold">
              {chatMessages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-600/5' 
                      : 'bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-800 dark:text-zinc-200 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {sendingChat && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl rounded-tl-none px-3.5 py-2.5 shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce animate-duration-500" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce animate-duration-500" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce animate-duration-500" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef}></div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleChatSubmit} className="p-3 border-t border-zinc-200/40 dark:border-zinc-800/30 flex gap-2 bg-white dark:bg-[#130d22]">
              <input 
                type="text" 
                placeholder="Ask about NABIL, AHPC, or alerts..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={sendingChat}
                className="flex-1 bg-zinc-50 dark:bg-[#151124]/40 border border-zinc-200/60 dark:border-zinc-800/50 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
              />
              <button 
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Floating Chat Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="bg-brand-gradient hover:opacity-90 text-white p-4 rounded-full shadow-2xl hover:scale-108 hover:rotate-3 active:scale-95 transition-all duration-300 flex items-center justify-center relative cursor-pointer group shadow-blue-600/10 dark:shadow-blue-600/20"
          title="Chat with your stock data"
        >
          {isChatOpen ? <X className="w-6 h-6 animate-spin duration-300" /> : <MessageSquare className="w-6 h-6" />}
          <span className="absolute -top-1 -right-1 bg-cyan-500 text-white rounded-full p-1 border border-white dark:border-black animate-pulse">
            <Sparkles className="w-3 h-3" />
          </span>
        </button>
      </div>

    </div>
  );
}

export default App;
