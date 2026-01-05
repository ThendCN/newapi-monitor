import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

const STORAGE_KEY_SITES = "newapi_sites";

interface SiteConfig {
  id: string;
  name: string;
  url: string;
  cookie: string;
  userId: string;
}

interface SiteData {
  balance: number;
  used_today: number;
  loading: boolean;
  error?: string;
  lastUpdated: number;
}

function App() {
  // --- State ---
  const [sites, setSites] = useState<SiteConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SITES);
    if (saved) {
      return JSON.parse(saved);
    }
    // Migration: Check for old single-site config
    const oldUrl = localStorage.getItem("newapi_url");
    if (oldUrl) {
      return [{
        id: Date.now().toString(),
        name: "Default Site",
        url: oldUrl,
        cookie: localStorage.getItem("newapi_cookie") || "",
        userId: localStorage.getItem("newapi_userid") || "39"
      }];
    }
    return [];
  });

  const [siteData, setSiteData] = useState<Record<string, SiteData>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSettings, setIsSettings] = useState(sites.length === 0);
  
  // Settings Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formCookie, setFormCookie] = useState("");
  const [formUserId, setFormUserId] = useState("");

  // --- Actions ---

  const saveSites = (newSites: SiteConfig[]) => {
    setSites(newSites);
    localStorage.setItem(STORAGE_KEY_SITES, JSON.stringify(newSites));
  };

  const fetchSiteData = useCallback(async (site: SiteConfig) => {
    setSiteData(prev => ({
      ...prev,
      [site.id]: { ...prev[site.id], loading: true, error: undefined }
    }));

    try {
      // 1. Fetch Balance
      const balanceResp = await invoke<string>("fetch_quota", {
        url: site.url,
        cookie: site.cookie.trim(),
        userId: site.userId
      });
      const balanceJson = JSON.parse(balanceResp);
      if (!balanceJson.success || !balanceJson.data) throw new Error(balanceJson.message || "Balance failed");

      // 2. Fetch Usage
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
      const currentTimestamp = Math.floor(Date.now() / 1000);

      const usageResp = await invoke<string>("fetch_usage_stat", {
        url: site.url,
        cookie: site.cookie.trim(),
        userId: site.userId,
        startTimestamp: startOfDay,
        endTimestamp: currentTimestamp
      });
      const usageJson = JSON.parse(usageResp);
      if (!usageJson.success || !usageJson.data) throw new Error(usageJson.message || "Usage failed");

      setSiteData(prev => ({
        ...prev,
        [site.id]: {
          balance: balanceJson.data.quota,
          used_today: usageJson.data.quota,
          loading: false,
          error: undefined,
          lastUpdated: Date.now()
        }
      }));
    } catch (err: any) {
      console.error(`Error fetching ${site.name}:`, err);
      setSiteData(prev => ({
        ...prev,
        [site.id]: {
          ...prev[site.id],
          balance: 0,
          used_today: 0,
          loading: false,
          error: typeof err === 'string' ? err : err.message || "Failed"
        }
      }));
    }
  }, []);

  // Fetch all sites periodically
  useEffect(() => {
    if (isSettings) return;
    
    const fetchAll = () => {
      sites.forEach(site => fetchSiteData(site));
    };

    fetchAll();
    const interval = setInterval(fetchAll, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [sites, isSettings, fetchSiteData]);

  // Carousel Auto-Rotate
  useEffect(() => {
    if (isSettings || sites.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % sites.length);
    }, 5000); // Switch every 5 seconds
    return () => clearInterval(interval);
  }, [sites.length, isSettings]);

  // --- Handlers ---

  const handleEdit = (site: SiteConfig) => {
    setEditingId(site.id);
    setFormName(site.name);
    setFormUrl(site.url);
    setFormCookie(site.cookie);
    setFormUserId(site.userId);
  };

  const handleAddNew = () => {
    setEditingId("new");
    setFormName("New Site");
    setFormUrl("https://api.husanai.com");
    setFormCookie("");
    setFormUserId("39");
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this site?")) {
      const newSites = sites.filter(s => s.id !== id);
      saveSites(newSites);
      if (currentIndex >= newSites.length) setCurrentIndex(0);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId === "new") {
      const newSite: SiteConfig = {
        id: Date.now().toString(),
        name: formName,
        url: formUrl,
        cookie: formCookie,
        userId: formUserId
      };
      saveSites([...sites, newSite]);
    } else {
      const newSites = sites.map(s => s.id === editingId ? {
        ...s,
        name: formName,
        url: formUrl,
        cookie: formCookie,
        userId: formUserId
      } : s);
      saveSites(newSites);
    }
    setEditingId(null);
  };

  const formatMoney = (val: number) => `$${(val / 500000).toFixed(3)}`;

  // --- Render ---

  // 1. Settings View
  if (isSettings) {
    if (editingId) {
      // Edit/Add Form
      return (
        <div className="widget-card settings-mode">
          <form className="settings-form" onSubmit={handleSaveForm} style={{ gap: '4px' }}>
            <div style={{display:'flex', gap:'4px'}}>
              <input style={{flex:1}} placeholder="Name" value={formName} onChange={e=>setFormName(e.target.value)} required />
              <input style={{flex:2}} placeholder="URL" value={formUrl} onChange={e=>setFormUrl(e.target.value)} required />
            </div>
            <textarea
              placeholder="Cookie"
              value={formCookie}
              onChange={e=>setFormCookie(e.target.value)}
              required
              style={{ height: '40px', fontSize: '10px', background: '#222', color: '#eee', border:'1px solid #444', resize:'none' }}
            />
            <div style={{display:'flex', gap:'4px'}}>
              <input style={{flex:1}} placeholder="User ID" value={formUserId} onChange={e=>setFormUserId(e.target.value)} required />
              <button type="button" onClick={() => setEditingId(null)} style={{background:'#444'}}>Cancel</button>
              <button type="submit" className="save-btn">Save</button>
            </div>
          </form>
        </div>
      );
    }

    // List View
    return (
      <div className="widget-card settings-mode">
        <div className="header">
          <span>Manage Sites</span>
          <button className="settings-btn" onClick={() => setIsSettings(false)}>Done</button>
        </div>
        <div className="sites-list" style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'4px'}}>
          {sites.map(site => (
            <div key={site.id} style={{display:'flex', alignItems:'center', background:'#333', padding:'4px', borderRadius:'4px'}}>
              <div style={{flex:1, fontSize:'12px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{site.name}</div>
              <button className="icon-btn" onClick={() => handleEdit(site)}>✏️</button>
              <button className="icon-btn" onClick={() => handleDelete(site.id)} style={{color:'#ff6b6b'}}>🗑️</button>
            </div>
          ))}
          <button className="add-btn" onClick={handleAddNew} style={{background:'#444', border:'1px dashed #666', marginTop:'4px'}}>+ Add Site</button>
        </div>
      </div>
    );
  }

  // 2. Main Dashboard View
  const currentSite = sites[currentIndex];
  if (!currentSite) return <div className="widget-card">No Sites <button onClick={()=>setIsSettings(true)}>Config</button></div>;
  
  const dataObj = siteData[currentSite.id];
  const isLoading = !dataObj || dataObj.loading;
  const errorMsg = dataObj?.error;

  return (
    <div className="widget-card">
      <div className="header">
        <button className="nav-btn" onClick={() => setCurrentIndex((currentIndex - 1 + sites.length) % sites.length)}>‹</button>
        <span style={{ fontWeight: 600, fontSize: '13px' }}>{currentSite.name}</span>
        <div style={{display:'flex', gap:'4px'}}>
            <button className="nav-btn" onClick={() => setCurrentIndex((currentIndex + 1) % sites.length)}>›</button>
            <button className="settings-btn" onClick={() => setIsSettings(true)}>⚙️</button>
        </div>
      </div>

      {errorMsg ? (
        <div className="error-msg">{errorMsg}</div>
      ) : isLoading ? (
        <div className="loading-msg">Loading...</div>
      ) : (
        <div className="data-container">
          <div className="row">
            <span className="label">Today:</span>
            <span className="value">{formatMoney(dataObj.used_today)}</span>
          </div>
          <div className="row">
            <span className="label">Balance:</span>
            <span className="value highlight">{formatMoney(dataObj.balance)}</span>
          </div>
        </div>
      )}
      
      {/* Pagination Dots */}
      {sites.length > 1 && (
        <div className="dots">
          {sites.map((_, idx) => (
            <div key={idx} className={`dot ${idx === currentIndex ? 'active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export default App;