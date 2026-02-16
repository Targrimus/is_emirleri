import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const auth = btoa(`${username}:${password}`);
    const headers = { Authorization: `Basic ${auth}` };

    try {
      // Try to fetch works (limit 1) to verify credentials
      // We don't have a specific login endpoint, so we test access to a protected route
      await axios.get('/api/works/verify', { headers });
      onLogin(username, password);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        setError('Hatalı kullanıcı adı veya şifre.');
      } else {
        setError('Giriş başarısız. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <Card className="shadow p-4" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="text-center mb-4">
            <span style={{ fontSize: '3rem' }}>⚡</span>
            <h3 className="mt-2 text-primary fw-bold">WorkFlow Giriş</h3>
        </div>
        
        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formBasicEmail">
            <Form.Label>Kullanıcı Adı</Form.Label>
            <Form.Control 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formBasicPassword">
            <Form.Label>Şifre</Form.Label>
            <Form.Control 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Button variant="primary" type="submit" className="w-100 py-2" disabled={loading}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default Login;
