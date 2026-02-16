import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const Dashboard = ({ works }) => {
  const [filter, setFilter] = useState({ type: null, value: null }); // { type: 'district' | 'workType' | 'status', value: string }


  // Filter works based on selection
  const filteredWorks = useMemo(() => {
    if (!filter.type) return works;
    return works.filter(work => {
      if (filter.type === 'district') return work.adrCity1 === filter.value;
      if (filter.type === 'workType') return (work.orderTypeTxt || work.orderType) === filter.value;
      if (filter.type === 'status') {
         const now = new Date();
         const targetDate = new Date(`${work.zpm1027}T${work.zpm1028 || '00:00:00'}`);
         const isOverdue = targetDate < now;
         if (filter.value === 'Gecikmiş') return isOverdue;
         if (filter.value === 'Zamanında') return !isOverdue;
      }
      return true;
    });
  }, [works, filter]);

  // Aggregate Data
  const districtData = useMemo(() => {
    const counts = {};
    filteredWorks.forEach(work => {
      const district = work.adrCity1 || 'Bilinmiyor';
      counts[district] = (counts[district] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filteredWorks]);

  const typeData = useMemo(() => {
    const counts = {};
    filteredWorks.forEach(work => {
      const type = work.orderTypeTxt || work.orderType || 'Bilinmiyor';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredWorks]);

  const statusData = useMemo(() => {
    let overdue = 0;
    let onTime = 0;
    const now = new Date();
    filteredWorks.forEach(work => {
       if (!work.zpm1027 || work.zpm1027 === '0000-00-00') return;
       const targetDate = new Date(`${work.zpm1027}T${work.zpm1028 || '00:00:00'}`);
       if (targetDate < now) overdue++;
       else onTime++;
    });
    return [
      { name: 'Gecikmiş', value: overdue, color: '#ef4444' },
      { name: 'Zamanında', value: onTime, color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [filteredWorks]);

  const handleFilter = (type, value) => {
    if (filter.type === type && filter.value === value) {
      setFilter({ type: null, value: null }); // Toggle off
    } else {
      setFilter({ type, value });
    }
  };

  if (!works || !Array.isArray(works)) {
      return (
        <Container className="p-5 text-center">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </Container>
      );
  }

  return (
    <Container fluid className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h2 className="fw-bold text-primary mb-1">Raporlama Paneli</h2>
            <p className="text-secondary mb-0">İş emirleri analizi ve grafikleri.</p>
        </div>
        {filter.type && (
            <Button variant="outline-danger" onClick={() => setFilter({ type: null, value: null })}>
                Filtreyi Temizle: {filter.value}
            </Button>
        )}
      </div>

      {/* Stats Cards */}
      <Row className="g-3 mb-4">
        <Col md={3}>
            <Card className="shadow-sm border-0 text-center py-3">
                <h6 className="text-muted text-uppercase small fw-bold">Liste Toplamı</h6>
                <h2 className="fw-bold text-dark m-0">{works.length}</h2>
            </Card>
        </Col>
        <Col md={3}>
            <Card className="shadow-sm border-0 text-center py-3">
                <h6 className="text-muted text-uppercase small fw-bold">Görüntülenen</h6>
                <h2 className="fw-bold text-primary m-0">{filteredWorks.length}</h2>
            </Card>
        </Col>
      </Row>

      <Row className="g-4">
        {/* District Bar Chart */}
        <Col lg={8}>
            <Card className="shadow-sm border-0 h-100">
                <Card.Header className="bg-white fw-bold">İlçelere Göre Dağılım</Card.Header>
                <Card.Body className="p-2">
                    <div style={{ width: '100%', height: 400 }}>
                        {districtData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={districtData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 12}} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" name="Adet" fill="#3b82f6" cursor="pointer" onClick={(data) => handleFilter('district', data.name)} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted">Veri yok</div>
                        )}
                    </div>
                </Card.Body>
            </Card>
        </Col>

        {/* Status Donut Chart */}
        <Col lg={4}>
            <Card className="shadow-sm border-0 h-100">
                <Card.Header className="bg-white fw-bold">Zamanlama Durumu</Card.Header>
                <Card.Body className="p-2">
                    <div style={{ width: '100%', height: 400 }}>
                        {statusData.length > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        cursor="pointer"
                                        onClick={(data) => handleFilter('status', data.name)}
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted">Veri yok</div>
                        )}
                    </div>
                </Card.Body>
            </Card>
        </Col>

        {/* Work Type Pie Chart */}
        <Col lg={12}>
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white fw-bold">İş Türüne Göre Dağılım</Card.Header>
                <Card.Body className="p-2">
                    <div style={{ width: '100%', height: 400 }}>
                         {typeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={typeData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                        cursor="pointer"
                                        onClick={(data) => handleFilter('workType', data.name)}
                                    >
                                        {typeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                         ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted">Veri yok</div>
                         )}
                    </div>
                </Card.Body>
            </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
