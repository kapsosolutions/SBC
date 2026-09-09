import { useSearchParams } from 'react-router-dom';
import Nav from '../components/Nav.jsx';

// Landing page shown when a partner scans a student's card QR.
export default function Verify() {
  const [params] = useSearchParams();
  const id = params.get('id') || '';

  return (
    <>
      <Nav />
      <div className="container section">
        <div className="lime-block center">
          <h1 className="heading">Card verification</h1>
          <p className="body mt-16">Card ID</p>
          <div className="display mt-8" style={{ fontSize: 40 }}>{id || 'Unknown'}</div>
          <p className="body mt-16">
            This is a Student Benefit Card. Ask the student to open “Use Card” on WhatsApp to redeem
            an offer at your store.
          </p>
        </div>
      </div>
    </>
  );
}
