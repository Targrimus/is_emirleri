import React from 'react';
import { Container } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className="bg-white border-top py-4 mt-auto">
      <Container className="d-flex flex-column flex-md-row justify-content-between align-items-center text-muted small gap-2">
        <div>
          &copy; {new Date().getFullYear()} WorkFlow System. All rights reserved.
        </div>
        <div className="d-flex align-items-center">
          <span className="d-inline-block rounded-circle bg-success me-2" style={{ width: '8px', height: '8px' }}></span>
          System Online
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
