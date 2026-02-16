import React from 'react';

export const columnStyles = {
    orderNo: { flex: '0 0 8%', maxWidth: '8%' },
    type: { flex: '0 0 8%', maxWidth: '8%' },
    desc: { flex: '0 0 15%', maxWidth: '15%' },
    wkCtr: { flex: '0 0 7%', maxWidth: '7%' },
    grp: { flex: '0 0 7%', maxWidth: '7%' },
    start: { flex: '0 0 8%', maxWidth: '8%' },
    plan: { flex: '0 0 8%', maxWidth: '8%' },
    addr: { flex: '0 0 15%', maxWidth: '15%' },
    fac: { flex: '0 0 8%', maxWidth: '8%' },
    status: { flex: '0 0 8%', maxWidth: '8%' },
    action: { flex: '0 0 8%', maxWidth: '8%' },
};

const WorkListHeader = () => {
    return (
        <div className="d-none d-md-flex align-items-center border-bottom border-2 py-2 px-3 fw-bold text-muted small" 
             style={{
                 position: 'sticky', 
                 top: '75px', 
                 zIndex: 1040,
                 backgroundColor: 'white',
                 opacity: 1,
                 marginBottom: '0',
                 boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
             }}>
            <div style={columnStyles.orderNo}>İş Emri No</div>
            <div style={columnStyles.type}>Tür</div>
            <div style={columnStyles.desc}>Açıklama</div>
            <div style={columnStyles.wkCtr}>Ana İş Merkezi</div>
            <div style={columnStyles.grp}>Plan. Grp</div>
            <div style={columnStyles.start}>Başlangıç</div>
            <div style={columnStyles.plan}>Planlanan</div>
            <div style={columnStyles.addr}>Adres</div>
            <div style={columnStyles.fac}>Tesisat/Bina</div>
            <div style={columnStyles.status}>Durum</div>
            <div style={columnStyles.action}>İşlem</div>
        </div>
    );
};

export default WorkListHeader;
