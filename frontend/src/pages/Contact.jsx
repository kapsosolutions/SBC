import Nav from '../components/Nav.jsx';

export default function Contact() {
  const phone = '+91 90000 00000';
  return (
    <>
      <Nav />
      <div className="container section">
        <div className="grid grid-2">
          <div className="lime-block">
            <h1 className="heading">Contact us</h1>
            <p className="body mt-16">We’re here to help with your Student Benefit Card.</p>
          </div>
          <div className="card">
            <h2 className="subheading">Get in touch</h2>
            <div className="stack mt-16">
              <a className="btn btn-primary btn-block" href={`tel:${phone.replace(/\s/g, '')}`}>
                Call {phone}
              </a>
              <a className="btn btn-block" href="https://wa.me/919000000000" target="_blank" rel="noreferrer">
                Chat on WhatsApp
              </a>
              <a className="btn btn-block" href="mailto:support@sbc.com">Email support@sbc.com</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
