import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar as BsNavbar, Container, Button, Spinner, Badge } from 'react-bootstrap';

const Navbar = ({ onSync, syncing, workCount, isWsConnected, lastSyncTime, viewMode, setViewMode }) => {
  return (
    <BsNavbar bg="white" expand="lg" fixed="top" className="border-bottom shadow-sm py-3" style={{zIndex: 1050}}>
      <Container>
        {/* Brand Section */}
        <BsNavbar.Brand as={Link} to="/" className="d-flex align-items-center fw-bold text-primary me-4">
          <span className="me-2 fs-4">⚡</span>
          WorkFlow
          {workCount !== undefined && (
              <Badge bg="secondary" className="ms-2 fs-6 rounded-pill">
                  {workCount}
              </Badge>
          )}
        </BsNavbar.Brand>
        
        <BsNavbar.Toggle aria-controls="basic-navbar-nav" />
        
        <BsNavbar.Collapse id="basic-navbar-nav">
            {/* Navigation Links (Center-ish) */}
            <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-3 me-auto mb-3 mb-lg-0">
                 <Link to="/" className="text-decoration-none text-secondary fw-medium hover-text-primary transition-all">
                    Ana Sayfa
                 </Link>
                 <Link to="/dashboard" className="text-decoration-none text-secondary fw-medium hover-text-primary transition-all">
                    Raporlar
                 </Link>
                 <Link to="/map" className="text-decoration-none text-secondary fw-medium hover-text-primary transition-all">
                    Harita
                 </Link>

            </div>

            {/* Actions Section (Right) */}
            <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-3">
               
               {/* Status & Time */}
               <div className="d-flex align-items-center gap-2 text-muted small">
                  <Badge bg={isWsConnected ? "success" : "danger"} className="d-none d-sm-inline-block fw-normal">
                    {isWsConnected ? 'Online' : 'Offline'}
                  </Badge>
                  <span className={`cycle-status-dot d-sm-none ${isWsConnected ? 'bg-success' : 'bg-danger'}`} style={{width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block'}}></span>
                  
                  {lastSyncTime && (
                      <span className="d-none d-xl-inline-block">
                          🕒 {lastSyncTime.toLocaleTimeString('tr-TR')}
                      </span>
                  )}
               </div>

               {/* View Toggle */}
               <div className="btn-group" role="group" aria-label="View Mode">
                    <button 
                        type="button" 
                        className={`btn btn-sm ${viewMode === 'grid' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                        onClick={() => setViewMode('grid')}
                    >
                        Grid
                    </button>
                    <button 
                        type="button" 
                        className={`btn btn-sm ${viewMode === 'list' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                        onClick={() => setViewMode('list')}
                    >
                        Liste
                    </button>
               </div>

               {/* Sync Button */}
              <Button 
                variant={syncing ? "primary" : "outline-primary"} 
                onClick={onSync} 
                disabled={syncing}
                size="sm"
                className="d-flex align-items-center gap-2"
              >
                {syncing ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 21h5v-5"></path></svg>
                    <span>Sync</span>
                  </>
                )}
              </Button>
              
               {/* Logout */}
                <Button variant="outline-danger" size="sm" as="a" href="/" onClick={() => { localStorage.removeItem('auth'); window.location.reload(); }}>
                Çıkış
              </Button>
            </div>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
};

export default Navbar;
