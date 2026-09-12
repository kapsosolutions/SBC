export default function Spinner() {
  return <div className="spinner" />;
}

// Centered loader with optional label — use while fetching data.
export function Loader({ label }) {
  return (
    <div className="loader">
      <div className="spinner" />
      {label && <p className="muted mt-16">{label}</p>}
    </div>
  );
}
