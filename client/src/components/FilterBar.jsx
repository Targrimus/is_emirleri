import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Badge, Collapse } from 'react-bootstrap';
import MultiSelect from './MultiSelect';

const FilterBar = ({ filters, onFilterChange, onClearFilters, options, onQuickFilter, sortConfig, onSortChange, vertical }) => {
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  const handleMultiChange = (name, newSelected) => {
    onFilterChange(name, newSelected);
  };

  const renderSelect = (name, placeholder, optionsDiff) => (
    <Col md={vertical ? 12 : 4} sm={6} xs={12} className="mb-2">
      <MultiSelect
        key={name}
        label={placeholder}
        options={optionsDiff || []}
        selected={filters[name] || []}
        onChange={(newSelected) => handleMultiChange(name, newSelected)}
      />
    </Col>
  );

  return (
    <div className="mb-3 h-100">
        {/* Mobile Toggle Button */}
        <Button 
            variant="outline-primary" 
            className="d-md-none w-100 mb-2 d-flex justify-content-between align-items-center"
            onClick={() => setExpanded(!expanded)}
            aria-controls="filter-collapse"
            aria-expanded={expanded}
        >
            <span>Filtreler & Arama</span>
            <span>{expanded ? '▲' : '▼'}</span>
        </Button>

        <Collapse in={!isMobile || expanded}>
            <div id="filter-collapse" className="h-100">
                <div className={`filter-bar-container ${vertical ? 'p-2' : 'p-3 p-lg-4'} bg-white rounded shadow-sm border h-100 ${vertical ? 'd-flex flex-column' : ''}`}>
                  
                  {/* Filters Header in Vertical Mode */}
                  {vertical && <h6 className="mb-2 text-primary border-bottom pb-1 small fw-bold text-uppercase">Filtreleme</h6>}

                  <Row className={`mb-2 ${vertical ? 'flex-column' : 'align-items-end g-2'}`}>
                    <Col md={vertical ? 12 : 6} xs={12} className="mb-2 mb-md-0">
                      <Form.Label className="fw-bold text-secondary" style={{fontSize: '0.75rem'}}>Tarih Aralığı</Form.Label>
                      <div className={`d-flex ${vertical ? 'flex-column' : 'flex-column flex-sm-row'} gap-1`}>
                        <Form.Control
                          type="date"
                          name="startDateStart"
                          value={filters.startDateStart}
                          onChange={handleChange}
                          placeholder="Başlangıç"
                          size="sm"
                          style={{fontSize: '0.8rem'}}
                        />
                        {!vertical && <span className="align-self-center text-muted d-none d-sm-block">-</span>}
                        <Form.Control
                          type="date"
                          name="startDateEnd"
                          value={filters.startDateEnd}
                          onChange={handleChange}
                          placeholder="Bitiş"
                          size="sm"
                          style={{fontSize: '0.8rem'}}
                        />
                      </div>
                    </Col>
                    
                    <Col md={vertical ? 12 : 6} xs={12} className={vertical ? "mt-2" : ""}>
                       <Form.Label className="fw-bold text-secondary d-none d-md-block" style={{fontSize: '0.75rem'}}>Hızlı Filtreler</Form.Label>
                       <div className="d-flex flex-wrap gap-1">
                          <Button variant="outline-secondary" size="sm" onClick={() => onQuickFilter('today')} style={{fontSize: '0.7rem', padding: '0.1rem 0.3rem'}}>Bugün</Button>
                          <Button variant="outline-secondary" size="sm" onClick={() => onQuickFilter('yesterday')} style={{fontSize: '0.7rem', padding: '0.1rem 0.3rem'}}>Dün</Button>
                          <Button variant="outline-secondary" size="sm" onClick={() => onQuickFilter('week')} style={{fontSize: '0.7rem', padding: '0.1rem 0.3rem'}}>1 Hafta</Button>
                          <Button variant="outline-secondary" size="sm" onClick={() => onQuickFilter('month')} style={{fontSize: '0.7rem', padding: '0.1rem 0.3rem'}}>1 Ay</Button>
                       </div>
                    </Col>

                    <Col md={vertical ? 12 : 12} lg={vertical ? 12 : 4} xs={12} className={`mt-2 ${vertical ? '' : 'mt-lg-0'}`}>
                         <Form.Label className="fw-bold text-secondary" style={{fontSize: '0.75rem'}}>Sıralama</Form.Label>
                         <div className="d-flex gap-1">
                             <Form.Select 
                                value={sortConfig?.key || ''} 
                                onChange={(e) => onSortChange(e.target.value, sortConfig?.direction)}
                                size="sm"
                                style={{fontSize: '0.8rem'}}
                             >
                                 <option value="startDate">Oluşturulma Tarihi</option>
                                 <option value="zpm1027">Planlanan Tarih</option>
                                 <option value="sapId">İş Emri No</option>
                                 <option value="remainingTime">Kalan Süre</option>
                                 <option value="mnWkCtr">İş Merkezi</option>
                             </Form.Select>
                             <Button 
                                variant="outline-secondary" 
                                size="sm"
                                onClick={() => onSortChange(sortConfig?.key, sortConfig?.direction === 'asc' ? 'desc' : 'asc')}
                                title={sortConfig?.direction === 'asc' ? 'Artan' : 'Azalan'}
                             >
                                 {sortConfig?.direction === 'asc' ? '⬆️' : '⬇️'}
                             </Button>
                         </div>
                    </Col>
                  </Row>

                  <hr className="my-2 text-muted" />
                  
                  <Row className="g-2">
                    {renderSelect('ZivWerks', 'Şirket Kodu', options?.ZivWerks)}
                    {renderSelect('orderType', 'Tür', options?.orderType)}
                    {renderSelect('operationShortText', 'İş Emri', options?.operationShortText)}
                    {renderSelect('uStatus', 'Durum', options?.uStatus)}
                    {renderSelect('adrCity1', 'İlçe', options?.adrCity1)}
                    {renderSelect('adrCity2', 'Mahalle', options?.adrCity2)}
                    {renderSelect('street', 'Sokak', options?.street)}
                    {renderSelect('plangroupt', 'Planlama Grubu', options?.plangroupt)}
                    {renderSelect('mnWkCtr', 'Ana İş Merkezi', options?.mnWkCtr)}
                  </Row>

                  <div className={`mt-auto pt-2 ${vertical ? '' : 'mt-2'}`}>
                    <Row>
                        <Col className={vertical ? 'mb-2' : ''}>
                             <div className="d-flex flex-wrap gap-1 align-items-center">
                                {Object.entries(filters).some(([k, v]) => Array.isArray(v) ? v.length > 0 : v) && (
                                     <span className="text-muted small fw-bold" style={{fontSize: '0.7rem'}}>Aktif:</span>
                                )}
                                {Object.entries(filters).map(([key, value]) => {
                                    if (Array.isArray(value) && value.length > 0) {
                                        return (
                                            <Badge key={key} bg="info" className="text-dark fw-normal" style={{fontSize: '0.65rem'}}>
                                                {key}: {value.length}
                                            </Badge>
                                        );
                                    }
                                    return null;
                                })}
                             </div>
                        </Col>
                        <Col className="d-flex justify-content-end">
                            <Button variant="danger" size="sm" onClick={onClearFilters} className="w-100" style={{fontSize: '0.75rem'}}>
                                Temizle
                            </Button>
                        </Col>
                    </Row>
                  </div>
                </div>
            </div>
        </Collapse>
    </div>
  );
};

export default FilterBar;
