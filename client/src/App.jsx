import { useState, useEffect, useMemo, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import axios from 'axios'

import toast, { Toaster } from 'react-hot-toast'
import { Container, Row, Col } from 'react-bootstrap';
import WorkList from './components/WorkList'
import WorkDetail from './components/WorkDetail'
import FilterBar from './components/FilterBar'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Dashboard from './components/Dashboard'
import MapView from './components/MapView'
import Login from './components/Login'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

function App() {
  const [works, setWorks] = useState([])

  // DEBUG: Check data structure
  useEffect(() => {
    // console.log("🚀 APP VERSION: MSG_DEDUP_V4");
    if (works.length > 0) {
      const w = works[0];
      console.log('Work Keys:', Object.keys(w).join(', '));
      console.log('DEBUG: mnWkCtr:', w.mnWkCtr);
      console.log('DEBUG: plangroupt:', w.plangroupt, 'ingrp:', w.ingrp, 'Vapmz:', w.Vapmz);
    }
  }, [works]);
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isWsConnected, setIsWsConnected] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const lastPayloadRef = useRef(null); // Ref to track duplicate messages

  // Auth Initialization & Data Loading
  useEffect(() => {
    const auth = localStorage.getItem('auth');
    if (auth) {
        axios.defaults.headers.common['Authorization'] = `Basic ${auth}`;
        setIsAuthenticated(true);
    }
    
    // Load local data if available
    const localData = localStorage.getItem('works');
    if (localData) {
        try {
            setWorks(JSON.parse(localData));
        } catch (e) {
            console.error("Failed to parse local works", e);
        }
    }

    const localSyncTime = localStorage.getItem('lastSyncTime');
    if (localSyncTime) {
        setLastSyncTime(new Date(localSyncTime));
    }
  }, []);

  // View Mode State (Lifted from WorkList)
  const [viewMode, setViewMode] = useState(() => {
    return window.innerWidth < 768 ? 'grid' : 'list';
  });

  // Listen for screen resize to switch mode dynamically
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handler = (e) => {
      if (e.matches) setViewMode('grid');
      else setViewMode('list');
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const [sortConfig, setSortConfig] = useState({ key: 'startDate', direction: 'desc' });

  const [filters, setFilters] = useState({
    startDateStart: '',
    startDateEnd: '',
    ZivWerks: ['5221'], 
    operationShortText: [], 
    orderType: [],
    adrCity1: [],
    adrCity2: [],
    street: [],
    uStatus: [],
    plangroupt: [],
    mnWkCtr: []
  });

  const performSync = async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      setSyncing(true);
      try {
          // Sync returns the data directly now
          const response = await axios.post('/api/works/sync');
          const data = response.data;
          
          if (Array.isArray(data)) {
              console.log(`Sync completed. Received ${data.length} items.`);
              setWorks(data);
              localStorage.setItem('works', JSON.stringify(data));
              const now = new Date();
              setLastSyncTime(now);
              localStorage.setItem('lastSyncTime', now.toISOString());
              if (!isBackground) toast.success(`${data.length} adet iş emri güncellendi.`);
          }
      } catch (error) {
          console.error('Sync failed:', error);
          if (error.response && error.response.status === 401) {
               setIsAuthenticated(false);
               localStorage.removeItem('auth');
               toast.error('Oturum süresi doldu, lütfen tekrar giriş yapın.');
          } else {
              if (!isBackground) toast.error('Sync failed');
          }
      } finally {
          if (!isBackground) setLoading(false);
          setSyncing(false);
      }
  };

  const handleLogin = async (username, password) => {
    const auth = btoa(`${username}:${password}`);
    localStorage.setItem('auth', auth);
    axios.defaults.headers.common['Authorization'] = `Basic ${auth}`;
    setIsAuthenticated(true);
    toast.success('Giriş Başarılı, veriler çekiliyor...');
    
    // Auto-fetch data after login
    await performSync();
  };

  // WebSocket Connection (ENABLED)
  // WebSocket Connection (Bridge to SAP)
  useEffect(() => {
    if (!isAuthenticated) return;

    let ws;
    let reconnectTimer;

    const connectWebSocket = () => {
        try {
            // Connect to our local server which bridges to SAP
            const wsUrl = `ws://localhost:5000`;
            
            console.log('Connecting to Local WebSocket Bridge:', wsUrl);
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('✅ Local WebSocket Connected');
                setIsWsConnected(true);
                toast.success('Sunucu bağlantısı kuruldu.');
            };

            ws.onmessage = (event) => {
                // Deduplicate Messages
                if (lastPayloadRef.current === event.data) {
                  // console.log("Duplicate WS message ignored.");
                  return;
                }
                lastPayloadRef.current = event.data;

                try {
                    console.log('📩 Message from Server:', event.data);
                    const parsedData = JSON.parse(event.data);

                    // Handle initial connection info
                    if (parsedData.type === 'INFO') {
                        console.log('Server Info:', parsedData.message);
                        return;
                    }

                    // Process SAP Data (Partial Update)
                    let messageData = parsedData;

                    // Unpack potential OData wrapper
                    if (messageData.d) {
                        messageData = messageData.d;
                    }
                    if (messageData.results) {
                        messageData = messageData.results;
                    }

                    const updates = Array.isArray(messageData) ? messageData : [messageData];
                    
                    if (updates.length > 0) {
                        setWorks(prevWorks => {
                            const newWorks = [...prevWorks];
                            let updatedCount = 0;
                            let addedCount = 0;

                            const normalizeItem = (rawItem) => {
                                 let items = [];
                                 if (rawItem.Zkey && rawItem.Zvalue) {
                                     try {
                                         const parsed = JSON.parse(rawItem.Zvalue);
                                         const list = Array.isArray(parsed) ? parsed : [parsed];
                                         items = list.map(i => ({ ...i, listType: rawItem.Zkey }));
                                     } catch (e) { console.error("WS Parse Error", e); }
                                 } else {
                                     items = [rawItem];
                                 }
                                 return items.map(item => {
                                     // Check if fields are wrapped in a 'data' property (Object or Array)
                                     let source = item;
                                     if (item.data) {
                                         if (Array.isArray(item.data)) {
                                             if (item.data.length > 0) source = { ...item, ...item.data[0] };
                                         } else if (typeof item.data === 'object') {
                                             source = { ...item, ...item.data };
                                         }
                                     }

                                     // Generic Case-Insensitive ID Finder
                                     let sapId = null;
                                     const keys = Object.keys(source);
                                     
                                     // Priority keys to look for (lowercase)
                                     const targetKeys = ['sapid', 'ustisemri', 'orderid', 'id', 'workid'];
                                     
                                     for (const key of keys) {
                                         const lowerKey = key.toLowerCase();
                                         if (targetKeys.includes(lowerKey)) {
                                             sapId = source[key];
                                             break;
                                         }
                                     }

                                     if (!sapId) {
                                         console.warn("WS: Could not find ID. Keys found:", keys.join(', '), "Item:", JSON.stringify(item));
                                         toast.error(`ID Bulunamadı. Anahtarlar: ${keys.join(', ')}`, { duration: 5000 });
                                     } else {
                                         console.log(`WS: Found ID ${sapId} using key matching.`);
                                     }

                                     // Generic Case-Insensitive Status/ListType Finder
                                     let foundStatus = source.listType || source.status;
                                     if (!foundStatus) {
                                         const statusKeys = ['status', 'durum', 'listtype', 'stat'];
                                         for (const key of keys) {
                                             if (statusKeys.includes(key.toLowerCase())) {
                                                 foundStatus = source[key];
                                                 break;
                                             }
                                         }
                                     }

                                     if (!foundStatus) {
                                         console.log("WS: Status/ListType not found. Available keys:", keys.join(', '));
                                     }

                                     return {
                                         ...source,
                                         sapId: String(sapId), // Ensure string for comparison
                                         ZivWerks: String(source.werks || source.ZivWerks || source.WERKS || source.Werks || ''),
                                         listType: foundStatus || 'WS_UPDATE',
                                         fetchedAt: new Date(),
                                         highlighted: true // Add highlight flag
                                     };
                                 });
                            };

                            updates.forEach(rawUpdate => {
                                const normalizedItems = normalizeItem(rawUpdate);
                                normalizedItems.forEach(updateItem => {
                                     if (!updateItem.sapId) return;

                                     const index = newWorks.findIndex(w => w.sapId === updateItem.sapId);
                                     if (index !== -1) {
                                         newWorks[index] = { ...newWorks[index], ...updateItem, highlighted: true };
                                         updatedCount++;
                                     } else {
                                         newWorks.unshift({ ...updateItem, highlighted: true });
                                         addedCount++;
                                     }
                                });
                            });

                                console.log(`Inside setWorks updater. New count: ${newWorks.length}, Updated: ${updatedCount}, Added: ${addedCount}`);
                            
                                if (updatedCount > 0 || addedCount > 0) {
                                    console.log('Saving updated works to localStorage', newWorks.length);
                                    localStorage.setItem('works', JSON.stringify(newWorks));
                                    const now = new Date();
                                    setLastSyncTime(now);
                                    localStorage.setItem('lastSyncTime', now.toISOString());
                                    
                                    const msg = addedCount > 0 
                                        ? `${addedCount} yeni iş, ${updatedCount} güncelleme.` 
                                        : `${updatedCount} iş emri güncellendi.`;
                                    toast(msg, { icon: '⚡' });
    
                                    // Remove highlight after 3 seconds
                                    setTimeout(() => {
                                      setWorks(currentWorks => {
                                        const cleanedWorks = currentWorks.map(w => {
                                          if (w.highlighted) {
                                            const { highlighted, ...rest } = w;
                                            return rest;
                                          }
                                          return w;
                                        });
                                        // Don't update localStorage here to avoid constant writes, just state
                                        return cleanedWorks;
                                      });
                                    }, 2000);
    
                                    return newWorks;
                                } else {
                                    console.log('No works updated or added. Returning previous state.');
                                }
                                return prevWorks;
                        });
                    }

                } catch (e) {
                   console.error('Error processing WebSocket message:', e);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket Error:', error);
                setIsWsConnected(false);
            };

            ws.onclose = () => {
                console.log('Local WebSocket Disconnected. Reconnecting in 5s...');
                setIsWsConnected(false);
                reconnectTimer = setTimeout(connectWebSocket, 5000);
            };

        } catch (e) {
            console.error("WS Setup Error", e);
            setIsWsConnected(false);
        }
    };

    connectWebSocket();

    return () => {
        if (ws) ws.close();
        if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [isAuthenticated]);


  // --- Central Filter Logic Helpers ---

  // Helper: Extract the correct value from a work item for a given filter key
  const getWorkValue = (work, key) => {
      if (!work) return null;

      if (key === 'operationShortText') {
          return work.operation?.[0]?.shortText || work.shortText || work.equidescr;
      }
      
      if (key === 'orderType') {
          return work.orderType && work.orderTypeTxt ? `${work.orderType} - ${work.orderTypeTxt}` : (work.orderTypeTxt || work.orderType);
      }

      if (key === 'plangroupt') {
          // Robust fallback: Description OR Code (Case-insensitive)
          const desc = work.plangroupt || work.PLANGROUPT || work.PlanGroupt;
          const code = work.ingrp || work.INGRP || work.Ingrp;
          const vapmz = work.Vapmz || work.VAPMZ;
          
          const val = desc || code || vapmz;
          return val;
      }

      if (key === 'ZivWerks') {
          return work.ZivWerks || work.WERKS || work.werks || work.Werks;
      }

      return work[key];
  };

  // Helper: robustly check if a value matches the selected filters
  const checkMatch = (workValue, filterValues) => {
      if (!filterValues || filterValues.length === 0) return true;
      
      const normalize = (val) => String(val || '').toLocaleUpperCase('tr-TR').trim();
      const safeWorkValue = normalize(workValue);
      
      return filterValues.some(f => normalize(f) === safeWorkValue);
  };

  // Calculate unique options for dropdowns with cascading logic
  const filterOptions = useMemo(() => {
    const getFilteredOptions = (currentKey) => {
        // Filter works based on ALL filters EXCEPT the current key
        const validWorks = works.filter(work => {
            return Object.keys(filters).every(filterKey => {
                if (filterKey === currentKey) return true; // Don't filter by itself
                
                const filterValue = filters[filterKey];
                
                // Skip empty filters
                if (filterKey === 'startDateStart' || filterKey === 'startDateEnd') return true;
                if (Array.isArray(filterValue) && filterValue.length === 0) return true;
                if (!Array.isArray(filterValue) && !filterValue) return true;

                const workValue = getWorkValue(work, filterKey);
                return checkMatch(workValue, filterValue);
            });
        });

        // Filter options based on date range as well
        const dateFilteredWorks = validWorks.filter(work => {
             if (filters.startDateStart || filters.startDateEnd) {
                if (!work.startDate) return false;
                const [day, month, year] = work.startDate.split('.');
                const workDate = new Date(`${year}-${month}-${day}`);
                
                if (filters.startDateStart) {
                    const startDate = new Date(filters.startDateStart);
                     if (workDate < startDate) return false;
                }
                if (filters.startDateEnd) {
                    const endDate = new Date(filters.startDateEnd);
                    if (workDate > endDate) return false;
                }
             }
             return true;
        });

        // Helper to normalize and get unique sorted values
        const getUniqueOptions = (values) => {
             const normalized = values
                .filter(Boolean)
                .map(v => String(v).toLocaleUpperCase('tr-TR').trim());
             return [...new Set(normalized)].sort();
        }
        
        const rawValues = dateFilteredWorks.map(w => getWorkValue(w, currentKey));
        
        return getUniqueOptions(rawValues);
    };

    return {
      ZivWerks: getFilteredOptions('ZivWerks'),
      operationShortText: getFilteredOptions('operationShortText'),
      orderType: getFilteredOptions('orderType'),
      adrCity1: getFilteredOptions('adrCity1'),
      adrCity2: getFilteredOptions('adrCity2'),
      street: getFilteredOptions('street'),
      uStatus: getFilteredOptions('uStatus'),
      plangroupt: getFilteredOptions('plangroupt'),
      mnWkCtr: getFilteredOptions('mnWkCtr')
    };
  }, [works, filters]);

  // Main Filter Apply Logic
  const filteredWorks = useMemo(() => {
    console.log(`Recalculating filters for ${works.length} works...`);
    return works.filter(work => {
      // Date Range Check
      let dateMatch = true;
      if (filters.startDateStart || filters.startDateEnd) {
          if (!work.startDate) {
              dateMatch = false;
          } else {
              const [day, month, year] = work.startDate.split('.');
              const workDate = new Date(`${year}-${month}-${day}`);
              workDate.setHours(0,0,0,0);

              if (filters.startDateStart) {
                  const startDate = new Date(filters.startDateStart);
                  startDate.setHours(0,0,0,0);
                  if (workDate < startDate) dateMatch = false;
              }
              if (filters.startDateEnd && dateMatch) {
                  const endDate = new Date(filters.startDateEnd);
                  endDate.setHours(0,0,0,0);
                  if (workDate > endDate) dateMatch = false;
              }
          }
      }

      return (
        dateMatch &&
        checkMatch(getWorkValue(work, 'ZivWerks'), filters.ZivWerks) &&
        checkMatch(getWorkValue(work, 'operationShortText'), filters.operationShortText) &&
        checkMatch(getWorkValue(work, 'orderType'), filters.orderType) &&
        checkMatch(getWorkValue(work, 'adrCity1'), filters.adrCity1) &&
        checkMatch(getWorkValue(work, 'adrCity2'), filters.adrCity2) &&
        checkMatch(getWorkValue(work, 'street'), filters.street) &&
        checkMatch(getWorkValue(work, 'uStatus'), filters.uStatus) &&
        checkMatch(getWorkValue(work, 'plangroupt'), filters.plangroupt) &&
        checkMatch(getWorkValue(work, 'mnWkCtr'), filters.mnWkCtr)
      );
    });
  }, [works, filters]);

  // Sorting Logic
  const sortedWorks = useMemo(() => {
    let sortableItems = [...filteredWorks];
    
    // Helper for remaining time calculation
    const getRemainingTimeMs = (work) => {
        if (!work.zpm1027 || work.zpm1027 === '0000-00-00') return -Infinity; // Expired/Invalid last
        const timeStr = work.zpm1028 || '00:00:00';
        // Handle DD.MM.YYYY
        let targetDate;
        if (work.zpm1027.includes('.')) {
             const [day, month, year] = work.zpm1027.split('.');
             targetDate = new Date(`${year}-${month}-${day}T${timeStr}`);
        } else {
             targetDate = new Date(`${work.zpm1027}T${timeStr}`);
        }
        if (isNaN(targetDate.getTime())) return -Infinity;
        return targetDate.getTime() - new Date().getTime();
    };

    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;

        if (sortConfig.key === 'remainingTime') {
            aValue = getRemainingTimeMs(a);
            bValue = getRemainingTimeMs(b);
        } else {
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }

        // Specific handling for Date strings (DD.MM.YYYY)
        if (sortConfig.key === 'startDate' || sortConfig.key === 'zpm1027') {
             const parseDate = (d) => {
                 if (!d) return new Date(0);
                 const [day, month, year] = d.split('.');
                 return new Date(`${year}-${month}-${day}`);
             };
             aValue = parseDate(aValue);
             bValue = parseDate(bValue);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredWorks, sortConfig]);

  const handleSortChange = (key, direction) => {
      setSortConfig({ key, direction });
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleQuickFilter = (type) => {
      const today = new Date();
      let start = new Date();
      let end = new Date();

      if (type === 'today') {
           // start and end are today
      } else if (type === 'yesterday') {
          start.setDate(today.getDate() - 1);
          end.setDate(today.getDate() - 1);
      } else if (type === 'week') {
          const day = today.getDay() || 7; // Get current day number, converting Sun (0) to 7
          if (day !== 1) start.setHours(-24 * (day - 1)); // Set to Monday
          end = today; // End is today (or end of week?) usually today
      } else if (type === 'month') {
          start.setDate(today.getDate() - 30);
      }

      const formatDate = (date) => date.toISOString().split('T')[0];

      setFilters(prev => ({
          ...prev,
          startDateStart: formatDate(start),
          startDateEnd: formatDate(end)
      }));
  };

  const handleClearFilters = () => {
    setFilters({
      startDateStart: '',
      startDateEnd: '',
      ZivWerks: [],
      operationShortText: [],
      orderType: [],
      adrCity1: [],
      adrCity2: [],
      street: [],
      uStatus: [],
      plangroupt: [],
      mnWkCtr: []
    });
  };

  if (!isAuthenticated) {
    return (
        <>
            <Toaster position="bottom-center" toastOptions={{ duration: 5000, style: { zIndex: 9999 } }} />
            <Login onLogin={handleLogin} />
        </>
    );
  }

  return (
    <Router>
      <div className="d-flex flex-column min-vh-100 bg-light">
        <Toaster position="bottom-center" toastOptions={{ duration: 5000, style: { zIndex: 9999 } }} />
        <Navbar onSync={performSync} syncing={syncing} workCount={filteredWorks.length} isWsConnected={isWsConnected} lastSyncTime={lastSyncTime} viewMode={viewMode} setViewMode={setViewMode} />
        
        <Container fluid className="flex-grow-1 px-lg-5 main-content-container">
          <Row>
            {/* Sidebar Column */}
            <Col md={3} lg={2} className="mb-2 mb-md-0 pt-3">
               <div className="sticky-top" style={{top: '75px', zIndex: 1000}}>
                  <ErrorBoundary>
                      <FilterBar 
                        filters={filters} 
                        options={filterOptions}
                        onFilterChange={handleFilterChange} 
                        onQuickFilter={handleQuickFilter}
                        onClearFilters={handleClearFilters} 
                        sortConfig={sortConfig}
                        onSortChange={handleSortChange}
                        vertical={true}
                      />
                  </ErrorBoundary>
               </div>
            </Col>

            {/* Main Content Column */}
            <Col md={9} lg={10} className="pt-3">
                <Routes>
                  <Route path="/" element={
                    <>
                      {loading ? (
                        <div className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <p className="mt-2 text-muted">Loading orders...</p>
                        </div>
                      ) : (
                        <ErrorBoundary>
                            <WorkList works={sortedWorks} viewMode={viewMode} />
                        </ErrorBoundary>
                      )}
                    </>
                  } />
                  <Route path="/work/:id" element={<WorkDetail />} />
                  <Route path="/dashboard" element={<Dashboard works={filteredWorks} />} />
                  <Route path="/map" element={<MapView works={filteredWorks} />} />
                </Routes>
            </Col>
          </Row>
        </Container>
        
        <Footer />
      </div>
    </Router>
  )
}

export default App
