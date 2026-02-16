import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Container, Card, Row, Col, Button, Badge, Spinner, Alert } from 'react-bootstrap';

const calculateRemainingTime = (dateStr, timeStr) => {
  if (!dateStr || dateStr === '0000-00-00') return null;
  
  const targetDate = new Date(`${dateStr}T${timeStr || '00:00:00'}`);
  const now = new Date();
  const diff = targetDate - now;

  if (diff < 0) return { text: 'Süresi Doldu', variant: 'secondary', expired: true };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  let text = '';
  if (days > 0) text += `${days}g `;
  text += `${hours}s kaldı`;
  
  return { 
    text, 
    variant: days === 0 && hours < 24 ? 'danger' : 'success',
    expired: false
  };
};

const extractCoordinates = (sortfield) => {
    if (!sortfield) return null;
    
    // Pattern: LAT-LNG (e.g. 40.14600308-26.41183608)
    const cleanStr = sortfield.trim();
    const match = cleanStr.match(/^(\d+\.\d+)[-,\s]+(\d+\.\d+)$/);
    
    if (match) {
        return {
            lat: match[1],
            lng: match[2]
        };
    }
    return null;
};

const WorkDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRoute, setShowRoute] = useState(false); // Toggle for route preview

  useEffect(() => {
    const fetchWork = () => {
      try {
        const localData = localStorage.getItem('works');
        if (localData) {
            const works = JSON.parse(localData);
             // Find by sapId (most common) or fallback to _id or ustIsEmri
            const foundWork = works.find(w => w.sapId === id || w._id === id || w.ustIsEmri === id);
            
            if (foundWork) {
                setWork(foundWork);
            } else {
                setError('İş emri bulunamadı (Yerel veride yok). Lütfen listeyi senkronize edin.');
            }
        } else {
            setError('Yerel veri bulunamadı. Lütfen ana sayfadan senkronizasyon yapın.');
        }
      } catch (err) {
        setError('Failed to load work details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWork();
  }, [id]);

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" variant="primary" /></div>;
  if (error) return <Alert variant="danger" className="mt-5">{error}</Alert>;
  if (!work) return <Alert variant="warning" className="mt-5">İş emri bulunamadı.</Alert>;

  const remaining = calculateRemainingTime(work.zpm1027, work.zpm1028);
  const coords = extractCoordinates(work.sortfield);

  const getSapWebGuiUrl = (notifNo) => {
    // Ensure the notification number is 12 digits long with leading zeros
    const formattedNotifNo = notifNo.toString().trim().padStart(12, '0');
    return `https://mobilsahaprod.aksa.com.tr:44300/sap/bc/gui/sap/its/webgui/?~transaction=iw23%20RIWO00-QMNUM%3d${formattedNotifNo}&~OKCODE=ENTR&sap-client=100&sap-language=TR#`;
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button variant="link" onClick={() => navigate('/')} className="ps-0 text-decoration-none fw-bold">
            &larr; Listeye Dön
        </Button>
        {work.notifNo && (
            <Button 
                variant="outline-primary" 
                size="sm" 
                href={getSapWebGuiUrl(work.notifNo)} 
                target="_blank" 
                rel="noopener noreferrer"
            >
                Bildirim Aç ↗
            </Button>
        )}
      </div>

      <Row className="g-4">
        {/* Left Column: Details */}
        <Col lg={coords ? 7 : 12}>
            <Card className="shadow-sm border-0 h-100">
                <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="d-flex align-items-center gap-3">
                    <h4 className="m-0 text-primary fw-bold">İş Emri #{work.ustIsEmri || work.sapId || 'N/A'}</h4>
                    {remaining && (
                        <Badge bg={remaining.variant} className="fs-6 fw-normal">
                            {remaining.text}
                        </Badge>
                    )}
                </div>
                <Badge bg={work.listType === 'LIST_ATANACAK' ? 'info' : 'warning'} className="text-dark fs-6">
                    {work.listType ? work.listType.replace('LIST_', '') : 'Bilinmiyor'}
                </Badge>
                </Card.Header>

                <Card.Body className="p-4">
                <Row className="g-4 mb-4">
                    <Col md={6}>
                        <div className="d-flex flex-column">
                        <span className="text-secondary small fw-bold text-uppercase">Açıklama</span>
                        <span className="fs-5">{work.operation?.[0]?.shortText || work.shortText || 'N/A'}</span>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="d-flex flex-column">
                        <span className="text-secondary small fw-bold text-uppercase">İş Emri Tipi</span>
                        <span className="fw-medium">{work.orderTypeTxt || work.orderType || 'N/A'}</span>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="d-flex flex-column">
                        <span className="text-secondary small fw-bold text-uppercase">Durum</span>
                        <span className="fw-medium">{work.uStatus || 'N/A'}</span>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="d-flex flex-column">
                        <span className="text-secondary small fw-bold text-uppercase">Plan Grubu</span>
                        <span className="fw-medium">{work.plangroupt || 'N/A'}</span>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="d-flex flex-column">
                        <span className="text-secondary small fw-bold text-uppercase">Adres</span>
                        <span className="fw-medium">{work.street ? `${work.street}, ${work.city1 || ''}` : (work.city1 || 'N/A')}</span>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="d-flex flex-column">
                        <span className="text-secondary small fw-bold text-uppercase">İlçe/Mahalle</span>
                        <span className="fw-medium">{work.adrCity1 || ''} / {work.adrCity2 || ''}</span>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="d-flex flex-column">
                        <span className="text-secondary small fw-bold text-uppercase">Tarife</span>
                        <span className="fw-medium">{work.aboneTarife || 'N/A'}</span>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="d-flex flex-column">
                        <span className="text-secondary small fw-bold text-uppercase">Bina Numarası (GIS ID)</span>
                        <span className="fw-medium">{work.gisid || 'N/A'}</span>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="d-flex flex-column">
                        <span className="text-secondary small fw-bold text-uppercase">Tesisat Numarası</span>
                        <span className="fw-medium">{work.funcloc || 'N/A'}</span>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="d-flex flex-column">
                        <span className="text-secondary small fw-bold text-uppercase">İş Merkezi</span>
                        <span className="fw-medium">{work.Arbpl || 'N/A'}</span>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="d-flex flex-column">
                        <span className="text-secondary small fw-bold text-uppercase">Lokasyon</span>
                        <span className="fw-medium">{work.ZivWerks || 'N/A'}</span>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="d-flex flex-column">
                        <span className="text-secondary small fw-bold text-uppercase">Oluşturulma Tarihi</span>
                        <span className="fw-medium">{work.startDate || 'N/A'}</span>
                        </div>
                    </Col>
                    {work.zpm1027 && work.zpm1027 !== '0000-00-00' && (
                        <Col md={6}>
                            <div className="d-flex flex-column">
                            <span className="text-secondary small fw-bold text-uppercase">Planlanan Tarih</span>
                            <span className="fw-medium">{work.zpm1027}</span>
                            </div>
                        </Col>
                    )}
                    {work.zpm1028 && work.zpm1028 !== '00:00:00' && (
                        <Col md={6}>
                            <div className="d-flex flex-column">
                            <span className="text-secondary small fw-bold text-uppercase">Planlanan Saat</span>
                            <span className="fw-medium">{work.zpm1028}</span>
                            </div>
                        </Col>
                    )}
                    <Col md={12}>
                        <div className="d-flex flex-column">
                        <span className="text-secondary small fw-bold text-uppercase">Son Senkronizasyon</span>
                        <span className="text-muted">{work.fetchedAt ? new Date(work.fetchedAt).toLocaleString() : 'N/A'}</span>
                        </div>
                    </Col>
                </Row>

                <div className="bg-light p-3 rounded border">
                    <h6 className="fw-bold mb-2">Raw Data</h6>
                    <pre className="m-0 small text-muted" style={{ maxHeight: '200px', overflowY: 'auto' }}>{JSON.stringify(work, null, 2)}</pre>
                </div>
                </Card.Body>
            </Card>
        </Col>
        
        {/* Right Column: Map & Actions (Only if coords exist) */}
        {coords && (
            <Col lg={5}>
                <Card className="shadow-sm border-0 h-100">
                    <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                        <h5 className="m-0 text-primary fw-bold">Konum ve Rota</h5>
                        <div className="form-check form-switch cursor-pointer">
                            <input 
                                className="form-check-input cursor-pointer" 
                                type="checkbox" 
                                id="routeToggle"
                                checked={showRoute}
                                onChange={() => setShowRoute(!showRoute)}
                            />
                            <label className="form-check-label small text-muted cursor-pointer user-select-none" htmlFor="routeToggle">
                                Rotayı Göster
                            </label>
                        </div>
                    </Card.Header>
                    <Card.Body className="p-0 d-flex flex-column">
                         <div style={{ height: '300px', width: '100%' }} className="bg-light position-relative">
                            <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                                src={showRoute 
                                    ? `https://maps.google.com/maps?saddr=My+Location&daddr=${coords.lat},${coords.lng}&output=embed`
                                    : `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=15&output=embed`
                                }
                                title="Google Map"
                            ></iframe>
                         </div>
                         <div className="p-4 d-grid gap-2 mt-auto">
                            <Button 
                                variant="primary" 
                                size="lg"
                                href={`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                🗺️ En Kısa Rotayı Çiz
                            </Button>
                            <div className="text-center text-muted small mt-2">
                                * Google Maps uygulaması açılarak anlık trafik bilgisine göre en hızlı rota oluşturulacaktır.
                            </div>
                         </div>
                    </Card.Body>
                </Card>
            </Col>
        )}
      </Row>
    </Container>
  );
};

export default WorkDetail;
