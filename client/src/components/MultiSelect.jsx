import React, { useState, useMemo } from 'react';
import { Dropdown, Form, Button, Badge, InputGroup } from 'react-bootstrap';

const MultiSelect = ({ label, options, selected, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option => 
      option.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleToggleOption = (option) => {
    let newSelected;
    if (selected.includes(option)) {
      newSelected = selected.filter(item => item !== option);
    } else {
      newSelected = [...selected, option];
    }
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    // Select all currently filtered options
    const newSelected = [...new Set([...selected, ...filteredOptions])];
    onChange(newSelected);
  };

  const handleClear = () => {
      // Clear only currently filtered options from selection if search is active, 
      // or clear all if no search? Usually "Clear" in dropdown means clear all.
      // Let's stick to clearing ALL for now as it's safer.
      onChange([]);
  };

  return (
    <Dropdown autoClose="outside" className="w-100">
      <Dropdown.Toggle variant="outline-secondary" className="w-100 d-flex justify-content-between align-items-center bg-white text-dark border-secondary-subtle" style={{fontSize: '0.8rem', padding: '0.3rem 0.5rem'}}>
        <span className="text-truncate fw-medium">
           {label}
        </span>
        {selected.length > 0 && (
            <Badge bg="primary" pill className="ms-1" style={{fontSize: '0.65rem'}}>
                {selected.length}
            </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="shadow-lg border-0 rounded-3 p-0 overflow-hidden" style={{ maxHeight: '400px', minWidth: '100%', width: '300px' }}>
        <div className="p-2 border-bottom bg-light">
            <Form.Control
                size="sm"
                autoFocus
                placeholder={`${label} ara...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
            />
            <div className="d-flex gap-2">
                <Button size="sm" variant="outline-primary" onClick={handleSelectAll} className="flex-grow-1" style={{fontSize: '0.75rem'}}>
                    Tümünü Seç
                </Button>
                <Button size="sm" variant="outline-danger" onClick={handleClear} className="flex-grow-1" style={{fontSize: '0.75rem'}}>
                    Temizle
                </Button>
            </div>
        </div>
        
        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {filteredOptions.length === 0 ? (
                <Dropdown.Item disabled className="text-center text-muted small py-3">
                    {options.length === 0 ? 'Seçenek Yok' : 'Sonuç Bulunamadı'}
                </Dropdown.Item>
            ) : (
                filteredOptions.map((option, index) => (
                    <div key={index} className="form-check px-3 py-2 hover-bg-light transition-all cursor-pointer" onClick={() => handleToggleOption(option)}>
                        <Form.Check
                            type="checkbox"
                            id={`check-${label}-${index}`}
                            label={option}
                            checked={selected.includes(option)}
                            onChange={() => {}} // Handled by parent div for larger click area
                            style={{ pointerEvents: 'none' }} // Pass click through to parent div
                            className="text-break"
                        />
                    </div>
                ))
            )}
        </div>
        
        <div className="p-2 border-top bg-light text-center small text-muted">
            {selected.length} seçildi
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default MultiSelect;
