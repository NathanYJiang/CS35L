/**
 * LoadingSpinner — reusable loading indicator.
 *
 * Previously the spinner markup was copy-pasted inline wherever a loading
 * state was needed (GroupDetails, App, …).  Extracting it into a single
 * component is the React equivalent of writing a C helper function once and
 * #including it wherever needed.
 *
 * Props:
 *   message  {string}  Optional text shown below the spinner.
 *                      Defaults to "Loading…"
 */

const spinnerStyle = {
  width: 32,
  height: 32,
  border: '3px solid var(--border-color)',
  borderTopColor: 'var(--secondary-color)',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  margin: '0 auto',
};

const wrapStyle = {
  textAlign: 'center',
  paddingTop: '3rem',
};

const msgStyle = {
  color: 'var(--light-text)',
  marginTop: '1rem',
};

const LoadingSpinner = ({ message = 'Loading…' }) => (
  <div className="page-container" style={wrapStyle}>
    <div style={spinnerStyle} />
    <p style={msgStyle}>{message}</p>
  </div>
);

export default LoadingSpinner;
