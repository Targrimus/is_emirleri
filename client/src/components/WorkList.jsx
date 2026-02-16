import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Row, Col, Card, Badge, Button } from 'react-bootstrap';
import WorkListHeader, { columnStyles } from './WorkListHeader';
import { calculateRemainingTime, extractCoordinates, getSapWebGuiUrl } from '../utils/workHelpers';

const WorkList = ({ works, viewMode }) => {
  const navigate = useNavigate();

  if (!works || works.length === 0) {
    return <p className="text-center text-muted mt-5">No work orders found. Click "Sync Data" to fetch from SAP.</p>
  }

  const renderGridView = () => (
    <Row xs={1} md={2} lg={2} xl={3} className="g-3">
      {works.map((work, index) => {
        const remaining = calculateRemainingTime(work.zpm1027, work.zpm1028);
                        const coords = extractCoordinates(work.sortfield);
        
                        return (
                        <Col key={work.sapId || index}>
                            <Link to={`/work/${work.sapId}`} className="text-decoration-none">
                <Card className={`h-100 border-0 ${work.highlighted ? 'highlight-row' : 'bg-white shadow-sm hover-shadow transition-all'} ${remaining?.variant === 'danger' ? 'border-danger border-2' : ''}`}>
                    <Card.Body className="d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start mb-3 border-bottom pb-2">
                            <span className="font-monospace fw-bold text-primary bg-light px-2 py-1 rounded">
                                {work.ustIsEmri || work.sapId || 'N/A'}
                            </span>
                             <div className="d-flex gap-1 flex-column align-items-end">
                                <Badge bg={work.listType === 'LIST_ATANACAK' ? 'info' : 'warning'} className="text-dark">
                                    {work.listType ? work.listType.replace('LIST_', '') : 'Unknown'}
                                </Badge>
                                {remaining && (
                                    <Badge bg={remaining.variant} className="fw-normal">
                                        {remaining.text}
                                    </Badge>
                                )}
                             </div>
                        </div>
                        
                        <div className="mb-3 flex-grow-1 text-dark">
                             <p className="mb-1 d-flex justify-content-between">
                                <span className="text-muted small fw-bold">Açıklama:</span> 
                                <span className="text-end text-truncate ms-2" style={{maxWidth: '70%'}}>{work.operation?.[0]?.shortText || work.shortText || 'Açıklama Yok'}</span>
                             </p>
                             <p className="mb-1 d-flex justify-content-between align-items-center">
                                <span className="text-muted small fw-bold">Adres:</span> 
                                <span className="d-flex align-items-center justify-content-end" style={{maxWidth: '70%'}}>
                                     <span className="text-truncate me-1">{work.street ? `${work.street}, ${work.city1 || ''}` : (work.city1 || 'N/A')}</span>
                                     {coords && (
                                        <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-primary"
                                            title="Konumu Haritada Aç"
                                        >
                                            📍
                                        </a>
                                     )}
                                </span>
                             </p>
                             <p className="mb-1 d-flex justify-content-between">
                                <span className="text-muted small fw-bold">İlçe/Mahalle:</span> 
                                 <span className="text-end text-truncate ms-2" style={{maxWidth: '70%'}}>
                                    {(work.adrCity1 ? String(work.adrCity1).toLocaleUpperCase('tr-TR') : '-')} / {(work.adrCity2 ? String(work.adrCity2).toLocaleUpperCase('tr-TR') : '-')}
                                </span>
                             </p>
                             <p className="mb-1 d-flex justify-content-between">
                                <span className="text-muted small fw-bold">Başlangıç:</span> 
                                <span>{work.startDate || '-'}</span>
                             </p>
                             <p className="mb-1 d-flex justify-content-between">
                                <span className="text-muted small fw-bold">Planlanan:</span> 
                                <span>{work.zpm1027 || '-'}</span>
                             </p>
                             <p className="mb-1 d-flex justify-content-between">
                                <span className="text-muted small fw-bold">Tarife:</span> 
                                <span>{work.aboneTarife || 'N/A'}</span>
                             </p>
                             {work.mnWkCtr && (
                                <p className="mb-1 d-flex justify-content-between">
                                    <span className="text-muted small fw-bold">İş Merkezi:</span> 
                                    <span>{work.mnWkCtr}</span>
                                </p>
                             )}
                             {(work.plangroupt || work.ingrp || work.Vapmz) && (
                                <p className="mb-1 d-flex justify-content-between">
                                    <span className="text-muted small fw-bold">Planlama Grubu:</span> 
                                    <span>{work.plangroupt || work.ingrp || work.Vapmz}</span>
                                </p>
                             )}
                             {work.funcloc && (
                                <p className="mb-1 d-flex justify-content-between">
                                    <span className="text-muted small fw-bold">Tesisat No:</span> 
                                    <span>{work.funcloc}</span>
                                </p>
                             )}
                             {work.gisid && (
                                <p className="mb-1 d-flex justify-content-between">
                                    <span className="text-muted small fw-bold">Bina No:</span> 
                                    <span>{work.gisid}</span>
                                </p>
                             )}
                        </div>
                        
                        <div className="text-end text-muted small border-top pt-2 mt-auto d-flex justify-content-between align-items-center">
                             <div onClick={(e) => e.preventDefault()}>
                                {work.notifNo && (
                                    <Button 
                                        variant="outline-secondary" 
                                        size="sm" 
                                        className="py-0 px-2"
                                        style={{fontSize: '0.75rem'}}
                                        href={getSapWebGuiUrl(work.notifNo)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Bildirimi Aç
                                    </Button>
                                )}
                             </div>
                            <span className="fw-medium text-dark">{work.startDate || 'N/A'}</span>
                        </div>
                    </Card.Body>
                </Card>
            </Link>
        </Col>
      )})}
    </Row>
  );

  const renderListView = () => (
    <div className="bg-white rounded shadow-sm border">
        {/* Sticky Header */}
        <WorkListHeader />
        
        {/* List Items */}
        <div className="p-0">
                {works.map((work, index) => {
                    const remaining = calculateRemainingTime(work.zpm1027, work.zpm1028);
                    const coords = extractCoordinates(work.sortfield);
                    
                    return (
                        <div 
                            key={work.sapId || index} 
                            style={{cursor: 'pointer'}} 
                            onClick={() => navigate(`/work/${work.sapId}`)}
                            className={`d-flex align-items-center border-bottom py-2 px-3 small transition-all hover-bg-light ${work.highlighted ? 'highlight-row' : ''}`}
                        >
                            {/* Order No */}
                            <div style={columnStyles.orderNo}>
                                <span className="font-monospace fw-bold text-primary bg-light px-2 py-1 rounded small">
                                    {work.ustIsEmri || work.sapId || 'N/A'}
                                </span>
                            </div>

                            {/* Type */}
                            <div style={columnStyles.type}>
                                <Badge bg={work.listType === 'LIST_ATANACAK' ? 'info' : 'warning'} className="text-dark fw-normal rounded-pill">
                                    {work.listType ? work.listType.replace('LIST_', '') : '-'}
                                </Badge>
                            </div>

                            {/* Description */}
                            <div style={columnStyles.desc} className="pe-2">
                                <div className="text-truncate" title={work.operation?.[0]?.shortText || work.shortText}>
                                    {work.operation?.[0]?.shortText || work.shortText || '-'}
                                </div>
                            </div>
                            
                            {/* Work Center */}
                            <div style={columnStyles.wkCtr}>
                                {work.mnWkCtr || '-'}
                            </div>

                            {/* Planning Group */}
                            <div style={columnStyles.grp}>
                                {work.plangroupt || work.ingrp || '-'}
                            </div>

                            {/* Start Date */}
                            <div style={columnStyles.start}>
                                {work.startDate || '-'}
                            </div>

                            {/* Planned Date */}
                            <div style={columnStyles.plan}>
                                {work.zpm1027 || '-'}
                            </div>

                            {/* Address */}
                            <div style={columnStyles.addr} className="pe-2">
                                <div className="d-flex flex-column small">
                                    <div className="d-flex align-items-center">
                                        <span className="fw-bold me-2 text-truncate">{(work.adrCity1 ? String(work.adrCity1).toLocaleUpperCase('tr-TR') : '-')}/{(work.adrCity2 ? String(work.adrCity2).toLocaleUpperCase('tr-TR') : '-')}</span>
                                        {coords && (
                                            <a 
                                                href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-primary text-decoration-none"
                                                title="Konumu Haritada Aç"
                                            >
                                                📍
                                            </a>
                                        )}
                                    </div>
                                    <span className="text-muted text-truncate">{work.street}</span>
                                </div>
                            </div>

                            {/* Fac/Building */}
                            <div style={columnStyles.fac}>
                                <div className="d-flex flex-column small">
                                    {work.funcloc && <span className="text-truncate" title={work.funcloc}><span className="text-muted">T:</span> {work.funcloc}</span>}
                                    {work.gisid && <span className="text-truncate" title={work.gisid}><span className="text-muted">B:</span> {work.gisid}</span>}
                                </div>
                            </div>

                            {/* Status */}
                            <div style={columnStyles.status}>
                                {remaining ? (
                                    <Badge bg={remaining.variant} className="fw-normal rounded-pill">
                                        {remaining.text}
                                    </Badge>
                                ) : <span className="text-muted">-</span>}
                            </div>

                            {/* Action */}
                            <div style={columnStyles.action} onClick={(e) => e.stopPropagation()}>
                                {work.notifNo && (
                                    <Button 
                                        variant="outline-secondary" 
                                        size="sm"
                                        style={{fontSize: '0.7rem', padding: '0.1rem 0.4rem'}}
                                        href={getSapWebGuiUrl(work.notifNo)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Bildirimi Aç
                                    </Button>
                                )}
                            </div>
                        </div>
                    )
                })}
        </div>
    </div>
  );

  return (
    <>
        {/* Toggle moved to Navbar */}
        {viewMode === 'grid' ? renderGridView() : renderListView()}
    </>
  )
}

export default WorkList
