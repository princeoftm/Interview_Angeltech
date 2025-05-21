import { Link } from "react-router-dom";
import { Navbar, Nav, Button } from 'react-bootstrap';

const Navigation = ({ web3Handler, account }) => {
    return (
        <Navbar fixed="top" expand="lg" bg="light" variant="light" className="shadow-sm py-3"> {/* Light background and variant */}
            
            <Navbar.Brand as={Link} to="/" className="fw-bold text-dark fs-4 px-3"> {/* Dark text for brand */}
                <span role="img" aria-label="shopping cart">💎</span> DigitalMarket
            </Navbar.Brand>

            <Navbar.Toggle aria-controls="responsive-navbar-nav" className="me-3" />
            <Navbar.Collapse id="responsive-navbar-nav" className="px-3">
                <Nav className="me-auto">
                    <Nav.Link as={Link} to="/" className="text-dark nav-link-underline">🏠 Home</Nav.Link> {/* Custom class for underline */}
                    <Nav.Link as={Link} to="/create" className="text-dark nav-link-underline">➕ Create</Nav.Link>
                    <Nav.Link as={Link} to="/my-listed-items" className="text-dark nav-link-underline">📋 My Listings</Nav.Link>
                    <Nav.Link as={Link} to="/my-purchases" className="text-dark nav-link-underline">🛍️ Purchases</Nav.Link>
                </Nav>
                <Nav>
{account ? (
  <Button variant="outline-primary" className="wallet-button">
    💼 {account.slice(0, 5) + '...' + account.slice(38, 42)}
  </Button>
) : (
  <Button onClick={web3Handler} variant="primary" className="wallet-button">
    💼 Connect Wallet
  </Button>
)}

                </Nav>
            </Navbar.Collapse>
        </Navbar>
    );
};

export default Navigation;